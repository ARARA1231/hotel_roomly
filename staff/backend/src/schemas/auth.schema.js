import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Укажите корректный email'),
  password: z.string().min(8, 'Пароль должен содержать не менее 8 символов')
});
