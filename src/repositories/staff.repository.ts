import { PrismaClient, Prisma, BookingStatus } from '../generated/prisma';
import { AppError } from '../handlers/error';

const prisma = new PrismaClient();

export const StaffRepository = {
  /**
   * Lấy danh sách booking của staff
   */
  /**
   * Lấy danh sách booking của staff (dạng rút gọn, phân trang)
   */
  async getBookingsList(
    staffId: number,
    status?: BookingStatus,
    options?: { skip?: number; take?: number }
  ) {
    const { skip = 0, take = 10 } = options || {};

    const bookings = await prisma.booking.findMany({
      where: {
        staffId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        CustomerProfile: {
          include: {
            User: {
              select: { name: true, phone: true },
            },
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
            Category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return bookings.map((b) => ({
      id: b.id,
      status: b.status,
      inspectionStatus: b.inspectionStatus ?? null,
      inspectionNote: b.inspectionNote ?? null,
      inspectedAt: b.inspectedAt ?? null,
      createdAt: b.createdAt,
      serviceRequestId: b.serviceRequestId ?? null,
      customer: {
        name: b.CustomerProfile?.User?.name,
        phone: b.CustomerProfile?.User?.phone,
        address: b.CustomerProfile?.address,
      },
      serviceRequest: b.ServiceRequest
        ? {
          id: b.ServiceRequest.id,
          preferredDate: b.ServiceRequest.preferredDate,
          note: b.ServiceRequest.note,
          location: b.ServiceRequest.location,
          phoneNumber: b.ServiceRequest.phoneNumber,
          status: b.ServiceRequest.status,
          category: b.ServiceRequest.Category
            ? {
              id: b.ServiceRequest.Category.id,
              name: b.ServiceRequest.Category.name,
            }
            : undefined,
        }
        : undefined,
    }));
  },

  /**
   * Lấy chi tiết 1 booking (đầy đủ thông tin hơn)
   */
  async getBookingDetail(
    bookingId: number
  ): Promise<{
    id: number;
    status: string;
    inspectionStatus: string | null;
    inspectedAt: Date | null;
    inspectionNote: string | null;
    createdAt: Date;
    customer: {
      id?: number;
      name?: string;
      phone?: string;
      address?: string;
    };
     serviceRequest?: {
      id: number;
      preferredDate: Date | null;
      note: string | null;
      location?: string;
      phoneNumber?: string;
      status: string;
      category?: {
        id: number;
        name: string;
      };
    };
  }> {
    try {
      const b = await prisma.booking.findUniqueOrThrow({
        where: { id: bookingId },
        include: {
          CustomerProfile: {
            include: {
              User: {
                select: { name: true, phone: true },
              },
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
              Category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      return {
        id: b.id,
        status: b.status,
        inspectionStatus: b.inspectionStatus ?? null,
        inspectedAt: b.inspectedAt,
        inspectionNote: b.inspectionNote,
        createdAt: b.createdAt,
        customer: {
          id: b.CustomerProfile?.id,
          name: b.CustomerProfile?.User?.name,
          phone: b.CustomerProfile?.User?.phone,
          address: b.CustomerProfile?.address ?? undefined,
        },
        serviceRequest: b.ServiceRequest
          ? {
            id: b.ServiceRequest.id,
            preferredDate: b.ServiceRequest.preferredDate,
            note: b.ServiceRequest.note,
            location: b.ServiceRequest.location,
            phoneNumber: b.ServiceRequest.phoneNumber,
            status: b.ServiceRequest.status,
            category: b.ServiceRequest.Category
              ? {
                id: b.ServiceRequest.Category.id,
                name: b.ServiceRequest.Category.name,
              }
              : undefined,
          }
          : undefined,
      };
    } catch (error) {
      throw new AppError(
        'Failed to get booking detail',
        [{ message: 'Repo.GetBookingDetailError', path: ['bookingId'] }],
        { bookingId, error },
        500
      );
    }
  },

  /**
   * Cập nhật trạng thái kiểm tra của 1 booking
   */
  async updateInspectionStatus(
  bookingId: number,
  data: Partial<Pick<Prisma.BookingUpdateInput, 'inspectionStatus' | 'inspectionNote'>>
) {
  try {
    return await prisma.booking.update({
      where: { id: bookingId },
      data,
    });
  } catch (error) {
    throw new AppError(
      'Failed to update inspection status',
      [{ message: 'Repo.UpdateInspectionStatusError', path: ['bookingId'] }],
      { bookingId, data, error },
      500
    );
  }
},

  /**
   * Tạo báo cáo kiểm tra
   */
  async createInspectionReport(data: Prisma.InspectionReportCreateInput) {
  try {
    return await prisma.inspectionReport.create({ data });
  } catch (error) {
    throw new AppError(
      'Failed to create inspection report',
      [{ message: 'Repo.CreateInspectionReportError', path: ['bookingId'] }],
      { data, error },
      500
    );
  }
},

  /**
   * Lấy các đánh giá từ khách hàng
   */
  async getReviews(staffId: number) {
  try {
    return await prisma.review.findMany({
      where: { staffId },
      include: {
        CustomerProfile: true,
        Service: true,
      },
    });
  } catch (error) {
    throw new AppError(
      'Failed to get staff reviews',
      [{ message: 'Repo.GetReviewsError', path: ['staffId'] }],
      { staffId, error },
      500
    );
  }
},

  async countBookings(
  staffId: number,
  status ?: BookingStatus
): Promise < number > {
  return prisma.booking.count({
    where: {
      staffId,
      ...(status && { status }),
    },
  });
},

};
