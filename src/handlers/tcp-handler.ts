import { TCPResponseSuccess } from '../interfaces/tcp-response.interface';
import {
    GetBookingsByDateSchema,
    GetBookingsListSchema,
    GetReviewsSchema,
    GetRecentWorkLogsSchema,
    GetInspectionReportsSchema,
} from '../schemas/app.schema';
import {
    CreateInspectionReportDto,
    UpdateInspectionReportDto,
} from '../schemas/type';
import { StaffService } from '../services/staff.service';
import { AppError } from './error';
import { parseWithSchema } from './parseWithSchema';
import { throwRpcAppError } from './throwRpcAppError';

interface TCPPayload {
    type: string;
    data: any;
}

interface HandlerResult {
    message: string;
    data: any;
}

type HandleTCPReturn<T = any> = TCPResponseSuccess<T>;

// Handler map for better performance and maintainability
const HANDLER_MAP = new Map<string, (data: any) => Promise<HandlerResult>>([
    ['STAFF_GET_BOOKINGS', handleGetBookings],
    ['STAFF_GET_BOOKING_DETAIL', handleGetBookingDetail],
    ['STAFF_CREATE_INSPECTION_REPORT', handleCreateInspectionReport],
    ['STAFF_GET_REVIEWS', handleGetReviews],
    ['STAFF_GET_INSPECTION_REPORTS', handleGetInspectionReports],
    ['STAFF_GET_INSPECTION_DETAIL', handleGetInspectionDetail],
    ['UPDATE_INSPECTION_REPORT', handleUpdateInspectionReport],
    ['STAFF_GET_WORK_LOGS', handleGetWorkLogs],
    ['STAFF_GET_PERFORMANCE', handleGetPerformance],
    ['STAFF_GET_REVIEW_SUMMARY', handleGetReviewSummary],
    ['STAFF_CREATE_WORK_LOG', handleCreateWorkLog],
    ['STAFF_CHECK_OUT', handleCheckOut],
    ['STAFF_GET_BOOKINGS_BY_DATE', handleGetBookingsByDate],
    ['STAFF_GET_MONTHLY_STATS', handleGetMonthlyStats],
]);

export async function handleTCPRequest(payload: TCPPayload): Promise<HandleTCPReturn> {
    const { type, data } = payload;

    console.log(`[TCP] Incoming: ${type}`, {
        payload: { ...payload, data: data ? '[REDACTED]' : undefined },
    });

    try {
        const handler = HANDLER_MAP.get(type);

        if (!handler) {
            throw new AppError(
                'Error.UnknownRequestType',
                [{ message: 'Unknown request type', path: ['type'] }],
                { receivedType: type },
                400
            );
        }

        const result = await handler(data);

        return {
            success: true,
            code: 'SUCCESS',
            message: result.message,
            data: result.data,
            statusCode: 200,
            timestamp: new Date().toISOString(),
        };
    } catch (err: any) {
        return handleError(err, payload);
    }
}

function handleError(err: any, payload: TCPPayload): never {
    const errorContext = {
        name: err?.name || 'Unknown',
        message: err?.message || 'No message',
        code: err?.code || 'NO_CODE',
        statusCode: err?.statusCode || 500,
        stack: err?.stack?.split('\n').slice(0, 3).join('\n'),
    };

    console.error(`[TCP] ${payload?.type ?? 'Unknown'} Failed:`, errorContext);

    if (err instanceof AppError) {
        throwRpcAppError(err);
    }

    throwRpcAppError(
        new AppError(
            'Error.Unexpected',
            [{ message: 'An unexpected error occurred', path: [] }],
            {
                originalError: {
                    name: err?.name,
                    message: err?.message,
                },
                requestType: payload?.type,
            },
            500
        )
    );
}

async function handleGetBookings(data: any): Promise<HandlerResult> {
    const parsed = parseWithSchema(GetBookingsListSchema, data);
    const result = await StaffService.getBookingsList(parsed.staffId, parsed);
    return { message: 'Staff bookings retrieved successfully', data: result };
}

async function handleGetBookingDetail(data: any): Promise<HandlerResult> {
    validateId(data?.bookingId, 'bookingId');
    validateId(data?.staffId, 'staffId');
    const result = await StaffService.getBookingDetail(data.bookingId, data.staffId);
    return { message: 'Booking detail retrieved successfully', data: result };
}

async function handleCreateInspectionReport(data: any): Promise<HandlerResult> {
    validateUpdateData(data, 'inspectionReport');
    const result = await StaffService.createInspectionReport(data as CreateInspectionReportDto);
    return { message: 'Inspection report created successfully', data: result };
}

async function handleGetReviews(data: any): Promise<HandlerResult> {
    const parsed = parseWithSchema(GetReviewsSchema, data);
    const result = await StaffService.getReviews(parsed.staffId, parsed);
    return { message: 'Staff reviews retrieved successfully', data: result };
}

async function handleGetInspectionReports(data: any): Promise<HandlerResult> {
    const parsed = parseWithSchema(GetInspectionReportsSchema, data);
    const result = await StaffService.getInspectionReportsByStaff(parsed.staffId, parsed);
    return { message: 'Inspection reports retrieved successfully', data: result };
}

async function handleGetInspectionDetail(data: any): Promise<HandlerResult> {
    validateId(data?.inspectionId, 'inspectionId');
    const result = await StaffService.getInspectionReportById(data.inspectionId);
    return { message: 'Inspection report detail retrieved successfully', data: result };
}

async function handleUpdateInspectionReport(data: any): Promise<HandlerResult> {
    validateId(data?.inspectionId, 'inspectionId');
    validateUpdateData(data?.dataInspection, 'inspectionReport');
    const result = await StaffService.updateInspectionReport(
        data.inspectionId,
        data.dataInspection as UpdateInspectionReportDto
    );
    return { message: 'Inspection report updated successfully', data: result };
}

async function handleGetWorkLogs(data: any): Promise<HandlerResult> {
    const parsed = parseWithSchema(GetRecentWorkLogsSchema, data);
    const result = await StaffService.getRecentWorkLogs(parsed.staffId, parsed);
    return { message: 'Recent work logs retrieved successfully', data: result };
}

async function handleGetPerformance(data: any): Promise<HandlerResult> {
    validateId(data?.staffId, 'staffId');
    const result = await StaffService.getStaffPerformanceById(data.staffId);
    return { message: 'Staff performance retrieved successfully', data: result };
}

async function handleGetReviewSummary(data: any): Promise<HandlerResult> {
    validateId(data?.staffId, 'staffId');
    const result = await StaffService.getReviewSummary(data.staffId);
    return { message: 'Review summary retrieved successfully', data: result };
}

async function handleCreateWorkLog(data: any): Promise<HandlerResult> {
    validateId(data?.staffId, 'staffId');
    validateId(data?.bookingId, 'bookingId');
    const result = await StaffService.createWorkLogWithStatusUpdate(data.staffId, data.bookingId);
    return { message: 'Work log created and booking updated successfully', data: result };
}

async function handleCheckOut(data: any): Promise<HandlerResult> {
    validateId(data?.bookingId, 'bookingId');
    const result = await StaffService.checkOutWorkLog(data.bookingId);
    return { message: 'Staff checked out successfully', data: result };
}

async function handleGetBookingsByDate(data: any): Promise<HandlerResult> {
    const parsed = parseWithSchema(GetBookingsByDateSchema, data);
    const result = await StaffService.getBookingsByDate(
        parsed.staffId,
        parsed.date,
        parsed.page,
        parsed.limit
    );
    return { message: 'Bookings for date retrieved successfully', data: result };
}

async function handleGetMonthlyStats(data: any): Promise<HandlerResult> {
    validateId(data?.staffId, 'staffId');
    const result = await StaffService.getMonthlyStats(data.staffId, data.month, data.year);
    return { message: 'Monthly stats retrieved successfully', data: result };
}

function validateId(value: any, key: string): void {
    if (!Number.isInteger(value) || value <= 0) {
        throw new AppError(
            `Error.Invalid${capitalize(key)}`,
            [{ message: `Invalid ${key}`, path: [key] }],
            { receivedValue: value },
            400
        );
    }
}

function validateUpdateData(data: any, entityType: string): void {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new AppError(
            'Error.InvalidUpdateData',
            [{ message: 'Invalid update data', path: ['data'] }],
            { receivedType: typeof data, entityType },
            400
        );
    }

    if (Object.keys(data).length === 0) {
        throw new AppError(
            'Error.EmptyUpdateData',
            [{ message: 'Update data cannot be empty', path: ['data'] }],
            { entityType },
            400
        );
    }
}

function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}