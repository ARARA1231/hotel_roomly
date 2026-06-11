const { z } = require('zod');

const email = z.string().trim().email('Некорректный email').max(160);
const phone = z.string().trim().min(5, 'Телефон слишком короткий').max(40, 'Телефон слишком длинный').optional().or(z.literal(''));
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата должна быть в формате YYYY-MM-DD');
const status = z.enum(['active', 'inactive', 'archived']);
const bookingStatus = z.enum(['pending', 'confirmed', 'cancelled', 'completed']);
const supportStatus = z.enum(['new', 'in_progress', 'resolved', 'closed']);

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Имя должно быть не короче 2 символов').max(80),
  email,
  phone,
  password: z.string().min(8, 'Пароль должен быть не короче 8 символов').max(80)
});

const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Введите пароль')
});

const userUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone,
  password: z.string().min(8, 'Пароль должен быть не короче 8 символов').max(80).optional()
});

const adminUserUpdateSchema = userUpdateSchema.extend({
  role: z.enum(['user', 'staff', 'admin']).optional()
});

const hotelBaseSchema = z.object({
  name: z.string().trim().min(2, 'Название отеля слишком короткое').max(100),
  city: z.string().trim().min(2, 'Введите город').max(80),
  country: z.string().trim().min(2, 'Введите страну').max(80),
  full: z.string().trim().min(2).max(180).optional(),
  pricePerNight: z.coerce.number().int().min(500, 'Цена должна быть не меньше 500').max(1000000),
  currency: z.string().trim().min(3).max(8).default('RUB'),
  beds: z.coerce.number().int().min(1).max(20),
  maxGuests: z.coerce.number().int().min(1).max(30),
  roomsAvailable: z.coerce.number().int().min(1).max(500),
  rating: z.coerce.number().min(1).max(5).default(4.5),
  image: z.string().trim().min(1).max(260),
  gallery: z.array(z.string().trim().min(1).max(260)).min(1).max(10).default([]),
  amenities: z.array(z.string().trim().min(2).max(40)).min(1).max(30),
  description: z.string().trim().min(30, 'Описание должно быть не короче 30 символов').max(3000),
  status: status.default('active')
});

const hotelCreateSchema = hotelBaseSchema;
const hotelUpdateSchema = hotelBaseSchema.partial().refine((value) => Object.keys(value).length > 0, 'Передайте хотя бы одно поле для обновления');

const bookingSchema = z.object({
  hotelId: z.string().trim().min(2).max(100),
  guestName: z.string().trim().min(2, 'Введите имя гостя').max(80),
  email,
  phone,
  guests: z.coerce.number().int().min(1).max(12),
  checkIn: dateOnly,
  checkOut: dateOnly
});

const bookingIntegrationStatusSchema = z.object({
  status: bookingStatus
});

const bookingUpdateSchema = z.object({
  guestName: z.string().trim().min(2).max(80).optional(),
  email: email.optional(),
  phone,
  guests: z.coerce.number().int().min(1).max(12).optional(),
  checkIn: dateOnly.optional(),
  checkOut: dateOnly.optional(),
  status: bookingStatus.optional(),
  accessToken: z.string().trim().min(10).max(200).optional()
}).refine((value) => Object.keys(value).some((key) => key !== 'accessToken'), 'Передайте хотя бы одно поле для обновления');

const supportSchema = z.object({
  name: z.string().trim().min(2, 'Введите имя').max(80),
  email,
  message: z.string().trim().min(10, 'Сообщение должно быть не короче 10 символов').max(2000)
});

const supportUpdateSchema = z.object({
  status: supportStatus.optional(),
  managerComment: z.string().trim().max(1000).optional()
}).refine((value) => Object.keys(value).length > 0, 'Передайте хотя бы одно поле для обновления');

const supportPublicQuerySchema = z.object({
  accessToken: z.string().trim().min(20, 'Некорректный токен доступа').max(120)
});

const supportCustomerMessageSchema = z.object({
  accessToken: z.string().trim().min(20, 'Некорректный токен доступа').max(120),
  message: z.string().trim().min(2, 'Введите сообщение').max(2000, 'Сообщение слишком длинное')
});

const supportAuthMessageSchema = z.object({
  message: z.string().trim().min(2, 'Введите сообщение').max(2000, 'Сообщение слишком длинное')
});

const supportStaffMessageSchema = z.object({
  authorName: z.string().trim().min(2).max(120).optional(),
  authorId: z.string().trim().max(120).optional(),
  message: z.string().trim().min(2, 'Введите ответ').max(2000, 'Ответ слишком длинный'),
  status: supportStatus.optional()
});

const supportIntegrationStatusSchema = z.object({
  status: supportStatus
});

const hotelQuerySchema = z.object({
  city: z.string().trim().max(80).optional(),
  location: z.string().trim().max(80).optional(),
  country: z.string().trim().max(80).optional(),
  q: z.string().trim().max(120).optional(),
  guests: z.coerce.number().int().min(1).max(12).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  budget: z.enum(['low', 'mid', 'high']).optional(),
  checkIn: dateOnly.optional(),
  checkOut: dateOnly.optional(),
  includeInactive: z.coerce.boolean().optional()
});

const listQuerySchema = z.object({
  status: z.string().trim().max(40).optional(),
  q: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).max(10000).optional()
});

const auditQuerySchema = z.object({
  event: z.string().trim().max(80).optional(),
  actorRole: z.string().trim().max(40).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100)
});

module.exports = {
  registerSchema,
  loginSchema,
  userUpdateSchema,
  adminUserUpdateSchema,
  hotelCreateSchema,
  hotelUpdateSchema,
  bookingSchema,
  bookingIntegrationStatusSchema,
  bookingUpdateSchema,
  supportSchema,
  supportUpdateSchema,
  supportPublicQuerySchema,
  supportCustomerMessageSchema,
  supportAuthMessageSchema,
  supportStaffMessageSchema,
  supportIntegrationStatusSchema,
  hotelQuerySchema,
  listQuerySchema,
  auditQuerySchema
};
