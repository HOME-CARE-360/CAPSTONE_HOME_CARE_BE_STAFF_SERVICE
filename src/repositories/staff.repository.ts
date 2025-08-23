import {
  PrismaClient,
  Prisma,
  BookingStatus,
  InspectionStatus,
  RequestStatus,
  ProposalStatus,
} from "../generated/prisma";
import { AppError } from "../handlers/error";

const prisma = new PrismaClient();

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_UPDATE_HOURS = 24;
const MAX_CHECKOUT_HOURS = 24;
const MAX_DATE_DIFF_DAYS = 1;

const USER_SELECT = { name: true, phone: true } as const;
const STAFF_USER_SELECT = { name: true, avatar: true } as const;
const CATEGORY_SELECT = { id: true, name: true } as const;
const SERVICE_SELECT = { name: true } as const;

const CUSTOMER_PROFILE_INCLUDE = {
  User: { select: USER_SELECT },
} as const;

const SERVICE_REQUEST_SELECT = {
  id: true,
  preferredDate: true,
  note: true,
  location: true,
  phoneNumber: true,
  status: true,
  Category: { select: CATEGORY_SELECT },
} as const;

const BOOKING_INCLUDE = {
  CustomerProfile: { include: CUSTOMER_PROFILE_INCLUDE },
  ServiceRequest: { select: SERVICE_REQUEST_SELECT },
} as const;

const calculatePagination = (page?: number, limit?: number) => {
  const normalizedPage = page ?? DEFAULT_PAGE;
  const normalizedLimit = limit ?? DEFAULT_LIMIT;
  const skip = (normalizedPage - 1) * normalizedLimit;

  return { page: normalizedPage, limit: normalizedLimit, skip };
};

const buildDateFilter = (fromDate?: string, toDate?: string) => {
  if (!fromDate && !toDate) return {};

  return {
    createdAt: {
      ...(fromDate && { gte: new Date(fromDate) }),
      ...(toDate && { lte: new Date(toDate) }),
    },
  };
};

const buildKeywordFilter = (keyword?: string) => {
  if (!keyword) return {};

  return {
    CustomerProfile: {
      OR: [
        { address: { contains: keyword, mode: "insensitive" as const } },
        {
          User: {
            OR: [
              { name: { contains: keyword, mode: "insensitive" as const } },
              { phone: { contains: keyword, mode: "insensitive" as const } },
            ],
          },
        },
      ],
    },
  };
};

const mapBookingResponse = (booking: any) => ({
  id: booking.id,
  status: booking.status,
  createdAt: booking.createdAt,
  serviceRequestId: booking.serviceRequestId ?? null,
  customer: {
    name: booking.CustomerProfile?.User?.name ?? null,
    phone: booking.CustomerProfile?.User?.phone ?? null,
    address: booking.CustomerProfile?.address ?? null,
  },
  serviceRequest: booking.ServiceRequest
    ? {
        id: booking.ServiceRequest.id,
        preferredDate: booking.ServiceRequest.preferredDate,
        note: booking.ServiceRequest.note,
        location: booking.ServiceRequest.location,
        phoneNumber: booking.ServiceRequest.phoneNumber,
        status: booking.ServiceRequest.status,
        categoryId: booking.ServiceRequest.Category?.id ?? null,
        categoryName: booking.ServiceRequest.Category?.name ?? null,
      }
    : null,
});

const calculateHoursDifference = (startDate: Date, endDate: Date): number => {
  return (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
};

const calculateDaysDifference = (date1: Date, date2: Date): number => {
  return Math.abs(
    Math.floor((date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24)),
  );
};


export const StaffRepository = {
  async getBookingsList(
    staffId: number,
    status?: BookingStatus,
    options?: {
      page?: number;
      limit?: number;
      fromDate?: string;
      toDate?: string;
      keyword?: string;
    },
  ) {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.BookingWhereInput = {
      staffId,
      ...(status ? { status } : {}),
      ...(options?.fromDate || options?.toDate
        ? {
            createdAt: {
              ...(options.fromDate ? { gte: new Date(options.fromDate) } : {}),
              ...(options.toDate ? { lte: new Date(options.toDate) } : {}),
            },
          }
        : {}),
      ...(options?.keyword
        ? {
            OR: [
              {
                CustomerProfile: {
                  OR: [
                    {
                      address: {
                        contains: options.keyword,
                        mode: "insensitive",
                      },
                    },
                    {
                      User: {
                        OR: [
                          {
                            name: {
                              contains: options.keyword,
                              mode: "insensitive",
                            },
                          },
                          {
                            phone: {
                              contains: options.keyword,
                              mode: "insensitive",
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
              {
                ServiceRequest: {
                  OR: [
                    {
                      note: { contains: options.keyword, mode: "insensitive" },
                    },
                    {
                      phoneNumber: {
                        contains: options.keyword,
                        mode: "insensitive",
                      },
                    },
                    {
                      location: {
                        contains: options.keyword,
                        mode: "insensitive",
                      },
                    },
                    {
                      Category: {
                        name: {
                          contains: options.keyword,
                          mode: "insensitive",
                        },
                      },
                    },
                  ],
                },
              },
            ],
          }
        : {}),
    };

    const [total, bookings] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          CustomerProfile: {
            include: {
              User: { select: { name: true, phone: true } },
            },
          },
          ServiceRequest: {
            select: {
              id: true,
              preferredDate: true,
              note: true,
              location: true,
              phoneNumber: true,
              status: true,
              Category: { select: { id: true, name: true } },
            },
          },
        },
      }),
    ]);

    return {
      bookings: bookings.map((b) => ({
        id: b.id,
        status: b.status,
        createdAt: b.createdAt,
        serviceRequestId: b.serviceRequestId ?? null,
        customer: {
          name: b.CustomerProfile?.User?.name ?? null,
          phone: b.CustomerProfile?.User?.phone ?? null,
          address: b.CustomerProfile?.address ?? null,
        },
        serviceRequest: b.ServiceRequest
          ? {
              id: b.ServiceRequest.id,
              preferredDate: b.ServiceRequest.preferredDate,
              note: b.ServiceRequest.note,
              location: b.ServiceRequest.location,
              phoneNumber: b.ServiceRequest.phoneNumber,
              status: b.ServiceRequest.status,
              categoryId: b.ServiceRequest.Category?.id ?? null,
              categoryName: b.ServiceRequest.Category?.name ?? null,
            }
          : null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async getBookingDetail(bookingId: number, staffId: number) {
    try {
      const booking = await prisma.booking.findFirstOrThrow({
        where: { id: bookingId, staffId },
        include: BOOKING_INCLUDE,
      });

      return {
        id: booking.id,
        status: booking.status,
        createdAt: booking.createdAt,
        customer: {
          id: booking.CustomerProfile?.id,
          name: booking.CustomerProfile?.User?.name,
          phone: booking.CustomerProfile?.User?.phone,
          address: booking.CustomerProfile?.address,
        },
        serviceRequest: booking.ServiceRequest
          ? {
              id: booking.ServiceRequest.id,
              preferredDate: booking.ServiceRequest.preferredDate,
              note: booking.ServiceRequest.note,
              location: booking.ServiceRequest.location,
              phoneNumber: booking.ServiceRequest.phoneNumber,
              status: booking.ServiceRequest.status,
              category: booking.ServiceRequest.Category
                ? {
                    id: booking.ServiceRequest.Category.id,
                    name: booking.ServiceRequest.Category.name,
                  }
                : undefined,
            }
          : undefined,
      };
    } catch (error) {
      throw new AppError(
        "Failed to get booking detail",
        [
          {
            message: "Repo.GetBookingDetailError",
            path: ["bookingId", "staffId"],
          },
        ],
        { bookingId, staffId, error },
        500,
      );
    }
  },

async createInspectionReport(data: any, assetIds?: number[]) {
  try {
    return await prisma.$transaction(async (tx) => {
      // Extract bookingId from the Prisma connect format
      const bookingId = data.Booking?.connect?.id;
      
      if (!bookingId) {
        throw new AppError(
          "Booking connection is missing or invalid in inspection report data",
          [{ message: "Error.CreateInspectionReportBookingConnectError", path: ["Booking.connect.id"] }],
          { data },
          400,
        );
      }

      // 1) Chặn trùng report theo bookingId (unique trong schema)
      const existingReport = await tx.inspectionReport.findUnique({
        where: { bookingId },
      });
      if (existingReport) {
        throw new AppError(
          "Inspection report already exists for this booking",
          [{ message: "Error.InspectionReportExists", path: ["bookingId"] }],
          { bookingId },
          400,
        );
      }

      // 2) Lấy booking + serviceRequest + customer
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: {
          ServiceRequest: { select: { id: true } },
          CustomerProfile: { select: { id: true } },
        },
      });

      if (!booking) {
        throw new AppError(
          "Booking not found",
          [{ message: "Error.BookingNotFound", path: ["bookingId"] }],
          { bookingId },
          404,
        );
      }

      if (!booking.ServiceRequest?.id) {
        throw new AppError(
          "Missing ServiceRequest ID for this booking",
          [{ message: "Error.MissingServiceRequestId", path: ["bookingId"] }],
          { bookingId },
          500,
        );
      }

      // 3) Nếu truyền assetIds: kiểm tra quyền sở hữu
      if (assetIds && assetIds.length > 0) {
        // Only validate CustomerProfile when assets are provided
        if (!booking.CustomerProfile?.id) {
          throw new AppError(
            "Missing Customer Profile for this booking",
            [{ message: "Error.MissingCustomerProfile", path: ["bookingId"] }],
            { bookingId },
            500,
          );
        }

        const customerId = booking.CustomerProfile.id;
        const assets = await tx.customerAsset.findMany({
          where: { id: { in: assetIds } },
          select: { id: true, CustomerProfile: { select: { id: true } } },
        });

        // Thiếu asset
        const foundIds = new Set(assets.map((a) => a.id));
        const notFound = assetIds.filter((id) => !foundIds.has(id));
        if (notFound.length > 0) {
          throw new AppError(
            "Some assets were not found",
            [{ message: "Error.AssetNotFound", path: ["assetIds"] }],
            { notFound, assetIds },
            400,
          );
        }

        // Asset không thuộc customer hoặc CustomerProfile is null
        const invalid = assets.filter(
          (a) => !a.CustomerProfile?.id || a.CustomerProfile.id !== customerId,
        );
        if (invalid.length > 0) {
          throw new AppError(
            "Some assets do not belong to the booking's customer",
            [{ message: "Error.AssetOwnershipInvalid", path: ["assetIds"] }],
            {
              invalid: invalid.map((x) => x.id),
              bookingCustomerId: customerId,
            },
            400,
          );
        }
      }

      // 4) Tạo report + cập nhật trạng thái ServiceRequest trong cùng transaction
      const [report] = await Promise.all([
        tx.inspectionReport.create({
          data: {
            ...data, // This now contains properly formatted Prisma relations
            ...(assetIds && assetIds.length > 0
              ? {
                  CustomerAsset: {
                    connect: assetIds.map((id) => ({ id })),
                  },
                }
              : {}),
          },
        }),
        tx.serviceRequest.update({
          where: { id: booking.ServiceRequest.id },
          data: { status: RequestStatus.ESTIMATED },
        }),
      ]);

      return report;
    });
  } catch (error) {
    console.error(error);
    if (error instanceof AppError) throw error;

    throw new AppError(
      "Failed to create inspection report",
      [{ message: "Error.CreateInspectionReportError", path: ["bookingId"] }],
      { data, error },
      500,
    );
  }
},
  async countBookings(
    staffId: number,
    status?: BookingStatus,
  ): Promise<number> {
    const where: Prisma.BookingWhereInput = {
      staffId,
      ...(status && { status }),
    };

    return prisma.booking.count({ where });
  },

  async getInspectionReportById(inspectionId: number) {
    try {
      const report = await prisma.inspectionReport.findUnique({
        where: { id: inspectionId },
        include: {
          Staff: {
            include: { User: { select: STAFF_USER_SELECT } },
          },
          Booking: {
            include: {
              CustomerProfile: { include: CUSTOMER_PROFILE_INCLUDE },
              ServiceRequest: {
                select: {
                  preferredDate: true,
                  location: true,
                  phoneNumber: true,
                  Category: { select: { name: true } },
                },
              },
            },
          },
        },
      });

      if (!report) return null;

      return {
        id: report.id,
        bookingId: report.bookingId,
        staffId: report.staffId,
        estimatedTime: report.estimatedTime,
        note: report.note,
        images: report.images,
        createdAt: report.createdAt,
        staff: {
          id: report.Staff.id,
          name: report.Staff.User?.name,
          avatar: report.Staff.User?.avatar,
        },
        booking: {
          id: report.Booking.id,
          status: report.Booking.status,
          createdAt: report.Booking.createdAt,
          customer: {
            name: report.Booking.CustomerProfile?.User?.name,
            phone: report.Booking.CustomerProfile?.User?.phone,
            address: report.Booking.CustomerProfile?.address ?? null,
          },
          serviceRequest: report.Booking.ServiceRequest
            ? {
                preferredDate: report.Booking.ServiceRequest.preferredDate,
                location: report.Booking.ServiceRequest.location,
                phoneNumber: report.Booking.ServiceRequest.phoneNumber,
                categoryName:
                  report.Booking.ServiceRequest.Category?.name ?? null,
              }
            : undefined,
        },
      };
    } catch (error) {
      throw new AppError(
        "Failed to get inspection report by id",
        [{ message: "Error.GetInspectionReportByIdError", path: ["id"] }],
        { inspectionId, error },
        500,
      );
    }
  },

  async getInspectionReportsByStaff(
    staffId: number,
    options?: { page?: number; limit?: number },
  ) {
    try {
      const { page, limit, skip } = calculatePagination(
        options?.page,
        options?.limit,
      );

      const [total, reports] = await Promise.all([
        prisma.inspectionReport.count({ where: { staffId } }),
        prisma.inspectionReport.findMany({
          where: { staffId },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
          include: {
            Booking: {
              select: {
                id: true,
                status: true,
                createdAt: true,
                CustomerProfile: { include: CUSTOMER_PROFILE_INCLUDE },
                ServiceRequest: {
                  select: {
                    preferredDate: true,
                    location: true,
                    phoneNumber: true,
                    Category: { select: { name: true } },
                  },
                },
              },
            },
          },
        }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        inspectionReports: reports.map((report) => ({
          id: report.id,
          createdAt: report.createdAt,
          estimatedTime: report.estimatedTime ?? null,
          note: report.note ?? "",
          images: report.images ?? [],
          booking: {
            id: report.Booking.id,
            status: report.Booking.status,
            createdAt: report.Booking.createdAt,
            customer: {
              name: report.Booking.CustomerProfile?.User?.name,
              phone: report.Booking.CustomerProfile?.User?.phone,
            },
            serviceRequest: report.Booking.ServiceRequest
              ? {
                  preferredDate: report.Booking.ServiceRequest.preferredDate,
                  location: report.Booking.ServiceRequest.location,
                  phoneNumber: report.Booking.ServiceRequest.phoneNumber,
                  categoryName: report.Booking.ServiceRequest.Category?.name,
                }
              : undefined,
          },
        })),
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      throw new AppError(
        "Failed to fetch inspection reports for staff",
        [
          {
            message: "Error.GetInspectionReportsByStaffError",
            path: ["staffId"],
          },
        ],
        { staffId, error },
        500,
      );
    }
  },

  async updateInspectionReport(
    id: number,
    data: Partial<
      Pick<
        Prisma.InspectionReportUpdateInput,
        "note" | "images" | "estimatedTime"
      >
    >,
  ) {
    try {
      const report = await prisma.inspectionReport.findUnique({
        where: { id },
        select: { id: true, createdAt: true },
      });

      if (!report) {
        throw new AppError(
          "Inspection report not found",
          [{ message: "NotFound", path: ["id"] }],
          { id },
          404,
        );
      }

      const hoursPassed = calculateHoursDifference(
        new Date(report.createdAt),
        new Date(),
      );

      if (hoursPassed > MAX_UPDATE_HOURS) {
        throw new AppError(
          `Inspection report can no longer be updated after ${MAX_UPDATE_HOURS} hours`,
          [{ message: "Error.ReportUpdateTooLate", path: ["id"] }],
          { id, hoursPassed },
          400,
        );
      }

      return await prisma.inspectionReport.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (error instanceof AppError) throw error;

      throw new AppError(
        "Failed to update inspection report",
        [{ message: "Error.UpdateInspectionReportError", path: ["id"] }],
        { id, data, error },
        500,
      );
    }
  },

  async getRecentWorkLogs(
    staffId: number,
    options?: { page?: number; limit?: number },
  ) {
    try {
      const { page, limit, skip } = calculatePagination(
        options?.page,
        options?.limit,
      );

      const [total, logs] = await Promise.all([
        prisma.workLog.count({ where: { staffId } }),
        prisma.workLog.findMany({
          where: { staffId },
          orderBy: { checkIn: "desc" },
          skip,
          take: limit,
          select: {
            id: true,
            checkIn: true,
            checkOut: true,
            note: true,
            createdAt: true,
            Booking: {
              select: {
                id: true,
                status: true,
                createdAt: true,
              },
            },
          },
        }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        workLogs: logs.map((log) => ({
          id: log.id,
          checkIn: log.checkIn,
          checkOut: log.checkOut,
          note: log.note,
          createdAt: log.createdAt,
          booking: log.Booking
            ? {
                id: log.Booking.id,
                status: log.Booking.status,
                createdAt: log.Booking.createdAt,
              }
            : undefined,
        })),
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      throw new AppError(
        "Failed to fetch recent work logs",
        [{ message: "Error.GetRecentWorkLogsError", path: ["staffId"] }],
        { staffId, error },
        500,
      );
    }
  },

  async createWorkLogWithStatusUpdate(
    staffId: number,
    bookingId: number,
    imageUrls: string[] = [],
  ) {
    try {
      return await prisma.$transaction(async (tx) => {
        const booking = await tx.booking.findUnique({
          where: { id: bookingId },
          include: {
            ServiceRequest: {
              select: { id: true, preferredDate: true, status: true },
            },
          },
        });

        if (!booking) {
          throw new AppError(
            "Booking not found",
            [{ message: "Error.BookingNotFound", path: ["bookingId"] }],
            { bookingId },
            404,
          );
        }

        const serviceRequest = booking.ServiceRequest;

        if (
          serviceRequest?.status &&
          [RequestStatus.ESTIMATED, RequestStatus.CANCELLED].includes(
            serviceRequest.status as "CANCELLED" | "ESTIMATED",
          )
        ) {
          throw new AppError(
            "Cannot check in to a completed or canceled booking",
            [
              {
                message: "Error.InvalidBookingStatusForCheckIn",
                path: ["bookingId"],
              },
            ],
            { bookingId, status: serviceRequest.status },
            400,
          );
        }

        const existingLog = await tx.workLog.findFirst({
          where: { bookingId, staffId },
          select: { id: true },
        });

        if (existingLog) {
          throw new AppError(
            "Staff already checked in for this booking",
            [{ message: "Error.AlreadyCheckedIn", path: ["bookingId"] }],
            { bookingId, staffId },
            400,
          );
        }

        const now = new Date();
        const preferredDate = serviceRequest?.preferredDate;

        if (preferredDate) {
          const daysDiff = calculateDaysDifference(
            now,
            new Date(preferredDate),
          );
          if (daysDiff > MAX_DATE_DIFF_DAYS) {
            throw new AppError(
              "Cannot check in far from preferred date",
              [
                {
                  message: "Error.DateMismatchPreferredDate",
                  path: ["bookingId"],
                },
              ],
              { bookingId, preferredDate, today: now },
              400,
            );
          }
        }

        if (!serviceRequest?.id) {
          throw new AppError(
            "Missing ServiceRequest ID",
            [{ message: "Error.MissingServiceRequestId", path: ["bookingId"] }],
            { bookingId },
            500,
          );
        }

        const [workLog] = await Promise.all([
          tx.workLog.create({
            data: {
              staffId,
              bookingId,
              checkIn: now,
              checkInImages: imageUrls,
              updatedAt: now,
            },
          }),
          tx.serviceRequest.update({
            where: { id: serviceRequest.id },
            data: { status: RequestStatus.IN_PROGRESS },
          }),
        ]);

        return {
          message: "Check-in successful",
          workLogId: workLog.id,
          bookingId,
          checkInTime: now,
          imageCount: imageUrls.length,
        };
      });
    } catch (error) {
      if (error instanceof AppError) throw error;

      throw new AppError(
        "Failed to create work log and update service request status",
        [{ message: "Error.CreateWorkLogError", path: ["bookingId"] }],
        { bookingId, staffId, error },
        500,
      );
    }
  },

async checkOutWorkLogByBookingId(
  bookingId: number,
  imageUrls: string[] = [],
) {
  return await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        status: true,
        WorkLog: {
          select: { id: true, checkIn: true, checkOut: true },
        },
        Proposal: { select: { status: true } },
      },
    });

    if (!booking) {
      throw new AppError(
        "Booking not found",
        [{ message: "NotFound", path: ["bookingId"] }],
        { bookingId },
        404,
      );
    }

    const log = booking.WorkLog[0];
    const proposal = booking.Proposal;

    if (!log) {
      throw new AppError(
        "Work log not found",
        [{ message: "NotFound", path: ["bookingId"] }],
        { bookingId },
        404,
      );
    }

    if (!proposal || proposal.status !== ProposalStatus.ACCEPTED) {
      throw new AppError(
        "Proposal must be accepted before checking out",
        [{ message: "Error.ProposalNotAccepted", path: ["bookingId"] }],
        { bookingId, proposalStatus: proposal?.status },
        400,
      );
    }

    if (log.checkOut) {
      throw new AppError(
        "Already checked out",
        [{ message: "Error.AlreadyCheckedOut", path: ["bookingId"] }],
        { bookingId },
        400,
      );
    }

    if (!log.checkIn) {
      throw new AppError(
        "Check-in time is missing",
        [{ message: "Error.MissingCheckIn", path: ["bookingId"] }],
        { bookingId },
        400,
      );
    }

    const now = new Date();
    const hoursPassed = calculateHoursDifference(new Date(log.checkIn), now);

    if (hoursPassed > MAX_CHECKOUT_HOURS) {
      throw new AppError(
        "Check-out expired",
        [{ message: "Error.CheckOutTooLate", path: ["bookingId"] }],
        { bookingId, hoursPassed },
        400,
      );
    }

    // Get assets related to booking through InspectionReport
    const report = await tx.inspectionReport.findUnique({
      where: { bookingId },
      select: { CustomerAsset: { select: { id: true } } },
    });

    const assetIds = (report?.CustomerAsset ?? []).map(a => a.id);

    const [_, assetUpdateResult, updatedBooking] = await Promise.all([
      // Update WorkLog with checkout information
      tx.workLog.update({
        where: { id: log.id },
        data: {
          checkOut: now,
          updatedAt: now,
          checkOutImages: imageUrls,
        },
      }),
      
      // Update customer assets if any exist
      assetIds.length > 0
        ? tx.customerAsset.updateMany({
            where: { id: { in: assetIds } },
            data: {
              lastMaintenanceDate: now,
              totalMaintenanceCount: { increment: 1 },
              updatedAt: now,
            },
          })
        : Promise.resolve({ count: 0 } as { count: number }),
      
      // Update booking status to STAFF_COMPLETED
      tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.STAFF_COMPLETED,
          updatedAt: now,
        },
        select: {
          id: true,
          status: true,
          updatedAt: true,
        },
      }),
    ]);

    return {
      message: "Check-out successful",
      bookingId,
      checkOutTime: now,
      imageCount: imageUrls.length,
      updatedAssets: assetUpdateResult?.count ?? 0,
      bookingStatus: updatedBooking.status,
    };
  });
},

  async getBookingsByDate(staffId: number, date: string, page = 1, limit = 10) {
    const targetDate = new Date(date);
    const nextDay = new Date(targetDate);
    nextDay.setDate(targetDate.getDate() + 1);

    const { skip } = calculatePagination(page, limit);

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where: {
          staffId,
          createdAt: {
            gte: targetDate,
            lt: nextDay,
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: BOOKING_INCLUDE,
      }),
      prisma.booking.count({
        where: {
          staffId,
          createdAt: {
            gte: targetDate,
            lt: nextDay,
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      bookingsByDate: bookings.map(mapBookingResponse),
      total,
      page,
      limit,
      totalPages,
    };
  },

  async getMonthlyStats(staffId: number, month: number, year: number) {
    const fromDate = new Date(year, month - 1, 1);
    const toDate = new Date(year, month, 1);

    const [completedBookingsCount, workLogs] = await Promise.all([
      prisma.booking.count({
        where: {
          staffId,
          status: BookingStatus.COMPLETED,
          createdAt: { gte: fromDate, lt: toDate },
        },
      }),
      prisma.workLog.findMany({
        where: {
          staffId,
          checkIn: { gte: fromDate, lt: toDate },
        },
        select: { checkIn: true, checkOut: true },
      }),
    ]);

    let totalHoursWorked = 0;
    const workDates = new Set<string>();
    let firstCheckIn: Date | null = null;
    let lastCheckOut: Date | null = null;

    for (const log of workLogs) {
      if (log.checkIn && log.checkOut) {
        const startTime = new Date(log.checkIn);
        const endTime = new Date(log.checkOut);

        totalHoursWorked += calculateHoursDifference(startTime, endTime);

        const dateKey = startTime.toISOString().split("T")[0];
        workDates.add(dateKey);

        if (!firstCheckIn || startTime < firstCheckIn) firstCheckIn = startTime;
        if (!lastCheckOut || endTime > lastCheckOut) lastCheckOut = endTime;
      }
    }

    const totalWorkLogs = workLogs.length;
    const averageHoursPerLog =
      totalWorkLogs > 0
        ? Number((totalHoursWorked / totalWorkLogs).toFixed(2))
        : 0;

    return {
      month,
      year,
      totalCompletedBookings: completedBookingsCount,
      totalWorkLogs,
      totalHoursWorked: Number(totalHoursWorked.toFixed(2)),
      averageHoursPerLog,
      workDays: workDates.size,
      firstCheckIn,
      lastCheckOut,
    };
  },

  async getAllInspectionReports(
    staffId: number,
    options?: { page?: number; limit?: number },
  ) {
    try {
      const { page, limit, skip } = calculatePagination(
        options?.page,
        options?.limit,
      );

      const [total, reports] = await Promise.all([
        prisma.inspectionReport.count({ where: { staffId } }),
        prisma.inspectionReport.findMany({
          where: { staffId },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
          include: {
            Staff: {
              include: { User: { select: { name: true, avatar: true } } },
            },
            Booking: {
              include: {
                CustomerProfile: {
                  include: { User: { select: { name: true, phone: true } } },
                },
                ServiceRequest: {
                  select: {
                    preferredDate: true,
                    location: true,
                    phoneNumber: true,
                    Category: { select: { name: true } },
                  },
                },
              },
            },
            CustomerAsset: {
              include: {
                Category: { select: { id: true, name: true } },
              },
            },
          },
        }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        inspectionReports: reports.map((report) => ({
          id: report.id,
          bookingId: report.bookingId,
          staffId: report.staffId,
          estimatedTime: report.estimatedTime,
          note: report.note,
          images: report.images,
          createdAt: report.createdAt,
          staff: {
            id: report.Staff.id,
            name: report.Staff.User?.name,
            avatar: report.Staff.User?.avatar,
          },
          booking: {
            id: report.Booking.id,
            status: report.Booking.status,
            createdAt: report.Booking.createdAt,
            customer: {
              name: report.Booking.CustomerProfile?.User?.name,
              phone: report.Booking.CustomerProfile?.User?.phone,
              address: report.Booking.CustomerProfile?.address ?? null,
            },
            serviceRequest: report.Booking.ServiceRequest
              ? {
                  preferredDate: report.Booking.ServiceRequest.preferredDate,
                  location: report.Booking.ServiceRequest.location,
                  phoneNumber: report.Booking.ServiceRequest.phoneNumber,
                  categoryName:
                    report.Booking.ServiceRequest.Category?.name ?? null,
                }
              : undefined,
          },
        })),
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      throw new AppError(
        "Failed to fetch all inspection reports",
        [{ message: "Error.GetAllInspectionReportsError", path: [] }],
        { error },
        500,
      );
    }
  },

  async getProposalByBookingId(staffId: number, bookingId: number) {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: {
          id: true,
          staffId: true,
          Proposal: {
            include: {
              ProposalItem: {
                include: {
                  Service: {
                    select: {
                      id: true,
                      name: true,
                      basePrice: true,
                      virtualPrice: true,
                      durationMinutes: true,
                      Service_ServiceItems: {
                        include: { ServiceItem: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!booking) {
        throw new AppError(
          "Booking not found",
          [{ message: "Error.BookingNotFound", path: ["bookingId"] }],
          { bookingId },
          404,
        );
      }

      if (booking.staffId !== staffId) {
        throw new AppError(
          "Access denied: Staff does not own this booking",
          [{ message: "Error.UnauthorizedAccess", path: ["staffId"] }],
          { staffId, bookingStaffId: booking.staffId },
          403,
        );
      }

      if (!booking.Proposal) {
        throw new AppError(
          "No proposal found for this booking",
          [{ message: "Error.NoProposalFound", path: ["bookingId"] }],
          { bookingId },
          404,
        );
      }

      // Làm phẳng serviceItems và loại bỏ trường trung gian
      const items = booking.Proposal.ProposalItem.map((item) => {
        const s = item.Service as any;
        const serviceItems =
          s?.Service_ServiceItems?.map((ssi: any) => ssi.ServiceItem) ?? [];

        const { Service_ServiceItems, ...serviceRest } = s || {};

        return {
          id: item.id,
          quantity: item.quantity,
          service: {
            ...serviceRest,
            serviceItems,
          },
        };
      });

      return {
        id: booking.Proposal.id,
        status: booking.Proposal.status,
        notes: booking.Proposal.notes ?? "",
        createdAt: booking.Proposal.createdAt,
        items,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;

      throw new AppError(
        "Failed to fetch proposal by booking ID",
        [{ message: "Error.GetProposalByBookingError", path: ["bookingId"] }],
        { staffId, bookingId, error: (error as any)?.message ?? error },
        500,
      );
    }
  },
};
