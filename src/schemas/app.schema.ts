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

