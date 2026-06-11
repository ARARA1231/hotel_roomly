const API_URL = window.ROOMLY_STAFF_API_URL || 'http://127.0.0.1:3100/api';

const state = {
  token: localStorage.getItem('roomlyStaffToken'),
  user: null,
  hotels: [],
  departments: [],
  employees: [],
  shifts: [],
  tasks: [],
  bookings: [],
  supportTickets: [],
  selectedSupportTicketId: null
};

const views = Array.from(document.querySelectorAll('.view'));
const links = Array.from(document.querySelectorAll('.nav-link'));
const loginCard = document.getElementById('loginCard');
const appContent = document.getElementById('appContent');
const logoutButton = document.getElementById('logoutButton');
const toast = document.getElementById('toast');

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => { toast.hidden = true; }, 3500);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });
}

function formatPrice(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return '—';
  return new Intl.NumberFormat('ru-RU').format(number) + ' ₽';
}

function statusText(value) {
  const map = {
    active: 'Активен', vacation: 'Отпуск', sick: 'Больничный', dismissed: 'Уволен',
    planned: 'Запланирована', started: 'Начата', finished: 'Завершена', cancelled: 'Отменено',
    new: 'Новое', open: 'Открыта', in_progress: 'В работе', done: 'Готово', resolved: 'Решено', closed: 'Закрыто',
    low: 'Низкий', medium: 'Средний', high: 'Высокий', pending: 'Ожидает', confirmed: 'Подтверждено', completed: 'Завершено'
  };
  return map[value] || value || '—';
}

function isAdmin() {
  return state.user?.role === 'admin';
}

function canOpenPage(page) {
  if (!state.user && page !== 'overview') return false;
  if (['shifts', 'audit'].includes(page)) return isAdmin();
  return true;
}

function showPage(page) {
  let targetPage = page || 'overview';
  if (!canOpenPage(targetPage)) {
    targetPage = 'forbidden';
    showToast('Недостаточно прав для раздела');
  }
  const target = document.getElementById(targetPage) || document.getElementById('overview');
  views.forEach(view => view.classList.toggle('active', view === target));
  links.forEach(link => link.classList.toggle('active', link.dataset.page === target.id));
  document.title = `Roomly Staff — ${target.dataset.title || 'Главная'}`;
}

function applyRoleUi() {
  const admin = isAdmin();
  document.querySelectorAll('[data-admin-only], [data-admin-only-section]').forEach(element => {
    element.hidden = !admin;
  });
  if (!admin && ['shifts', 'audit'].includes(location.hash.replace('#', ''))) {
    history.replaceState(null, '', '#forbidden');
    showPage('forbidden');
  }
}

async function api(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(state.token ? { authorization: `Bearer ${state.token}` } : {}),
      ...(options.headers || {})
    }
  });
  const body = await response.json().catch(() => ({ ok: false, error: { message: 'Некорректный ответ сервера' } }));
  if (!response.ok || body.ok === false) {
    throw new Error(body.error?.message || 'Ошибка запроса');
  }
  return body.data;
}

function employeeName(employee) {
  if (!employee) return 'Не назначен';
  return `${employee.firstName} ${employee.lastName}`;
}

function setOptions(select, items, getValue, getLabel) {
  if (!select) return;
  select.innerHTML = items.length
    ? items.map(item => `<option value="${escapeHtml(getValue(item))}">${escapeHtml(getLabel(item))}</option>`).join('')
    : '<option value="">Нет доступных данных</option>';
}

function selectedHotelId(selectId) {
  return document.getElementById(selectId)?.value || state.hotels[0]?.id || '';
}

function refreshDepartmentOptions() {
  const hotelId = selectedHotelId('employeeHotelSelect');
  const departments = state.departments.filter(item => item.hotelId === hotelId);
  setOptions(document.getElementById('employeeDepartmentSelect'), departments, item => item.id, item => item.name);
}

function refreshEmployeeOptions(selectId, hotelSelectId) {
  const hotelId = selectedHotelId(hotelSelectId);
  const employees = state.employees.filter(item => item.hotelId === hotelId && item.status === 'active');
  setOptions(document.getElementById(selectId), employees, item => item.id, item => employeeName(item));
}

function refreshDependentSelects() {
  refreshDepartmentOptions();
  refreshEmployeeOptions('shiftEmployeeSelect', 'shiftHotelSelect');
  refreshEmployeeOptions('taskEmployeeSelect', 'taskHotelSelect');
}

function renderDashboard(data) {
  document.getElementById('metricEmployees').textContent = data.metrics.employeesTotal;
  document.getElementById('metricActive').textContent = data.metrics.activeEmployees;
  document.getElementById('metricShifts').textContent = data.metrics.shiftsToday;
  document.getElementById('metricTasks').textContent = data.metrics.openTasks;
  document.getElementById('metricBookings').textContent = state.bookings.filter(item => ['pending', 'confirmed'].includes(item.status)).length;
  document.getElementById('metricSupport').textContent = state.supportTickets.filter(item => ['new', 'in_progress'].includes(item.status)).length;

  document.getElementById('overviewShifts').innerHTML = data.latestShifts.length
    ? data.latestShifts.map(shift => {
        const employee = shift.employee || state.employees.find(item => item.id === shift.employeeId);
        return `<div><span>${escapeHtml(employeeName(employee))}</span><b>${escapeHtml(formatDateTime(shift.startsAt))}</b></div>`;
      }).join('')
    : '<div><span>Смен пока нет</span><b></b></div>';

  document.getElementById('overviewTasks').innerHTML = data.latestTasks.length
    ? data.latestTasks.map(task => `<div><span>${escapeHtml(task.title)}</span><b>${escapeHtml(statusText(task.status))}</b></div>`).join('')
    : '<div><span>Задач пока нет</span><b></b></div>';

  document.getElementById('overviewBookings').innerHTML = state.bookings.length
    ? state.bookings.slice(0, 5).map(booking => `<div><span>${escapeHtml(booking.guestName || booking.email)}</span><b>${escapeHtml(statusText(booking.status))}</b></div>`).join('')
    : '<div><span>Бронирований пока нет</span><b></b></div>';

  document.getElementById('overviewSupport').innerHTML = state.supportTickets.length
    ? state.supportTickets.slice(0, 5).map(ticket => `<div><span>${escapeHtml(ticket.name)}</span><b>${escapeHtml(statusText(ticket.status))}</b></div>`).join('')
    : '<div><span>Обращений пока нет</span><b></b></div>';
}

function renderEmployees() {
  const body = document.getElementById('employeesTable');
  body.innerHTML = state.employees.map(employee => `
    <tr>
      <td><strong>${escapeHtml(employeeName(employee))}</strong><br><small>${escapeHtml(employee.email)}</small></td>
      <td>${escapeHtml(employee.position)}</td>
      <td>${escapeHtml(employee.hotel?.name || '')}</td>
      <td><span class="status ${escapeHtml(employee.status)}">${escapeHtml(statusText(employee.status))}</span></td>
      <td>${isAdmin() ? `<button class="table-action" data-employee-toggle="${escapeHtml(employee.id)}">${employee.status === 'active' ? 'В отпуск' : 'Активировать'}</button>` : '<span class="hint">Просмотр</span>'}</td>
    </tr>`).join('') || '<tr><td colspan="5">Сотрудников нет</td></tr>';
}

function renderShifts() {
  const body = document.getElementById('shiftsTable');
  body.innerHTML = state.shifts.map(shift => `
    <tr>
      <td>${escapeHtml(employeeName(shift.employee))}</td>
      <td>${escapeHtml(shift.hotel?.name || '')}</td>
      <td>${escapeHtml(formatDateTime(shift.startsAt))}</td>
      <td>${escapeHtml(formatDateTime(shift.endsAt))}</td>
      <td><span class="status ${escapeHtml(shift.status)}">${escapeHtml(statusText(shift.status))}</span></td>
    </tr>`).join('') || '<tr><td colspan="5">Смен нет</td></tr>';
}

function filteredTasks() {
  const status = document.getElementById('taskStatusFilter')?.value || '';
  return status ? state.tasks.filter(task => task.status === status) : state.tasks;
}

function renderTasks() {
  const body = document.getElementById('tasksTable');
  body.innerHTML = filteredTasks().map(task => `
    <tr>
      <td><strong>${escapeHtml(task.title)}</strong><br><small>${escapeHtml(task.description || '')}</small></td>
      <td>${escapeHtml(employeeName(task.employee))}</td>
      <td><span class="status ${escapeHtml(task.priority)}">${escapeHtml(statusText(task.priority))}</span></td>
      <td>${escapeHtml(task.dueDate)}</td>
      <td><span class="status ${escapeHtml(task.status)}">${escapeHtml(statusText(task.status))}</span></td>
      <td>${task.status === 'done' ? '<span class="hint">Выполнено</span>' : `<button class="table-action" data-task-done="${escapeHtml(task.id)}">Готово</button>`}</td>
    </tr>`).join('') || '<tr><td colspan="6">Задач нет</td></tr>';
}

function bookingHotelName(booking) {
  return booking.hotel?.full || booking.hotel?.name || booking.hotelId || '—';
}

function bookingActionButtons(booking) {
  const actions = [];
  if (booking.status !== 'confirmed') actions.push(`<button class="table-action" data-booking-status="confirmed" data-booking-id="${escapeHtml(booking.id)}">Подтвердить</button>`);
  if (!['completed', 'cancelled'].includes(booking.status)) actions.push(`<button class="table-action" data-booking-status="completed" data-booking-id="${escapeHtml(booking.id)}">Завершить</button>`);
  if (booking.status !== 'cancelled') actions.push(`<button class="table-action table-action-danger" data-booking-status="cancelled" data-booking-id="${escapeHtml(booking.id)}">Отменить</button>`);
  return actions.join(' ') || '<span class="hint">Нет действий</span>';
}

function renderBookings() {
  const body = document.getElementById('bookingsTable');
  if (!body) return;
  const status = document.getElementById('bookingStatusFilter')?.value || '';
  const query = (document.getElementById('bookingSearch')?.value || '').trim().toLowerCase();
  let items = state.bookings;
  if (status) items = items.filter(item => item.status === status);
  if (query) items = items.filter(item => `${item.guestName} ${item.email} ${item.phone || ''} ${bookingHotelName(item)} ${item.hotelId}`.toLowerCase().includes(query));
  body.innerHTML = items.map(booking => `
    <tr>
      <td><strong>${escapeHtml(booking.guestName)}</strong><br><small>${escapeHtml(booking.email)}${booking.phone ? ' · ' + escapeHtml(booking.phone) : ''}</small></td>
      <td>${escapeHtml(bookingHotelName(booking))}</td>
      <td>${escapeHtml(booking.checkIn)} — ${escapeHtml(booking.checkOut)}<br><small>${escapeHtml(String(booking.guests))} гост., ${escapeHtml(String(booking.nights))} ноч.</small></td>
      <td>${escapeHtml(formatPrice(booking.totalPrice))}</td>
      <td><span class="status ${escapeHtml(booking.status)}">${escapeHtml(statusText(booking.status))}</span></td>
      <td class="table-actions-cell">${bookingActionButtons(booking)}</td>
    </tr>`).join('') || '<tr><td colspan="6">Бронирований нет или основной backend Roomly не запущен.</td></tr>';
}

function lastSupportMessage(ticket) {
  const messages = Array.isArray(ticket.messages) ? ticket.messages : [];
  return messages[messages.length - 1] || { message: ticket.message || '', authorName: ticket.name || 'Клиент', createdAt: ticket.updatedAt || ticket.createdAt };
}

function renderSupportTickets() {
  const body = document.getElementById('supportTable');
  if (!body) return;
  const status = document.getElementById('supportStatusFilter')?.value || '';
  const query = (document.getElementById('supportSearch')?.value || '').trim().toLowerCase();
  let items = state.supportTickets;
  if (status) items = items.filter(ticket => ticket.status === status);
  if (query) items = items.filter(ticket => `${ticket.name} ${ticket.email} ${ticket.message || ''} ${(ticket.messages || []).map(message => message.message).join(' ')}`.toLowerCase().includes(query));

  if (!items.length) {
    body.innerHTML = '<tr><td colspan="5">Обращений пока нет или основной backend Roomly не запущен.</td></tr>';
    renderSupportDialog();
    return;
  }

  body.innerHTML = items.map(ticket => {
    const lastMessage = lastSupportMessage(ticket);
    const selectedClass = ticket.id === state.selectedSupportTicketId ? ' selected-row' : '';
    return `
      <tr class="${selectedClass}">
        <td><strong>${escapeHtml(ticket.name)}</strong><br><small>${escapeHtml(ticket.email)}</small></td>
        <td><span class="status ${escapeHtml(ticket.status)}">${escapeHtml(statusText(ticket.status))}</span></td>
        <td><strong>${escapeHtml(lastMessage.authorName || '')}</strong><br><small>${escapeHtml(lastMessage.message || '')}</small></td>
        <td>${escapeHtml(formatDateTime(ticket.updatedAt || ticket.createdAt))}</td>
        <td><button class="table-action" data-support-open="${escapeHtml(ticket.id)}">Открыть</button></td>
      </tr>`;
  }).join('');
}

function getSelectedSupportTicket() {
  return state.supportTickets.find(ticket => ticket.id === state.selectedSupportTicketId) || null;
}

function renderSupportDialog() {
  const dialog = document.getElementById('supportDialog');
  const form = document.getElementById('supportReplyForm');
  const closeButton = document.getElementById('closeSupportButton');
  if (!dialog || !form || !closeButton) return;

  const ticket = getSelectedSupportTicket();
  if (!ticket) {
    dialog.innerHTML = '<p class="hint">Выберите обращение из списка, чтобы открыть переписку с клиентом.</p>';
    form.hidden = true;
    closeButton.disabled = true;
    return;
  }

  const messages = Array.isArray(ticket.messages) ? ticket.messages : [];
  dialog.innerHTML = `
    <div class="support-dialog-head">
      <strong>${escapeHtml(ticket.name)}</strong>
      <span>${escapeHtml(ticket.email)}</span>
      <small>Статус: ${escapeHtml(statusText(ticket.status))}</small>
    </div>
    <div class="support-messages">
      ${messages.map(message => `
        <article class="support-message ${message.authorRole === 'staff' ? 'staff-message' : 'customer-message'}">
          <div><strong>${escapeHtml(message.authorName)}</strong><small>${escapeHtml(formatDateTime(message.createdAt))}</small></div>
          <p>${escapeHtml(message.message)}</p>
        </article>`).join('') || '<p class="hint">В диалоге пока нет сообщений.</p>'}
    </div>`;

  closeButton.hidden = !isAdmin();
  closeButton.disabled = ticket.status === 'closed' || !isAdmin();
  form.hidden = ticket.status === 'closed';
}

async function loadSupportTickets({ silent = false } = {}) {
  const body = document.getElementById('supportTable');
  try {
    const params = new URLSearchParams();
    const status = document.getElementById('supportStatusFilter')?.value || '';
    const q = document.getElementById('supportSearch')?.value?.trim() || '';
    if (status) params.set('status', status);
    if (q) params.set('q', q);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    state.supportTickets = await api(`/customer-support${suffix}`);
    if (state.selectedSupportTicketId && !state.supportTickets.some(ticket => ticket.id === state.selectedSupportTicketId)) {
      state.selectedSupportTicketId = null;
    }
    renderSupportTickets();
    renderSupportDialog();
  } catch (error) {
    state.supportTickets = [];
    if (body) body.innerHTML = `<tr><td colspan="5">${escapeHtml(error.message)}</td></tr>`;
    renderSupportDialog();
    if (!silent) showToast(error.message);
  }
}

async function loadBookings({ silent = false } = {}) {
  const body = document.getElementById('bookingsTable');
  try {
    const params = new URLSearchParams();
    const status = document.getElementById('bookingStatusFilter')?.value || '';
    const q = document.getElementById('bookingSearch')?.value?.trim() || '';
    if (status) params.set('status', status);
    if (q) params.set('q', q);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    state.bookings = await api(`/bookings${suffix}`);
    renderBookings();
  } catch (error) {
    state.bookings = [];
    if (body) body.innerHTML = `<tr><td colspan="6">${escapeHtml(error.message)}</td></tr>`;
    if (!silent) showToast(error.message);
  }
}

async function renderAudit() {
  const body = document.getElementById('auditTable');
  const mainBody = document.getElementById('mainAuditTable');
  try {
    const rows = await api('/audit?limit=80');
    body.innerHTML = rows.map(row => `
      <tr><td>${escapeHtml(formatDateTime(row.at))}</td><td>${escapeHtml(row.userId)}</td><td>${escapeHtml(row.action)}</td><td>${escapeHtml(row.entity)}: ${escapeHtml(row.entityId)}</td></tr>`).join('') || '<tr><td colspan="4">Записей нет</td></tr>';
  } catch (error) {
    body.innerHTML = `<tr><td colspan="4">${escapeHtml(error.message)}</td></tr>`;
  }

  try {
    const rows = await api('/main-audit?limit=80');
    mainBody.innerHTML = rows.map(row => `
      <tr><td>${escapeHtml(formatDateTime(row.createdAt))}</td><td>${escapeHtml(row.actorRole || '—')}</td><td>${escapeHtml(row.event)}</td><td><small>${escapeHtml(JSON.stringify(row.details || {}))}</small></td></tr>`).join('') || '<tr><td colspan="4">Записей нет</td></tr>';
  } catch (error) {
    mainBody.innerHTML = `<tr><td colspan="4">${escapeHtml(error.message)}</td></tr>`;
  }
}

async function loadBaseData() {
  const [hotels, departments, employees, shifts, tasks] = await Promise.all([
    api('/hotels'),
    api('/departments'),
    api('/employees'),
    api('/shifts'),
    api('/tasks')
  ]);

  state.hotels = hotels;
  state.departments = departments;
  state.employees = employees;
  state.shifts = shifts;
  state.tasks = tasks;

  setOptions(document.getElementById('employeeHotelSelect'), hotels, item => item.id, item => item.name);
  setOptions(document.getElementById('shiftHotelSelect'), hotels, item => item.id, item => item.name);
  setOptions(document.getElementById('taskHotelSelect'), hotels, item => item.id, item => item.name);
  refreshDependentSelects();

  await Promise.all([
    loadBookings({ silent: true }),
    loadSupportTickets({ silent: true })
  ]);

  const dashboard = await api('/dashboard');
  renderDashboard(dashboard);
  renderEmployees();
  renderShifts();
  renderTasks();
  renderBookings();
  renderSupportTickets();
  if (isAdmin()) await renderAudit();
}

async function bootstrap() {
  if (!state.token) {
    loginCard.hidden = false;
    appContent.hidden = true;
    logoutButton.hidden = true;
    applyRoleUi();
    showPage('overview');
    return;
  }

  try {
    const session = await api('/auth/me');
    state.user = session.user;
    loginCard.hidden = true;
    appContent.hidden = false;
    logoutButton.hidden = false;
    applyRoleUi();
    await loadBaseData();
    showPage(location.hash.replace('#', '') || 'overview');
  } catch (error) {
    localStorage.removeItem('roomlyStaffToken');
    state.token = null;
    state.user = null;
    loginCard.hidden = false;
    appContent.hidden = true;
    logoutButton.hidden = true;
    showToast('Сессия истекла. Войдите заново.');
    showPage('overview');
  }
}

links.forEach(link => {
  if (!link.dataset.page) return;
  link.addEventListener('click', event => {
    event.preventDefault();
    const page = link.dataset.page;
    if (!canOpenPage(page)) {
      history.pushState(null, '', '#forbidden');
      showPage('forbidden');
      return;
    }
    history.pushState(null, '', `#${page}`);
    showPage(page);
    if (page === 'support') loadSupportTickets({ silent: true });
    if (page === 'bookings') loadBookings({ silent: true });
    if (page === 'audit' && isAdmin()) renderAudit();
  });
});

document.addEventListener('click', async event => {
  const goPage = event.target.closest('[data-go]')?.dataset.go;
  if (goPage) {
    event.preventDefault();
    if (!canOpenPage(goPage)) {
      history.pushState(null, '', '#forbidden');
      showPage('forbidden');
      return;
    }
    history.pushState(null, '', `#${goPage}`);
    showPage(goPage);
  }

  const employeeId = event.target.dataset.employeeToggle;
  const taskId = event.target.dataset.taskDone;
  const supportId = event.target.dataset.supportOpen;
  const bookingId = event.target.dataset.bookingId;
  const bookingStatus = event.target.dataset.bookingStatus;

  if (employeeId) {
    if (!isAdmin()) { showToast('Статус сотрудника меняет только администратор'); return; }
    const employee = state.employees.find(item => item.id === employeeId);
    const nextStatus = employee.status === 'active' ? 'vacation' : 'active';
    try {
      await api(`/employees/${employeeId}`, { method: 'PATCH', body: JSON.stringify({ status: nextStatus }) });
      showToast('Статус сотрудника изменен');
      await loadBaseData();
    } catch (error) { showToast(error.message); }
  }

  if (taskId) {
    try {
      await api(`/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify({ status: 'done' }) });
      showToast('Задача отмечена выполненной');
      await loadBaseData();
    } catch (error) { showToast(error.message); }
  }

  if (supportId) {
    state.selectedSupportTicketId = supportId;
    renderSupportTickets();
    renderSupportDialog();
  }

  if (bookingId && bookingStatus) {
    try {
      await api(`/bookings/${bookingId}/status`, { method: 'PATCH', body: JSON.stringify({ status: bookingStatus }) });
      showToast('Статус бронирования изменен');
      await loadBookings();
      const dashboard = await api('/dashboard');
      renderDashboard(dashboard);
    } catch (error) { showToast(error.message); }
  }
});

document.getElementById('employeeHotelSelect')?.addEventListener('change', refreshDepartmentOptions);
document.getElementById('shiftHotelSelect')?.addEventListener('change', () => refreshEmployeeOptions('shiftEmployeeSelect', 'shiftHotelSelect'));
document.getElementById('taskHotelSelect')?.addEventListener('change', () => refreshEmployeeOptions('taskEmployeeSelect', 'taskHotelSelect'));
document.getElementById('taskStatusFilter')?.addEventListener('change', renderTasks);
document.getElementById('bookingStatusFilter')?.addEventListener('change', () => loadBookings({ silent: true }));
document.getElementById('bookingSearch')?.addEventListener('input', () => renderBookings());
document.getElementById('supportStatusFilter')?.addEventListener('change', () => loadSupportTickets({ silent: true }));
document.getElementById('supportSearch')?.addEventListener('input', () => renderSupportTickets());
document.getElementById('refreshBookingsButton')?.addEventListener('click', () => loadBookings());
document.getElementById('refreshSupportButton')?.addEventListener('click', () => loadSupportTickets());

document.getElementById('loginForm')?.addEventListener('submit', async event => {
  event.preventDefault();
  const formElement = event.currentTarget;
  const form = new FormData(formElement);
  try {
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: form.get('email'), password: form.get('password') })
    });
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('roomlyStaffToken', state.token);
    showToast('Вход выполнен');
    await bootstrap();
  } catch (error) {
    showToast(error.message);
  }
});

logoutButton?.addEventListener('click', () => {
  localStorage.removeItem('roomlyStaffToken');
  state.token = null;
  location.reload();
});

document.getElementById('employeeForm')?.addEventListener('submit', async event => {
  event.preventDefault();
  if (!isAdmin()) { showToast('Добавлять сотрудников может только администратор'); return; }
  const formElement = event.currentTarget;
  const form = new FormData(formElement);
  try {
    await api('/employees', {
      method: 'POST',
      body: JSON.stringify({
        firstName: form.get('firstName'), lastName: form.get('lastName'), email: form.get('email'), phone: form.get('phone'),
        position: form.get('position'), hotelId: form.get('hotelId'), departmentId: form.get('departmentId'), hiredAt: form.get('hiredAt'),
        salary: Number(form.get('salary')), status: 'active', skills: []
      })
    });
    formElement.reset();
    showToast('Сотрудник добавлен');
    await loadBaseData();
  } catch (error) { showToast(error.message); }
});

document.getElementById('shiftForm')?.addEventListener('submit', async event => {
  event.preventDefault();
  if (!isAdmin()) { showToast('Создавать смены может только администратор'); return; }
  const formElement = event.currentTarget;
  const form = new FormData(formElement);
  try {
    await api('/shifts', {
      method: 'POST',
      body: JSON.stringify({
        employeeId: form.get('employeeId'), hotelId: form.get('hotelId'),
        startsAt: new Date(form.get('startsAt')).toISOString(), endsAt: new Date(form.get('endsAt')).toISOString(),
        role: form.get('role'), note: form.get('note'), status: 'planned'
      })
    });
    formElement.reset();
    showToast('Смена создана');
    await loadBaseData();
  } catch (error) { showToast(error.message); }
});

document.getElementById('taskForm')?.addEventListener('submit', async event => {
  event.preventDefault();
  if (!isAdmin()) { showToast('Создавать задачи может только администратор'); return; }
  const formElement = event.currentTarget;
  const form = new FormData(formElement);
  try {
    await api('/tasks', {
      method: 'POST',
      body: JSON.stringify({
        title: form.get('title'), description: form.get('description'), employeeId: form.get('employeeId'), hotelId: form.get('hotelId'),
        priority: form.get('priority'), dueDate: form.get('dueDate'), status: 'open'
      })
    });
    formElement.reset();
    showToast('Задача создана');
    await loadBaseData();
  } catch (error) { showToast(error.message); }
});

document.getElementById('supportReplyForm')?.addEventListener('submit', async event => {
  event.preventDefault();
  const formElement = event.currentTarget;
  const ticket = getSelectedSupportTicket();
  if (!ticket) { showToast('Сначала выберите обращение'); return; }
  const form = new FormData(formElement);
  const message = String(form.get('message') || '').trim();
  if (!message) { showToast('Введите ответ клиенту'); return; }
  try {
    await api(`/customer-support/${ticket.id}/messages`, { method: 'POST', body: JSON.stringify({ message }) });
    formElement.reset();
    showToast('Ответ отправлен клиенту');
    await loadSupportTickets();
    state.selectedSupportTicketId = ticket.id;
    renderSupportTickets();
    renderSupportDialog();
  } catch (error) { showToast(error.message); }
});

document.getElementById('closeSupportButton')?.addEventListener('click', async () => {
  if (!isAdmin()) { showToast('Закрыть обращение может только администратор'); return; }
  const ticket = getSelectedSupportTicket();
  if (!ticket) { showToast('Сначала выберите обращение'); return; }
  try {
    await api(`/customer-support/${ticket.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'closed' }) });
    showToast('Обращение закрыто');
    await loadSupportTickets();
    state.selectedSupportTicketId = ticket.id;
    renderSupportTickets();
    renderSupportDialog();
  } catch (error) { showToast(error.message); }
});

document.getElementById('checkIntegrationButton')?.addEventListener('click', async () => {
  const status = document.getElementById('integrationStatus');
  try {
    const data = await api('/integration/roomly-status');
    status.textContent = data.connected
      ? `Основной сайт Roomly доступен: ${data.mainRoomlyApiUrl}`
      : `Основной сайт Roomly не отвечает. Адрес: ${data.mainRoomlyApiUrl}`;
  } catch (error) {
    status.textContent = error.message;
  }
});

window.addEventListener('popstate', () => showPage(location.hash.replace('#', '') || 'overview'));
bootstrap();
