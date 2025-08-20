import { z } from "zod";
import { InspectionStatusSchema } from "./core.schema";

// ─────────────────────────────
// 1. Simple Optional Filter
// ─────────────────────────────
export const GetStaffBookingsQuerySchema = z.object({
  status: z.string().optional(),
});

// ─────────────────────────────
// 2. Create Inspection Report
// ─────────────────────────────
export const CreateInspectionReportSchema = z.object({
  bookingId: z.number().int().positive({
    message: "bookingId must be a positive integer",
  }),
  staffId: z.number().int().positive({
    message: "staffId must be a positive integer",
  }),
  estimatedTime: z
    .number()
    .int()
    .min(1, { message: "estimatedTime must be at least 1 minute" })
    .max(600, { message: "estimatedTime must not exceed 600 minutes" })
    .optional(),
  note: z
    .string()
    .max(1000, { message: "note must not exceed 1000 characters" })
    .optional(),
  images: z
    .array(z.string().url({ message: "each image must be a valid URL" }))
    .default([]),
  assetIds: z
    .array(z.number().int().positive())
    .nonempty({ message: "assetIds cannot be empty if provided" })
    .optional(),
});

// ─────────────────────────────
// 3. Update Inspection Status
// ─────────────────────────────
export const UpdateInspectionStatusSchema = z.object({
  bookingId: z.number().int().positive(),
  inspectionStatus: InspectionStatusSchema,
  inspectionNote: z.string().optional(),
});

// ─────────────────────────────
// 4. Update Inspection Report
// ─────────────────────────────
export const updateInspectionReportSchema = z.object({
  note: z.string().optional(),
  images: z.array(z.string().url()).optional(),
  estimatedTime: z.number().int().min(1).max(600).optional(),
});

// ─────────────────────────────
// 5. Get Bookings List
// ─────────────────────────────
export const GetBookingsListSchema = z.object({
  staffId: z.coerce.number().int().positive(),
  status: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  keyword: z.string().optional(),
});

// ─────────────────────────────
// 7. Get Reviews
// ─────────────────────────────
export const GetReviewsSchema = z.object({
  staffId: z.coerce.number().int().positive(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

// ─────────────────────────────
// 8. Get Recent Work Logs
// ─────────────────────────────
export const GetRecentWorkLogsSchema = z.object({
  staffId: z.coerce.number().int().positive(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
});

// ─────────────────────────────
// 9. Get Inspection Reports
// ─────────────────────────────
export const GetInspectionReportsSchema = z.object({
  staffId: z.coerce.number().int().positive(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
});

// ─────────────────────────────
// 10. Get Bookings By Date
// ─────────────────────────────
export const GetBookingsByDateSchema = z.object({
  staffId: z.coerce.number().int().positive(),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format",
  }),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
});
