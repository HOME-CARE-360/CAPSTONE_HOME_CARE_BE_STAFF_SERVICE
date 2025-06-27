import { PrismaClient, Prisma, BookingStatus, InspectionStatus, RequestStatus } from '../generated/prisma';
import { AppError } from '../handlers/error';

const prisma = new PrismaClient();

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
    }
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
          CustomerProfile: {
            OR: [
              { address: { contains: options.keyword, mode: 'insensitive' } },
              {
                User: {
                  OR: [
                    { name: { contains: options.keyword, mode: 'insensitive' } },
                    { phone: { contains: options.keyword, mode: 'insensitive' } },
                  ],
                },
              },
            ],
          },
        }
        : {}),
    };

    const [total, bookings] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
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
      total,
      page,
      limit,
      data: bookings.map((b) => ({
        id: b.id,
        status: b.status,
        createdAt: b.createdAt,
        serviceRequestId: b.serviceRequestId ?? null,
        customer: {
          name: b.CustomerProfile?.User?.name,
          phone: b.CustomerProfile?.User?.phone,
          address: b.CustomerProfile?.address,
        },
        serviceRequest: b.ServiceRequest ? {
          id: b.ServiceRequest.id,
          preferredDate: b.ServiceRequest.preferredDate,
          note: b.ServiceRequest.note,
          location: b.ServiceRequest.location,
          phoneNumber: b.ServiceRequest.phoneNumber,
          status: b.ServiceRequest.status,
          categoryId: b.ServiceRequest.Category?.id ?? null,
          categoryName: b.ServiceRequest.Category?.name ?? null,
        } : undefined,
      })),
    };
  },

  async getBookingDetail(bookingId: number) {
    try {
      const b = await prisma.booking.findUniqueOrThrow({
        where: { id: bookingId },
        include: {
          CustomerProfile: { include: { User: { select: { name: true, phone: true } } } },
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
      });

      return {
        id: b.id,
        status: b.status,
        createdAt: b.createdAt,
        customer: {
          id: b.CustomerProfile?.id,
          name: b.CustomerProfile?.User?.name,
          phone: b.CustomerProfile?.User?.phone,
          address: b.CustomerProfile?.address ?? undefined,
        },
        serviceRequest: b.ServiceRequest ? {
          id: b.ServiceRequest.id,
          preferredDate: b.ServiceRequest.preferredDate,
          note: b.ServiceRequest.note,
          location: b.ServiceRequest.location,
          phoneNumber: b.ServiceRequest.phoneNumber,
          status: b.ServiceRequest.status,
          category: b.ServiceRequest.Category ? {
            id: b.ServiceRequest.Category.id,
            name: b.ServiceRequest.Category.name,
          } : undefined,
        } : undefined,
      };
    } catch (error) {
      throw new AppError('Failed to get booking detail', [{ message: 'Repo.GetBookingDetailError', path: ['bookingId'] }], { bookingId, error }, 500);
    }
  },

  async createInspectionReport(data: Prisma.InspectionReportCreateInput) {
    try {
      return await prisma.$transaction(async (tx) => {
        if (
          !data.Booking ||
          !data.Booking.connect ||
          typeof data.Booking.connect.id !== 'number'
        ) {
          throw new AppError(
            'Booking connection is missing or invalid in inspection report data',
            [{ message: 'Error.CreateInspectionReportBookingConnectError', path: ['Booking.connect.id'] }],
            { data },
            400
          );
        }

        const bookingId = data.Booking.connect.id;

        const existing = await tx.inspectionReport.findUnique({
          where: { bookingId }
        });

        if (existing) {
          throw new AppError(
            'Inspection report already exists for this booking',
            [{ message: 'Error.InspectionReportExists', path: ['bookingId'] }],
            { bookingId },
            400
          );
        }

        const report = await tx.inspectionReport.create({ data });

        return report;
      });
    } catch (error) {
      throw new AppError(
        'Failed to create inspection report',
        [{ message: 'Error.CreateInspectionReportError', path: ['bookingId'] }],
        { data, error },
        500
      );
    }
  },

  async getReviews(
    staffId: number,
    options?: {
      page?: number;
      limit?: number;
      rating?: number;
      fromDate?: string;
      toDate?: string;
    }
  ) {
    try {
      const page = options?.page ?? 1;
      const limit = options?.limit ?? 10;
      const skip = (page - 1) * limit;

      const where: Prisma.ReviewWhereInput = {
        staffId,
        ...(options?.rating ? { rating: options.rating } : {}),
        ...(options?.fromDate || options?.toDate
          ? {
            createdAt: {
              ...(options.fromDate ? { gte: new Date(options.fromDate) } : {}),
              ...(options.toDate ? { lte: new Date(options.toDate) } : {}),
            },
          }
          : {}),
      };

      const [total, reviews] = await Promise.all([
        prisma.review.count({ where }),
        prisma.review.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            CustomerProfile: {
              select: {
                User: {
                  select: { name: true },
                },
              },
            },
            Service: {
              select: { name: true },
            },
          },
        }),
      ]);

      return {
        data: reviews.map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          createdAt: r.createdAt,
          customerName: r.CustomerProfile?.User?.name ?? null,
          serviceName: r.Service?.name ?? null,
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw new AppError(
        'Failed to get staff reviews',
        [{ message: 'Error.GetReviewsError', path: ['staffId'] }],
        { staffId, error },
        500
      );
    }
  },

  async countBookings(staffId: number, status?: BookingStatus): Promise<number> {
    return prisma.booking.count({ where: { staffId, ...(status && { status }) } });
  },

  async getInspectionReportById(inspectionId: number) {
    try {
      const report = await prisma.inspectionReport.findUnique({
        where: { id: inspectionId },
        include: {
          Staff: {
            include: {
              User: { select: { name: true, avatar: true } }
            }
          },
          Booking: {
            include: {
              CustomerProfile: {
                include: {
                  User: { select: { name: true, phone: true } }
                }
              },
              ServiceRequest: {
                select: {
                  preferredDate: true,
                  location: true,
                  phoneNumber: true,
                  Category: { select: { name: true } }
                }
              }
            }
          }
        }
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
              categoryName: report.Booking.ServiceRequest.Category?.name ?? null,
            }
            : undefined,
        }
      };
    } catch (error) {
      throw new AppError(
        'Failed to get inspection report by id',
        [{ message: 'Error.GetInspectionReportByIdError', path: ['id'] }],
        { inspectionId, error },
        500
      );
    }
  },

  async getInspectionReportsByStaff(
    staffId: number,
    options?: {
      page?: number;
      limit?: number;
    }
  ) {
    try {
      const page = options?.page ?? 1;
      const limit = options?.limit ?? 10;
      const skip = (page - 1) * limit;

      const [total, reports] = await Promise.all([
        prisma.inspectionReport.count({ where: { staffId } }),
        prisma.inspectionReport.findMany({
          where: { staffId },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
            Booking: {
              select: {
                id: true,
                status: true,
                createdAt: true,
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
          },
        }),
      ]);

      const data = reports.map((report) => ({
        id: report.id,
        createdAt: report.createdAt,
        estimatedTime: report.estimatedTime ?? null,
        note: report.note ?? '',
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
      }));

      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw new AppError(
        'Failed to fetch inspection reports for staff',
        [{ message: 'Error.GetInspectionReportsByStaffError', path: ['staffId'] }],
        { staffId, error },
        500
      );
    }
  },

  async updateInspectionReport(
    id: number,
    data: Partial<Pick<Prisma.InspectionReportUpdateInput, 'note' | 'images' | 'estimatedTime'>>
  ) {
    try {
      const report = await prisma.inspectionReport.findUnique({ where: { id } });
      if (!report) {
        throw new AppError(
          'Inspection report not found',
          [{ message: 'NotFound', path: ['id'] }],
          { id },
          404
        );
      }

      const now = new Date();
      const createdAt = new Date(report.createdAt);
      const hoursPassed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      if (hoursPassed > 24) {
        throw new AppError(
          'Inspection report can no longer be updated after 24 hours',
          [{ message: 'Error.ReportUpdateTooLate', path: ['id'] }],
          { id, hoursPassed },
          400
        );
      }

      return await prisma.inspectionReport.update({ where: { id }, data });
    } catch (error) {
      throw new AppError(
        'Failed to update inspection report',
        [{ message: 'Error.UpdateInspectionReportError', path: ['id'] }],
        { id, data, error },
        500
      );
    }
  },

  async getStaffPerformanceById(staffId: number) {
    try {
      const [bookings, workLogs, reviews] = await Promise.all([
        prisma.booking.findMany({ where: { staffId }, select: { id: true } }),
        prisma.workLog.findMany({ where: { staffId }, select: { checkIn: true, checkOut: true } }),
        prisma.review.findMany({ where: { staffId }, select: { rating: true } }),
      ]);

      const totalBookings = bookings.length;
      const totalHoursWorked = workLogs.reduce((sum, log) => {
        if (log.checkIn && log.checkOut) {
          const ms = new Date(log.checkOut).getTime() - new Date(log.checkIn).getTime();
          return sum + ms / (1000 * 60 * 60);
        }
        return sum;
      }, 0);

      const totalReviews = reviews.length;
      const averageRating = totalReviews > 0 ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(2)) : null;

      return { staffId, totalBookings, totalHoursWorked: Number(totalHoursWorked.toFixed(2)), totalReviews, averageRating };
    } catch (error) {
      throw new AppError('Failed to get staff performance', [{ message: 'Error.GetStaffPerformanceError', path: ['staffId'] }], { staffId, error }, 500);
    }
  },

  async getRecentWorkLogs(
    staffId: number,
    options?: { page?: number; limit?: number }
  ) {
    try {
      const page = options?.page ?? 1;
      const limit = options?.limit ?? 10;
      const skip = (page - 1) * limit;

      const [total, logs] = await Promise.all([
        prisma.workLog.count({ where: { staffId } }),
        prisma.workLog.findMany({
          where: { staffId },
          orderBy: { checkIn: 'desc' },
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

      const data = logs.map((log) => ({
        id: log.id,
        checkIn: log.checkIn,
        checkOut: log.checkOut,
        note: log.note,
        createdAt: log.createdAt,
        booking: {
          id: log.Booking?.id,
          status: log.Booking?.status,
          createdAt: log.Booking?.createdAt,
        },
      }));

      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw new AppError(
        'Failed to fetch recent work logs',
        [{ message: 'Error.GetRecentWorkLogsError', path: ['staffId'] }],
        { staffId, error },
        500
      );
    }
  },

  async getReviewSummary(staffId: number) {
    try {
      const ratings = await prisma.review.findMany({ where: { staffId }, select: { rating: true } });
      const summary = [1, 2, 3, 4, 5].reduce((acc, star) => {
        acc[star] = ratings.filter((r) => r.rating === star).length;
        return acc;
      }, {} as Record<number, number>);
      return summary;
    } catch (error) {
      throw new AppError('Failed to summarize reviews', [{ message: 'Error.GetReviewSummaryError', path: ['staffId'] }], { staffId, error }, 500);
    }
  },

  async createWorkLogWithStatusUpdate(staffId: number, bookingId: number) {
    try {
      return await prisma.$transaction(async (tx) => {
        const booking = await tx.booking.findUnique({
          where: { id: bookingId },
          include: { ServiceRequest: { select: { id: true, preferredDate: true } } },
        });

        if (!booking) {
          throw new AppError('Booking not found', [{ message: 'Error.BookingNotFound', path: ['bookingId'] }], { bookingId }, 404);
        }

        if (booking.status === BookingStatus.COMPLETED || booking.status === BookingStatus.CANCELLED) {
          throw new AppError(
            'Cannot check in to a completed or canceled booking',
            [{ message: 'Error.InvalidBookingStatusForCheckIn', path: ['bookingId'] }],
            { bookingId, status: booking.status },
            400
          );
        }

        const existingLog = await tx.workLog.findFirst({ where: { bookingId, staffId } });
        if (existingLog) {
          throw new AppError(
            'Staff already checked in for this booking',
            [{ message: 'Error.AlreadyCheckedIn', path: ['bookingId'] }],
            { bookingId, staffId },
            400
          );
        }

        const today = new Date();
        const preferredDate = booking.ServiceRequest?.preferredDate;
        if (preferredDate) {
          const diffDays = Math.abs(Math.floor((today.getTime() - new Date(preferredDate).getTime()) / (1000 * 60 * 60 * 24)));
          if (diffDays > 1) {
            throw new AppError(
              'Cannot check in far from preferred date',
              [{ message: 'Error.DateMismatchPreferredDate', path: ['bookingId'] }],
              { bookingId, preferredDate, today },
              400
            );
          }
        }

        const workLog = await tx.workLog.create({
          data: {
            Staff: { connect: { id: staffId } },
            Booking: { connect: { id: bookingId } },
            checkIn: today,
            updatedAt: today,
          },
        });

        if (!booking.ServiceRequest?.id) {
          throw new AppError('Missing ServiceRequest ID', [{ message: 'Error.MissingServiceRequestId', path: ['bookingId'] }], { bookingId }, 500);
        }

        await tx.serviceRequest.update({
          where: { id: booking.ServiceRequest.id },
          data: { status: RequestStatus.IN_PROGRESS },
        });

        return workLog;
      });
    } catch (error) {
      throw new AppError(
        'Failed to create work log and update service request status',
        [{ message: 'Error.CreateWorkLogError', path: ['bookingId'] }],
        { bookingId, staffId, error },
        500
      );
    }
  },

  async checkOutWorkLogByBookingId(bookingId: number) {
    return await prisma.$transaction(async (tx) => {
      const log = await tx.workLog.findFirst({
        where: { bookingId },
      });

      if (!log) {
        throw new AppError(
          'Work log not found',
          [{ message: 'NotFound', path: ['bookingId'] }],
          { bookingId },
          404
        );
      }

      if (log.checkOut) {
        throw new AppError(
          'Already checked out',
          [{ message: 'Error.AlreadyCheckedOut', path: ['bookingId'] }],
          { bookingId },
          400
        );
      }

      if (!log.checkIn) {
        throw new AppError(
          'Check-in time is missing',
          [{ message: 'Error.MissingCheckIn', path: ['bookingId'] }],
          { bookingId },
          400
        );
      }

      const now = new Date();
      const hoursPassed = (now.getTime() - new Date(log.checkIn).getTime()) / (1000 * 60 * 60);

      if (hoursPassed > 24) {
        throw new AppError(
          'Check-out expired',
          [{ message: 'Error.CheckOutTooLate', path: ['bookingId'] }],
          { bookingId, hoursPassed },
          400
        );
      }

      // Cập nhật WorkLog + Booking.status = COMPLETED
      await tx.workLog.update({
        where: { id: log.id },
        data: { checkOut: now, updatedAt: now },
      });

      await tx.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.COMPLETED },
      });

      return { message: 'Check-out successful', bookingId, updatedAt: now };
    });
  },

  async getBookingsByDate(staffId: number, date: string, page = 1, limit = 10) {
    const target = new Date(date);
    const nextDay = new Date(target);
    nextDay.setDate(target.getDate() + 1);

    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where: {
          staffId,
          createdAt: {
            gte: target,
            lt: nextDay,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          CustomerProfile: {
            include: { User: { select: { name: true, phone: true } } },
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
      prisma.booking.count({
        where: {
          staffId,
          createdAt: {
            gte: target,
            lt: nextDay,
          },
        },
      }),
    ]);

    const data = bookings.map((b) => ({
      id: b.id,
      status: b.status,
      createdAt: b.createdAt,
      serviceRequestId: b.serviceRequestId ?? null,
      customer: {
        name: b.CustomerProfile?.User?.name,
        phone: b.CustomerProfile?.User?.phone,
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
        : undefined,
    }));

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getMonthlyStats(staffId: number, month: number, year: number) {
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 1);

    const [bookings, workLogs] = await Promise.all([
      prisma.booking.findMany({
        where: {
          staffId,
          status: BookingStatus.COMPLETED,
          createdAt: { gte: from, lt: to },
        },
      }),
      prisma.workLog.findMany({
        where: {
          staffId,
          checkIn: { gte: from, lt: to },
        },
      }),
    ]);

    const totalCompletedBookings = bookings.length;
    const totalWorkLogs = workLogs.length;

    let totalHoursWorked = 0;
    const workDates = new Set<string>();
    let firstCheckIn: Date | null = null;
    let lastCheckOut: Date | null = null;

    for (const log of workLogs) {
      if (log.checkIn && log.checkOut) {
        const start = new Date(log.checkIn);
        const end = new Date(log.checkOut);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        totalHoursWorked += hours;

        const dateKey = start.toISOString().split('T')[0];
        workDates.add(dateKey);

        if (!firstCheckIn || start < firstCheckIn) firstCheckIn = start;
        if (!lastCheckOut || end > lastCheckOut) lastCheckOut = end;
      }
    }

    const averageHoursPerLog =
      totalWorkLogs > 0 ? Number((totalHoursWorked / totalWorkLogs).toFixed(2)) : 0;

    return {
      month,
      year,
      totalCompletedBookings,
      totalWorkLogs,
      totalHoursWorked: Number(totalHoursWorked.toFixed(2)),
      averageHoursPerLog,
      workDays: workDates.size,
      firstCheckIn,
      lastCheckOut,
    };
  }
};
