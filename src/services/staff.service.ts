import { StaffRepository } from '../repositories/staff.repository';
import {
  CreateInspectionReportDto,
  UpdateInspectionStatusDto,
} from '../schemas/type';
import { AppError } from '../handlers/error';
import { BookingStatus } from '../generated/prisma';

export const StaffService = {
  /**
   * Lấy danh sách booking của staff theo status (nếu có)
   */
  async getBookingsList(
    staffId: number,
    query: {
      status?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const { status, page = 1, limit = 10 } = query;

    // Validate status
    if (status && !Object.values(BookingStatus).includes(status as BookingStatus)) {
      throw new AppError(
        'Invalid booking status',
        [{ message: 'Error.InvalidBookingStatus', path: ['status'] }],
        { status },
        400
      );
    }

    const take = Math.max(limit, 1);
    const skip = (Math.max(page, 1) - 1) * take;

    // Parallel fetch data + count
    const [data, total] = await Promise.all([
      StaffRepository.getBookingsList(staffId, status as BookingStatus, { skip, take }),
      StaffRepository.countBookings(staffId, status as BookingStatus),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / take),
      },
    };
  },

  async getBookingDetail(bookingId: number) {
    return StaffRepository.getBookingDetail(bookingId);
  },

  /**
   * Cập nhật trạng thái kiểm tra và ghi chú
   */
  async updateInspectionStatus(dto: UpdateInspectionStatusDto) {
    const { bookingId, inspectionStatus, inspectionNote } = dto;

    const isEmptyUpdate = inspectionStatus === undefined && !inspectionNote?.trim();
    if (isEmptyUpdate) {
      throw new AppError(
        'Missing update data for inspection',
        [{ message: 'Error.MissingInspectionData', path: ['inspectionStatus', 'inspectionNote'] }],
        { dto },
        400
      );
    }

    return StaffRepository.updateInspectionStatus(bookingId, {
      ...(inspectionStatus && { inspectionStatus }),
      ...(inspectionNote && { inspectionNote }),
    });
  },

  /**
   * Tạo báo cáo kiểm tra dịch vụ
   */
  async createInspectionReport(dto: CreateInspectionReportDto) {
    const { staffId, bookingId, images, estimatedTime, note } = dto;

    if (!staffId || !bookingId || !images?.length) {
      throw new AppError(
        'Missing required data to create inspection report',
        [{ message: 'Error.MissingInspectionReportData', path: ['staffId', 'bookingId', 'images'] }],
        { dto },
        400
      );
    }

    return StaffRepository.createInspectionReport({
      images,
      estimatedTime,
      note,
      Booking: { connect: { id: bookingId } },
      Staff: { connect: { id: staffId } },
    });
  },

  /**
   * Lấy danh sách đánh giá của staff
   */
  async getReviews(staffId: number) {
    return StaffRepository.getReviews(staffId);
  },
};
