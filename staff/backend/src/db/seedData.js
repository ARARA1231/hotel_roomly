import { createId, nowIso } from '../utils/id.js';
import { hashPassword } from '../utils/password.js';

export function createSeedData() {
  const hotels = [
    { id: 'ikeja-lagos', name: 'Ikeja, Лагос', city: 'Лагос', country: 'Нигерия', isActive: true },
    { id: 'jabi-dubai', name: 'Jabi, Дубай', city: 'Дубай', country: 'ОАЭ', isActive: true },
    { id: 'arara-lagos', name: 'Arara, Лагос', city: 'Лагос', country: 'Нигерия', isActive: true },
    { id: 'lekki-paris', name: 'Lekki, Париж', city: 'Париж', country: 'Франция', isActive: true },
    { id: 'ikeja-london', name: 'Ikeja, Лондон', city: 'Лондон', country: 'Великобритания', isActive: true }
  ];

  const departments = [
    { id: 'dep_reception', name: 'Ресепшен', hotelId: 'ikeja-lagos' },
    { id: 'dep_housekeeping', name: 'Хаускипинг', hotelId: 'ikeja-lagos' },
    { id: 'dep_security', name: 'Безопасность', hotelId: 'jabi-dubai' },
    { id: 'dep_service', name: 'Гостевой сервис', hotelId: 'lekki-paris' },
    { id: 'dep_hr', name: 'Управление персоналом', hotelId: 'ikeja-lagos' }
  ];

  const employees = [
    {
      id: 'emp_admin', firstName: 'Олег', lastName: 'Смирнов', email: 'admin@roomly.local', phone: '+7 900 100-10-10',
      position: 'Администратор системы', departmentId: 'dep_hr', hotelId: 'ikeja-lagos', status: 'active',
      hiredAt: '2024-02-01', salary: 120000, skills: ['управление', 'безопасность']
    },
    {
      id: 'emp_manager', firstName: 'Марина', lastName: 'Орлова', email: 'manager@roomly.local', phone: '+7 900 100-10-11',
      position: 'Менеджер отеля', departmentId: 'dep_reception', hotelId: 'ikeja-lagos', status: 'active',
      hiredAt: '2024-04-12', salary: 95000, skills: ['смены', 'гости']
    },
    {
      id: 'emp_hr', firstName: 'Анна', lastName: 'Крылова', email: 'hr@roomly.local', phone: '+7 900 100-10-12',
      position: 'HR-специалист', departmentId: 'dep_hr', hotelId: 'ikeja-lagos', status: 'active',
      hiredAt: '2024-06-03', salary: 87000, skills: ['кадры', 'адаптация']
    },
    {
      id: 'emp_reception_1', firstName: 'Иван', lastName: 'Петров', email: 'ivan.petrov@roomly.local', phone: '+7 900 100-10-13',
      position: 'Администратор ресепшен', departmentId: 'dep_reception', hotelId: 'ikeja-lagos', status: 'active',
      hiredAt: '2025-01-17', salary: 68000, skills: ['регистрация гостей', 'касса']
    },
    {
      id: 'emp_housekeeping_1', firstName: 'Елена', lastName: 'Соколова', email: 'elena.sokolova@roomly.local', phone: '+7 900 100-10-14',
      position: 'Старшая горничная', departmentId: 'dep_housekeeping', hotelId: 'ikeja-lagos', status: 'vacation',
      hiredAt: '2023-11-20', salary: 62000, skills: ['уборка', 'контроль качества']
    }
  ];

  const users = [
    { id: 'user_admin', employeeId: 'emp_admin', name: 'Олег Смирнов', email: 'admin@roomly.local', role: 'admin', passwordHash: hashPassword('Admin12345'), isActive: true },
    { id: 'user_staff', employeeId: 'emp_reception_1', name: 'Иван Петров', email: 'ivan.petrov@roomly.local', role: 'staff', passwordHash: hashPassword('Admin12345'), isActive: true }
  ];

  const today = new Date();
  const day = today.toISOString().slice(0, 10);
  const tomorrow = new Date(today.getTime() + 86400000).toISOString().slice(0, 10);

  const shifts = [
    { id: 'shift_1', employeeId: 'emp_reception_1', hotelId: 'ikeja-lagos', startsAt: `${day}T08:00:00.000Z`, endsAt: `${day}T20:00:00.000Z`, role: 'Ресепшен', status: 'planned', note: 'Дневная смена' },
    { id: 'shift_2', employeeId: 'emp_manager', hotelId: 'ikeja-lagos', startsAt: `${day}T10:00:00.000Z`, endsAt: `${day}T18:00:00.000Z`, role: 'Менеджер', status: 'planned', note: 'Контроль загрузки' },
    { id: 'shift_3', employeeId: 'emp_housekeeping_1', hotelId: 'ikeja-lagos', startsAt: `${tomorrow}T07:00:00.000Z`, endsAt: `${tomorrow}T15:00:00.000Z`, role: 'Хаускипинг', status: 'planned', note: 'После отпуска подтвердить выход' }
  ];

  const tasks = [
    { id: 'task_1', title: 'Проверить заселение группы гостей', description: 'Подготовить стойку регистрации и проверить документы.', employeeId: 'emp_reception_1', hotelId: 'ikeja-lagos', priority: 'high', status: 'open', dueDate: day, createdBy: 'user_admin' },
    { id: 'task_2', title: 'Сверить график смен на неделю', description: 'Проверить отсутствие пересечений и нехватки персонала.', employeeId: 'emp_hr', hotelId: 'ikeja-lagos', priority: 'medium', status: 'in_progress', dueDate: tomorrow, createdBy: 'user_admin' },
    { id: 'task_3', title: 'Обновить список сотрудников', description: 'Проверить контакты и должности.', employeeId: 'emp_hr', hotelId: 'ikeja-lagos', priority: 'low', status: 'done', dueDate: day, createdBy: 'user_admin' }
  ];

  const absenceRequests = [
    { id: 'absence_1', employeeId: 'emp_housekeeping_1', type: 'vacation', startsAt: '2026-06-02', endsAt: '2026-06-08', status: 'approved', comment: 'Плановый отпуск' }
  ];

  return {
    meta: { version: 2, createdAt: nowIso(), product: 'Roomly Staff Management' },
    hotels,
    departments,
    employees,
    users,
    shifts,
    tasks,
    absenceRequests,
    audit: [
      { id: createId('audit'), userId: 'system', action: 'seed.create', entity: 'database', entityId: 'initial', at: nowIso(), ip: 'local', meta: { message: 'Initial database created' } }
    ]
  };
}
