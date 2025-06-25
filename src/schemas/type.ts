

import { z } from 'zod';
import { CreateInspectionReportSchema, GetStaffBookingsQuerySchema, updateInspectionReportSchema, UpdateInspectionStatusSchema } from './app.schema';

export type GetStaffBookingsQueryDto = z.infer<typeof GetStaffBookingsQuerySchema>;
export type UpdateInspectionStatusDto = z.infer<typeof UpdateInspectionStatusSchema>;
export type CreateInspectionReportDto = z.infer<typeof CreateInspectionReportSchema>;
export type UpdateInspectionReportDto = z.infer<typeof updateInspectionReportSchema>;