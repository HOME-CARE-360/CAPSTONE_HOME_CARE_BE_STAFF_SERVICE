import { StaffRepository } from '../repositories/staff.repository';
import {
  CreateInspectionReportDto,
  UpdateInspectionReportDto,
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
      fromDate?: string;
      toDate?: string;
      keyword?: string;
    }
  ) {
    const { status, page = 1, limit = 10, fromDate, toDate, keyword } = query;

    // Validate status
    let bookingStatus: BookingStatus | undefined = undefined;
    if (status) {
      if (!Object.values(BookingStatus).includes(status as BookingStatus)) {
        throw new AppError(
          'Invalid booking status',
          [{ message: 'Error.InvalidBookingStatus', path: ['status'] }],
          { status },
          400
        );
      }
      bookingStatus = status as BookingStatus;
    }

    const take = Math.max(limit, 1);
    const skip = (Math.max(page, 1) - 1) * take;

    const [data, total] = await Promise.all([
      StaffRepository.getBookingsList(staffId, bookingStatus, {
        page,
        limit,
        fromDate,
        toDate,
        keyword,
      }),
      StaffRepository.countBookings(staffId, bookingStatus),
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
   * Tạo báo cáo kiểm tra dịch vụ
   */
  async createInspectionReport(dto: CreateInspectionReportDto) {
    const { staffId, bookingId, images, estimatedTime, note } = dto;
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
    return StaffRepository.getReviews(staffId, options);
  },

  /**
   * Lấy chi tiết báo cáo kiểm tra của 1 booking
   */
  async getInspectionReportById(inspectionId: number) {
    return StaffRepository.getInspectionReportById(inspectionId);
  },

  /**
   * Lấy danh sách báo cáo kiểm tra của staff
   */
  async getInspectionReportsByStaff(
    staffId: number,
    options?: {
      page?: number;
      limit?: number;
    }
  ) {
    return StaffRepository.getInspectionReportsByStaff(staffId, options);
  },


  /**
   * Cập nhật nội dung báo cáo kiểm tra
   */
  async updateInspectionReport(inspectionId: number, dto: UpdateInspectionReportDto) {
    const { note, images, estimatedTime } = dto;
    if (!note && !images?.length && !estimatedTime) {
      throw new AppError(
        'Missing update data for inspection report',
        [{ message: 'Error.MissingUpdateData', path: ['note', 'images', 'estimatedTime'] }],
        { inspectionId, dto },
        400
      );
    }

    return StaffRepository.updateInspectionReport(inspectionId, {
      ...(note && { note }),
      ...(images && images.length > 0 && { images }),
      ...(estimatedTime && { estimatedTime }),
    });
  },

  /**
   * Lấy danh sách work logs gần đây của staff
   */
  async getRecentWorkLogs(
    staffId: number,
    options?: { page?: number; limit?: number }
  ) {
    return StaffRepository.getRecentWorkLogs(staffId, options);
  },

  /**
   * Lấy tính hiệu suất làm việc của staff
   */
  async getStaffPerformanceById(staffId: number) {
    return StaffRepository.getStaffPerformanceById(staffId);
  },

  /**
   * Lấy tổng hợp review theo số sao
   */
  async getReviewSummary(staffId: number) {
    return StaffRepository.getReviewSummary(staffId);
  },

  /**
   * Tạo work log và chuyển booking thành IN_PROGRESS
   */
  async createWorkLogWithStatusUpdate(staffId: number, bookingId: number) {
    return StaffRepository.createWorkLogWithStatusUpdate(staffId, bookingId);
  },

  /**
   * Check-in work log
   */
  async checkOutWorkLog(bookingId: number) {
    return StaffRepository.checkOutWorkLogByBookingId(bookingId);
  },

  /**
   * Lấy danh sách booking theo ngày
   * @param staffId
   * @param date YYYY-MM-DD
   */
  async getBookingsByDate(staffId: number, date: string, page = 1, limit = 10) {
    return StaffRepository.getBookingsByDate(staffId, date, page, limit);
  },

  /**
   * Lấy thống kê hàng tháng của staff
   * @param staffId
   * @param month 1-12
   *  @param year YYYY
   * @return
   * {
   *   totalBookings: number;
   * }
   */
  async getMonthlyStats(staffId: number, month: number, year: number) {
    return StaffRepository.getMonthlyStats(staffId, month, year);
  }

};