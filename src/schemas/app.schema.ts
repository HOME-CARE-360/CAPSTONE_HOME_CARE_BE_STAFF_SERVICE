import { inspect } from 'util';
import { z } from 'zod';
import { InspectionStatus } from '../generated/prisma';
import { InspectionStatusSchema } from './core.schema';

export const GetStaffBookingsQuerySchema = z.object({
    status: z.string().optional()
});

export const CreateInspectionReportSchema = z.object({
    bookingId: z.number().int(),
    staffId: z.number().int(),
    estimatedTime: z.number().int().optional(),
    note: z.string().optional(),
    images: z.array(z.string().url()),
})

export const UpdateInspectionStatusSchema = z.object({
    bookingId: z.number().int(),
    inspectionStatus: InspectionStatusSchema,
    inspectionNote: z.string().optional()
});

export const updateInspectionReportSchema = z.object({
    note: z.string().optional(),
    images: z.array(z.string().url()).optional(),
    estimatedTime: z.number().int().min(1).max(600).optional(),
});

export const GetBookingsListSchema = z.object({
    staffId: z.coerce.number().int().positive(),
    status: z.string().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().default(10),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
    keyword: z.string().optional(),
});

export const GetBookingDetailSchema = z.object({
    bookingId: z.coerce.number().int().positive(),
    staffId: z.coerce.number().int().positive(),
});

export const GetReviewsSchema = z.object({
    staffId: z.coerce.number().int().positive(),
    rating: z.coerce.number().int().min(1).max(5).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().default(10),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
});
export const GetRecentWorkLogsSchema = z.object({
    staffId: z.coerce.number().int().positive(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().default(10),
});

export const GetInspectionReportsSchema = z.object({
    staffId: z.coerce.number().int().positive(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().default(10),
});

export const GetBookingsByDateSchema = z.object({
    staffId: z.coerce.number().int().positive(),
    date: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: 'Invalid date format',
    }),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().default(10),
});

export const GetMonthlyStatsSchema = z.object({
    staffId: z.coerce.number().int().positive(),
    month: z.coerce.number().int().min(1).max(12),
    year: z.coerce.number().int().min(2020),
});
