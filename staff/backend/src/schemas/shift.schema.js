import { z } from 'zod';

const isoDateTime = z.string().datetime({ message: 'Дата должна быть в ISO-формате' });

const shiftBaseSchema = z.object({
  employeeId: z.string().min(2),
  hotelId: z.string().min(2),
  startsAt: isoDateTime,
  endsAt: isoDateTime,
  role: z.string().min(2).max(100),
  status: z.enum(['planned', 'started', 'finished', 'cancelled']).default('planned'),
  note: z.string().max(500).optional().default('')
});

function validateDates(value) {
  if (!value.startsAt || !value.endsAt) return true;
  return new Date(value.endsAt) > new Date(value.startsAt);
}

export const shiftCreateSchema = shiftBaseSchema.refine(validateDates, {
  message: 'Окончание смены должно быть позже начала',
  path: ['endsAt']
});

export const shiftUpdateSchema = shiftBaseSchema.partial()
  .refine(value => Object.keys(value).length > 0, {
    message: 'Передайте хотя бы одно поле для обновления'
  })
  .refine(validateDates, {
    message: 'Окончание смены должно быть позже начала',
    path: ['endsAt']
  });
