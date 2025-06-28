import { StaffRepository } from '../repositories/staff.repository';
import {
  CreateInspectionReportDto,
  UpdateInspectionReportDto,
  UpdateInspectionStatusDto,
} from '../schemas/type';
import { AppError } from '../handlers/error';
import { BookingStatus } from '../generated/prisma';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MIN_LIMIT = 1;
const MAX_LIMIT = 100;

const VALID_BOOKING_STATUSES = new Set(Object.values(BookingStatus));

interface PaginationQuery {
  page?: number;
  limit?: number;
}

interface DateRangeQuery {
  fromDate?: string;
  toDate?: string;
}

interface BookingsListQuery extends PaginationQuery, DateRangeQuery {
  status?: string;
  keyword?: string;
}

export const StaffService = {
  /**
   * Retrieves paginated bookings list for staff with optional filtering
   * @param staffId - Staff identifier
   * @param query - Query parameters for filtering and pagination
   * @returns Paginated bookings response
   */
  async getBookingsList(
    staffId: number,
    options: PaginationQuery & {
      status?: string;
      fromDate?: string;
      toDate?: string;
      keyword?: string;
    } = {}
  ) {
    const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT, ...filters } = options;

    const sanitizedOptions = {
      page: Math.max(page, DEFAULT_PAGE),
      limit: Math.min(Math.max(limit, MIN_LIMIT), MAX_LIMIT),
      ...filters,
    };

    const { status, ...rest } = sanitizedOptions;

    let bookingStatus: BookingStatus | undefined;
    if (status && !VALID_BOOKING_STATUSES.has(status as BookingStatus)) {
      throw new AppError(
        'Invalid booking status',
        [{ message: 'Error.InvalidBookingStatus', path: ['status'] }],
        { status },
        400
      );
    }

    return StaffRepository.getBookingsList(staffId, bookingStatus, rest);
  },

  /**
   * Retrieves detailed booking information for staff
   * @param bookingId - Booking identifier
   * @param staffId - Staff identifier
   * @returns Booking details or null if not found
   */
  async getBookingDetail(bookingId: number, staffId: number) {
    if (!bookingId || !staffId) {
      throw new AppError(
        'Missing required parameters',
        [{ message: 'Error.MissingParameters', path: ['bookingId', 'staffId'] }],
        { bookingId, staffId },
        400
      );
    }

    return StaffRepository.getBookingDetail(bookingId, staffId);
  },

  /**
   * Creates an inspection report for a booking
   * @param dto - Inspection report creation data
   * @returns Created inspection report
   */
  async createInspectionReport(dto: CreateInspectionReportDto) {
    const { staffId, bookingId, images = [], estimatedTime, note } = dto;

    // Validate required fields
    if (!staffId || !bookingId) {
      throw new AppError(
        'Missing required fields',
        [{ message: 'Error.MissingRequiredFields', path: ['staffId', 'bookingId'] }],
        { dto },
        400
      );
    }

    const inspectionData = {
      images,
      estimatedTime,
      note,
      Booking: { connect: { id: bookingId } },
      Staff: { connect: { id: staffId } },
    };

    return StaffRepository.createInspectionReport(inspectionData);
  },

  /**
   * Retrieves paginated reviews for staff
   * @param staffId - Staff identifier
   * @param options - Query options for filtering and pagination
   * @returns Paginated reviews
   */
  async getReviews(
    staffId: number,
    options: PaginationQuery & {
      rating?: number;
      fromDate?: string;
      toDate?: string;
    } = {}
  ) {
    const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT, ...filters } = options;
    const sanitizedOptions = {
      page: Math.max(page, DEFAULT_PAGE),
      limit: Math.min(Math.max(limit, MIN_LIMIT), MAX_LIMIT),
      ...filters,
    };

    return StaffRepository.getReviews(staffId, sanitizedOptions);
  },

  /**
   * Retrieves inspection report by ID with error handling
   * @param inspectionId - Inspection report identifier
   * @returns Inspection report details
   */
  async getInspectionReportById(inspectionId: number) {
    if (!inspectionId || inspectionId <= 0) {
      throw new AppError(
        'Invalid inspection ID',
        [{ message: 'Error.InvalidInspectionId', path: ['inspectionId'] }],
        { inspectionId },
        400
      );
    }

    return StaffRepository.getInspectionReportById(inspectionId);
  },

  /**
   * Retrieves paginated inspection reports for staff
   * @param staffId - Staff identifier
   * @param options - Pagination options
   * @returns Paginated inspection reports
   */
  async getInspectionReportsByStaff(
    staffId: number,
    options: PaginationQuery = {}
  ) {
    const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT } = options;
    const sanitizedOptions = {
      page: Math.max(page, DEFAULT_PAGE),
      limit: Math.min(Math.max(limit, MIN_LIMIT), MAX_LIMIT),
    };

    return StaffRepository.getInspectionReportsByStaff(staffId, sanitizedOptions);
  },

  /**
   * Updates inspection report with validation and optimization
   * @param inspectionId - Inspection report identifier
   * @param dto - Update data
   * @returns Updated inspection report
   */
  async updateInspectionReport(
    inspectionId: number,
    dto: UpdateInspectionReportDto
  ) {
    const { note, images, estimatedTime } = dto;

    // Early validation for empty updates
    const hasValidUpdates = Boolean(
      note?.trim() ||
      (images && images.length > 0) ||
      estimatedTime
    );

    if (!hasValidUpdates) {
      throw new AppError(
        'No valid update data provided',
        [{ message: 'Error.NoValidUpdateData', path: ['note', 'images', 'estimatedTime'] }],
        { inspectionId, dto },
        400
      );
    }

    const updateData: Partial<UpdateInspectionReportDto> = {};
    if (note?.trim()) updateData.note = note.trim();
    if (images && images.length > 0) updateData.images = images;
    if (estimatedTime) updateData.estimatedTime = estimatedTime;

    return StaffRepository.updateInspectionReport(inspectionId, updateData);
  },

  /**
   * Retrieves recent work logs for staff with pagination
   * @param staffId - Staff identifier
   * @param options - Pagination options
   * @returns Paginated work logs
   */
  async getRecentWorkLogs(
    staffId: number,
    options: PaginationQuery = {}
  ) {
    const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT } = options;
    const sanitizedOptions = {
      page: Math.max(page, DEFAULT_PAGE),
      limit: Math.min(Math.max(limit, MIN_LIMIT), MAX_LIMIT),
    };

    return StaffRepository.getRecentWorkLogs(staffId, sanitizedOptions);
  },

  /**
   * Retrieves staff performance metrics
   * @param staffId - Staff identifier
   * @returns Performance metrics
   */
  async getStaffPerformanceById(staffId: number) {
    if (!staffId || staffId <= 0) {
      throw new AppError(
        'Invalid staff ID',
        [{ message: 'Error.InvalidStaffId', path: ['staffId'] }],
        { staffId },
        400
      );
    }

    return StaffRepository.getStaffPerformanceById(staffId);
  },

  /**
   * Retrieves aggregated review summary by rating
   * @param staffId - Staff identifier
   * @returns Review summary statistics
   */
  async getReviewSummary(staffId: number) {
    return StaffRepository.getReviewSummary(staffId);
  },

  /**
   * Creates work log and updates booking status atomically
   * @param staffId - Staff identifier
   * @param bookingId - Booking identifier
   * @returns Work log creation result
   */
  async createWorkLogWithStatusUpdate(staffId: number, bookingId: number) {
    // Validate required parameters
    if (!staffId || !bookingId) {
      throw new AppError(
        'Missing required parameters',
        [{ message: 'Error.MissingParameters', path: ['staffId', 'bookingId'] }],
        { staffId, bookingId },
        400
      );
    }

    return StaffRepository.createWorkLogWithStatusUpdate(staffId, bookingId);
  },

  /**
   * Checks out work log for a booking
   * @param bookingId - Booking identifier
   * @returns Check-out result
   */
  async checkOutWorkLog(bookingId: number) {
    if (!bookingId || bookingId <= 0) {
      throw new AppError(
        'Invalid booking ID',
        [{ message: 'Error.InvalidBookingId', path: ['bookingId'] }],
        { bookingId },
        400
      );
    }

    return StaffRepository.checkOutWorkLogByBookingId(bookingId);
  },

  /**
   * Retrieves bookings for a specific date with pagination
   * @param staffId - Staff identifier
   * @param date - Date in YYYY-MM-DD format
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10)
   * @returns Paginated bookings for the date
   */
  async getBookingsByDate(
    staffId: number,
    date: string,
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT
  ) {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new AppError(
        'Invalid date format',
        [{ message: 'Error.InvalidDateFormat', path: ['date'] }],
        { date },
        400
      );
    }

    const sanitizedPage = Math.max(page, DEFAULT_PAGE);
    const sanitizedLimit = Math.min(Math.max(limit, MIN_LIMIT), MAX_LIMIT);

    return StaffRepository.getBookingsByDate(
      staffId,
      date,
      sanitizedPage,
      sanitizedLimit
    );
  },

  /**
   * Retrieves monthly statistics for staff
   * @param staffId - Staff identifier
   * @param month - Month (1-12)
   * @param year - Year (YYYY)
   * @returns Monthly statistics including total bookings
   */
  async getMonthlyStats(staffId: number, month: number, year: number) {
    // Validate month and year
    if (!month || month < 1 || month > 12) {
      throw new AppError(
        'Invalid month',
        [{ message: 'Error.InvalidMonth', path: ['month'] }],
        { month },
        400
      );
    }

    const currentYear = new Date().getFullYear();
    if (!year || year < 2000 || year > currentYear + 10) {
      throw new AppError(
        'Invalid year',
        [{ message: 'Error.InvalidYear', path: ['year'] }],
        { year },
        400
      );
    }

    return StaffRepository.getMonthlyStats(staffId, month, year);
  },
} as const;