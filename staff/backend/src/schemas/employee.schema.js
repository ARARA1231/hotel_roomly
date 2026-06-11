import { z } from 'zod';

export const employeeCreateSchema = z.object({
  firstName: z.string().min(2).max(60),
  lastName: z.string().min(2).max(60),
  email: z.string().email(),
  phone: z.string().min(5).max(30),
  position: z.string().min(2).max(100),
  departmentId: z.string().min(2),
  hotelId: z.string().min(2),
  status: z.enum(['active', 'vacation', 'sick', 'dismissed']).default('active'),
  hiredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  salary: z.number().int().min(0),
  skills: z.array(z.string().min(2).max(40)).default([])
});

export const employeeUpdateSchema = employeeCreateSchema.partial().refine(value => Object.keys(value).length > 0, {
  message: 'Передайте хотя бы одно поле для обновления'
});
