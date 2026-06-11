import { z } from 'zod';

const absenceBaseSchema = z.object({
  employeeId: z.string().min(2),
  type: z.enum(['vacation', 'sick', 'day_off']),
  startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['pending', 'approved', 'rejected']).default('pending'),
  comment: z.string().max(500).optional().default('')
});

function validateDates(value) {
  if (!value.startsAt || !value.endsAt) return true;
  return new Date(value.endsAt) >= new Date(value.startsAt);
}

export const absenceCreateSchema = absenceBaseSchema.refine(validateDates, {
  message: 'Дата окончания должна быть не раньше даты начала',
  path: ['endsAt']
});

export const absenceUpdateSchema = absenceBaseSchema.partial()
  .refine(value => Object.keys(value).length > 0, {
    message: 'Передайте хотя бы одно поле для обновления'
  })
  .refine(validateDates, {
    message: 'Дата окончания должна быть не раньше даты начала',
    path: ['endsAt']
  });
