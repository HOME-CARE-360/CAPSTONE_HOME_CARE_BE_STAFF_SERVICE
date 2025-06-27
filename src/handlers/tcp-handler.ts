import { TCPResponseSuccess } from '../interfaces/tcp-response.interface';
import { CreateInspectionReportDto, UpdateInspectionReportDto, UpdateInspectionStatusDto } from '../schemas/type';
import { StaffService } from '../services/staff.service';

import { AppError } from './error';
import { throwRpcAppError } from './throwRpcAppError';

type HandleTCPReturn<T = any> = TCPResponseSuccess<T>;

export async function handleTCPRequest(payload: any): Promise<HandleTCPReturn> {
    const { type, data } = payload;
    console.log(`[TCP] Incoming: ${type}`, {
        payload: { ...payload, data: data ? '[REDACTED]' : undefined },
    });

    try {
        let responseData: any;
        let message = '';
        let statusCode = 200;

        switch (type) {
            case 'STAFF_GET_BOOKINGS': {
                const { staffId, status, page, limit, fromDate, toDate, keyword } = data;
                validateId(staffId, 'staffId');
                responseData = await StaffService.getBookingsList(staffId, {
                    status,
                    page,
                    limit,
                    fromDate,
                    toDate,
                    keyword,
                });
                message = 'Staff bookings retrieved successfully';
                break;
            }


            case 'STAFF_GET_BOOKING_DETAIL': {
                const { bookingId } = data;
                validateId(bookingId, 'bookingId');
                responseData = await StaffService.getBookingDetail(bookingId);
                message = 'Booking detail retrieved successfully';
                break;
            }

            case 'STAFF_CREATE_INSPECTION_REPORT': {
                validateUpdateData(data, 'inspectionReport');
                responseData = await StaffService.createInspectionReport(data as CreateInspectionReportDto);
                message = 'Inspection report created successfully';
                break;
            }
            case 'STAFF_GET_REVIEWS': {
                const { staffId, page, limit, rating, fromDate, toDate } = data;

                validateId(staffId, 'staffId');
                responseData = await StaffService.getReviews(staffId, {
                    page,
                    limit,
                    rating,
                    fromDate,
                    toDate,
                });

                message = 'Staff reviews retrieved successfully';
                break;
            }


            case 'STAFF_GET_INSPECTION_REPORTS': {
                const { staffId } = data;
                validateId(staffId, 'staffId');
                responseData = await StaffService.getInspectionReportsByStaff(staffId);
                message = 'Inspection reports retrieved successfully';
                break;
            }

            case 'STAFF_GET_INSPECTION_DETAIL': {
                const { inspectionId } = data;
                validateId(inspectionId, 'inspectionId');
                responseData = await StaffService.getInspectionReportById(inspectionId);
                message = 'Inspection report detail retrieved successfully';
                break;
            }

            case 'UPDATE_INSPECTION_REPORT': {
                const { inspectionId, dataInspection } = data;
                validateId(inspectionId, 'inspectionId');
                validateUpdateData(data, 'inspectionReport');
                responseData = await StaffService.updateInspectionReport(inspectionId, dataInspection as UpdateInspectionReportDto);
                message = 'Inspection report updated successfully';
                break;
            }

            case 'STAFF_GET_WORK_LOGS': {
                const { staffId } = data;
                validateId(staffId, 'staffId');
                responseData = await StaffService.getRecentWorkLogs(staffId);
                message = 'Recent work logs retrieved successfully';
                break;
            }

            case 'STAFF_GET_PERFORMANCE': {
                const { staffId } = data;
                validateId(staffId, 'staffId');
                responseData = await StaffService.getStaffPerformanceById(staffId);
                message = 'Staff performance retrieved successfully';
                break;
            }

            case 'STAFF_GET_REVIEW_SUMMARY': {
                const { staffId } = data;
                validateId(staffId, 'staffId');
                responseData = await StaffService.getReviewSummary(staffId);
                message = 'Review summary retrieved successfully';
                break;
            }

            case 'STAFF_CREATE_WORK_LOG': {
                const { staffId, bookingId } = data;
                validateId(staffId, 'staffId');
                validateId(bookingId, 'bookingId');
                responseData = await StaffService.createWorkLogWithStatusUpdate(staffId, bookingId);
                message = 'Work log created and booking updated successfully';
                break;
            }

            case 'STAFF_CHECK_OUT': {
                const { bookingId } = data;
                validateId(bookingId, 'bookingId');
                responseData = await StaffService.checkOutWorkLog(bookingId);
                message = 'Staff checked out successfully';
                break;
            }

            case 'STAFF_GET_BOOKINGS_BY_DATE': {
                const { staffId, date, page = 1, limit = 10 } = data;

                validateId(staffId, 'staffId');

                if (!date || isNaN(Date.parse(date))) {
                    throw new AppError(
                        'Invalid date format',
                        [{ message: 'InvalidDate', path: ['date'] }],
                        {},
                        400
                    );
                }

                responseData = await StaffService.getBookingsByDate(staffId, date, page, limit);
                message = 'Bookings for date retrieved successfully';
                break;
            }


            case 'STAFF_GET_MONTHLY_STATS': {
                const { staffId, month, year } = data;
                validateId(staffId, 'staffId');
                if (![month, year].every(n => typeof n === 'number' && n > 0)) throw new AppError('Invalid month/year', [{ message: 'InvalidMonthYear', path: [] }], {}, 400);
                responseData = await StaffService.getMonthlyStats(staffId, month, year);
                message = 'Monthly stats retrieved successfully';
                break;
            }

            default:
                throw new AppError(
                    'Error.UnknownRequestType',
                    [{ message: 'Unknown request type', path: ['type'] }],
                    { receivedType: type },
                    400
                );
        }

        return {
            success: true,
            code: 'SUCCESS',
            message,
            data: responseData,
            statusCode,
            timestamp: new Date().toISOString(),
        };
    } catch (err: any) {
        console.error(`[TCP] ${payload?.type ?? 'Unknown'} Failed:`, {
            name: err?.name || 'Unknown',
            message: err?.message || 'No message',
            code: err?.code || 'NO_CODE',
            statusCode: err?.statusCode || 500,
            stack: err?.stack?.split('\n').slice(0, 3).join('\n'),
        });

        if (err instanceof AppError) {
            throwRpcAppError(err);
        }

        const unexpectedError = new AppError(
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
        );

        throwRpcAppError(unexpectedError);
    }
}

// ──────────────────────────────
// Helpers
// ──────────────────────────────

function validateId(value: any, field: string): void {
    if (!value || typeof value !== 'number' || Number.isNaN(value) || value <= 0) {
        throw new AppError(
            `Error.Invalid${capitalize(field)}`,
            [{ message: `Invalid ${field}`, path: [field] }],
            {
                receivedValue: value,
                receivedType: typeof value,
            },
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
