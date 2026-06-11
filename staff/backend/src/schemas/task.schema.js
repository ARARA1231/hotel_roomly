import { z } from 'zod';

export const taskCreateSchema = z.object({
  title: z.string().min(3).max(150),
  description: z.string().max(1000).optional().default(''),
  employeeId: z.string().min(2),
  hotelId: z.string().min(2),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  status: z.enum(['open', 'in_progress', 'done', 'cancelled']).default('open'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

export const taskUpdateSchema = taskCreateSchema.partial().refine(value => Object.keys(value).length > 0, {
  message: 'Передайте хотя бы одно поле для обновления'
});
