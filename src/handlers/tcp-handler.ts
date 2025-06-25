import { TCPResponseSuccess } from '../interfaces/tcp-response.interface';
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
                const { staffId, status, page, limit } = payload;

                validateId(staffId, 'staffId');

                responseData = await StaffService.getBookingsList(staffId, {
                    status,
                    page,
                    limit,
                });

                message = 'Staff bookings retrieved successfully';
                break;
            }

            case 'STAFF_GET_BOOKING_DETAIL': {
                const { bookingId } = payload;
                validateId(bookingId, 'bookingId');
                responseData = await StaffService.getBookingDetail(bookingId);
                message = 'Booking detail retrieved successfully';
                break;
            }

            case 'STAFF_UPDATE_INSPECTION_STATUS': {
                validateUpdateData(data, 'inspectionStatus');
                responseData = await StaffService.updateInspectionStatus(data);
                message = 'Inspection status updated successfully';
                break;
            }

            case 'STAFF_CREATE_INSPECTION_REPORT': {
                validateUpdateData(data, 'inspectionReport');
                responseData = await StaffService.createInspectionReport(data);
                message = 'Inspection report created successfully';
                break;
            }

            case 'STAFF_GET_REVIEWS': {
                const { staffId } = payload;
                validateId(staffId, 'staffId');
                responseData = await StaffService.getReviews(staffId);
                message = 'Staff reviews retrieved successfully';
                break;
            }

            case 'STAFF_GET_INSPECTION_REPORTS': {
                const { staffId } = payload;
                validateId(staffId, 'staffId');

                responseData = await StaffService.getInspectionReportsByStaff(staffId);
                message = 'Inspection reports retrieved successfully';
                break;
            }

            case 'STAFF_GET_INSPECTION_DETAIL': {
                const { bookingId } = payload;
                validateId(bookingId, 'bookingId');

                responseData = await StaffService.getInspectionReportByBooking(bookingId);
                message = 'Inspection report detail retrieved successfully';
                break;
            }

            case 'UPDATE_INSPECTION_REPORT': {
                const { bookingId, data } = payload;
                validateId(bookingId, 'bookingId');
                validateUpdateData(data, 'inspectionReport');

                responseData = await StaffService.updateInspectionReport(bookingId, data);
                message = 'Inspection report updated successfully';
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
