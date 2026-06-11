(function () {
  const API_BASE = window.ROOMLY_API_BASE || '/api';
  const BOOKING_STORAGE_KEY = 'roomly_guest_bookings';
  const SUPPORT_STORAGE_KEY = 'roomly_support_dialog';
  const AUTH_TOKEN_KEY = 'roomly_auth_token';
  const AUTH_USER_KEY = 'roomly_auth_user';

  const FALLBACK_HOTELS = {
    'ikeja-lagos': {
      id: 'ikeja-lagos', name: 'Ikeja', city: 'Лагос', citySlug: 'lagos', country: 'Нигерия', full: 'Ikeja, Лагос', pricePerNight: 8490, beds: 2, maxGuests: 2,
      image: 'assets/hotels/ikeja-lagos-main.jpg',
      gallery: ['assets/hotels/ikeja-lagos-main.jpg', 'assets/hotels/ikeja-lagos-room.jpg', 'assets/hotels/ikeja-lagos-lobby.jpg'],
      description: 'Hotel Ikeja — это современный городской отель, расположенный в одном из самых активных деловых районов Лагоса. Отель предлагает комфортные номера с кондиционерами, бесплатным Wi‑Fi и всеми необходимыми удобствами для краткосрочного и длительного проживания. Благодаря удобному расположению гости могут быстро добраться до международного аэропорта, торгового центра и ключевых бизнес-районов города.'
    },
    'jabi-dubai': {
      id: 'jabi-dubai', name: 'Jabi', city: 'Дубай', citySlug: 'dubai', country: 'ОАЭ', full: 'Jabi, Дубай', pricePerNight: 10490, beds: 3, maxGuests: 3,
      image: 'assets/hotels/jabi-dubai-main.jpg',
      gallery: ['assets/hotels/jabi-dubai-main.jpg', 'assets/hotels/room-bright.jpg', 'assets/hotels/lobby-wide.jpg'],
      description: 'Jabi Hotel — светлый премиальный отель с просторной территорией, бассейном и удобными зонами отдыха. Он подходит для семейных поездок и спокойного отдыха после прогулок по Дубаю. В номерах есть Wi‑Fi, кондиционер, удобная мебель и всё необходимое для комфортного проживания.'
    },
    'arara-lagos': {
      id: 'arara-lagos', name: 'Arara', city: 'Лагос', citySlug: 'lagos', country: 'Нигерия', full: 'Arara, Лагос', pricePerNight: 6490, beds: 3, maxGuests: 3,
      image: 'assets/hotels/arara-lagos-main.jpg',
      gallery: ['assets/hotels/arara-lagos-main.jpg', 'assets/hotels/room-classic.jpg', 'assets/hotels/lobby-small.jpg'],
      description: 'Arara Hotel — уютный вариант для путешественников, которым важны спокойствие, доступная цена и удобное расположение. Отель находится в Лагосе и предлагает аккуратные номера, быстрый Wi‑Fi и базовые удобства для краткосрочного отдыха или деловой поездки.'
    },
    'lekki-paris': {
      id: 'lekki-paris', name: 'Lekki', city: 'Париж', citySlug: 'paris', country: 'Франция', full: 'Lekki, Париж', pricePerNight: 7490, beds: 4, maxGuests: 4,
      image: 'assets/hotels/lekki-paris-main.jpg',
      gallery: ['assets/hotels/lekki-paris-main.jpg', 'assets/hotels/room-white.jpg', 'assets/hotels/street-hotel.jpg'],
      description: 'Lekki Paris Suites — атмосферный отель для отдыха в Париже. Здание выполнено в европейском стиле, а внутри гостей ждут просторные номера, стабильный Wi‑Fi и комфортные зоны для отдыха. Подходит для романтических поездок, экскурсий и семейного размещения.'
    },
    'ikeja-london': {
      id: 'ikeja-london', name: 'Ikeja', city: 'Лондон', citySlug: 'london', country: 'Англия', full: 'Ikeja, Лондон', pricePerNight: 11490, beds: 2, maxGuests: 2,
      image: 'assets/hotels/ikeja-london-main.jpg',
      gallery: ['assets/hotels/ikeja-london-main.jpg', 'assets/hotels/room-dark.jpg', 'assets/hotels/generic-lobby.jpg'],
      description: 'Ikeja London — стильный отель в спокойном районе Лондона. Он сочетает домашний комфорт, современный сервис и удобный доступ к городским маршрутам. Гости могут рассчитывать на чистые номера, Wi‑Fi, удобные кровати и внимательную поддержку во время проживания.'
    }
  };

  let currentHotel = FALLBACK_HOTELS['ikeja-lagos'];
  let authUser = getStoredUser();

  const toast = document.querySelector('[data-toast]');

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('rm-show');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove('rm-show'), 2200);
  }

  function getStoredUser() {
    try {
      return JSON.parse(localStorage.getItem(AUTH_USER_KEY) || 'null');
    } catch (_) {
      return null;
    }
  }

  function setSession(token, user) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    authUser = user;
    refreshAuthUi();
    renderAccountSession();
    initAccountBookings();
    initAccountSupportTickets();
  }

  function clearSession() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    authUser = null;
    refreshAuthUi();
    renderAccountSession();
    initAccountBookings();
    initAccountSupportTickets();
  }

  function roleText(role) {
    return ({
      user: 'Пользователь',
      staff: 'Сотрудник',
      admin: 'Администратор'
    })[role] || 'Гость';
  }

  function hasStaffAccess(user = authUser) {
    return ['staff', 'admin'].includes(user?.role);
  }

  function canCreateBooking(user = authUser) {
    return ['user', 'admin'].includes(user?.role);
  }

  function refreshAuthUi() {
    document.querySelectorAll('[data-staff-link]').forEach((link) => {
      link.hidden = !hasStaffAccess();
    });

    document.querySelectorAll('[data-auth-menu]').forEach((menu) => {
      if (authUser) {
        menu.innerHTML = `
          <div class="rm-auth-menu-info"><strong>${escapeHtml(authUser.name)}</strong><small>${escapeHtml(roleText(authUser.role))}</small></div>
          <a href="account.html">Личный кабинет</a>
          ${hasStaffAccess() ? '<a href="http://127.0.0.1:5174" target="_blank" rel="noopener">Персонал</a>' : ''}
          <button type="button" data-logout>Выйти</button>
        `;
      } else {
        menu.innerHTML = `
          <a href="account.html">Войти</a>
          <a href="account.html#register">Регистрация</a>
          <a href="support.html">Поддержка</a>
        `;
      }
    });
  }

  async function loadSession() {
    if (!getStoredToken()) {
      authUser = null;
      refreshAuthUi();
      renderAccountSession();
      return null;
    }

    try {
      const data = await api('/auth/me');
      authUser = data.user;
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(authUser));
      refreshAuthUi();
      renderAccountSession();
      return authUser;
    } catch (_) {
      clearSession();
      return null;
    }
  }

  function formatPrice(value) {
    const number = Number(value || 0);
    if (!Number.isFinite(number) || number <= 0) return '—';
    return new Intl.NumberFormat('ru-RU').format(number) + ' ₽';
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('\"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function supportStatusText(value) {
    return ({
      new: 'Новое обращение',
      in_progress: 'В работе',
      resolved: 'Решено',
      closed: 'Закрыто'
    })[value] || value || 'Новое обращение';
  }

  function hotelUrl(id) {
    return `hotel.html?id=${encodeURIComponent(id)}`;
  }

  function getStoredToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY) || '';
  }

  async function api(path, options = {}) {
    const headers = { Accept: 'application/json', ...(options.headers || {}) };
    if (options.body && !(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    const token = getStoredToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.success === false) {
      const message = payload?.error?.message || 'Сервер временно недоступен';
      throw new Error(message);
    }
    return payload.data;
  }

  function getCurrentHotelId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id') || 'ikeja-lagos';
  }

  function fallbackHotelById(id) {
    return FALLBACK_HOTELS[id] || FALLBACK_HOTELS['ikeja-lagos'];
  }

  async function loadHotel(id) {
    try {
      const data = await api(`/hotels/${encodeURIComponent(id)}`);
      return data.hotel;
    } catch (error) {
      return fallbackHotelById(id);
    }
  }

  async function loadRecommendations(id) {
    try {
      const data = await api(`/hotels/${encodeURIComponent(id)}/recommendations?limit=4`);
      return data.items;
    } catch (error) {
      return Object.values(FALLBACK_HOTELS).filter((item) => item.id !== id).slice(0, 4);
    }
  }

  function setText(selector, value) {
    document.querySelectorAll(selector).forEach((node) => { node.textContent = value; });
  }

  function setSrc(selector, src) {
    document.querySelectorAll(selector).forEach((img) => {
      img.src = src;
      img.alt = '';
    });
  }

  function toHotelView(hotel) {
    const pricePerNight = Number(hotel.pricePerNight || String(hotel.price || '').replace(/\D/g, '') || 0);
    return {
      ...hotel,
      full: hotel.full || `${hotel.name}, ${hotel.city}`,
      priceLabel: formatPrice(pricePerNight),
      bedsLabel: `${hotel.beds || 1} ${Number(hotel.beds) === 1 ? 'кровать' : 'кровати'}`,
      gallery: Array.isArray(hotel.gallery) && hotel.gallery.length >= 3 ? hotel.gallery : [hotel.image, hotel.image, hotel.image]
    };
  }

  async function initHotelPage() {
    const page = document.querySelector('[data-hotel-page]');
    if (!page) return;

    const requestedId = getCurrentHotelId();
    currentHotel = toHotelView(await loadHotel(requestedId));
    document.title = `Roomly — ${currentHotel.full}`;
    page.setAttribute('aria-label', `Roomly — отель ${currentHotel.full}`);
    page.classList.toggle('rm-is-dynamic', currentHotel.id !== 'ikeja-lagos');

    setText('[data-hotel-full]', currentHotel.full);
    setText('[data-modal-hotel]', currentHotel.full);
    setText('[data-hotel-name]', currentHotel.name);
    setText('[data-hotel-city]', currentHotel.city);
    setText('[data-hotel-price]', currentHotel.priceLabel);
    setText('[data-hotel-beds]', currentHotel.bedsLabel);
    setText('[data-hotel-description]', currentHotel.description);
    setSrc('[data-hotel-main]', currentHotel.gallery[0]);
    setSrc('[data-hotel-side-one]', currentHotel.gallery[1]);
    setSrc('[data-hotel-side-two]', currentHotel.gallery[2]);

    document.querySelectorAll('[data-booking-hotel-id]').forEach((input) => { input.value = currentHotel.id; });

    const list = document.querySelector('[data-hotel-recommendations]');
    if (list) {
      const recommendations = await loadRecommendations(currentHotel.id);
      list.innerHTML = recommendations
        .map((rawItem) => {
          const item = toHotelView(rawItem);
          return `
            <a class="rm-recommend-card" href="${hotelUrl(item.id)}" aria-label="Открыть отель ${item.full}">
              <img src="${item.image}" alt="${item.full}" />
              <strong>${item.full}</strong>
            </a>
          `;
        }).join('');
    }
  }

  document.querySelectorAll('[data-profile]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const menu = document.querySelector('[data-profile-menu]');
      if (menu) menu.classList.toggle('rm-open');
    });
  });

  document.addEventListener('click', (event) => {
    const menu = document.querySelector('[data-profile-menu]');
    if (!menu) return;
    if (!event.target.closest('[data-profile]') && !event.target.closest('[data-profile-menu]')) {
      menu.classList.remove('rm-open');
    }
  });

  function toDateInputValue(date) {
    return date.toISOString().slice(0, 10);
  }

  function fillDefaultBookingDates() {
    const form = document.querySelector('[data-booking-form]');
    if (!form) return;
    const checkIn = form.querySelector('[name="checkIn"]');
    const checkOut = form.querySelector('[name="checkOut"]');
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const after = new Date(today);
    after.setDate(today.getDate() + 4);
    const min = toDateInputValue(tomorrow);
    if (checkIn) {
      checkIn.min = min;
      if (!checkIn.value) checkIn.value = min;
    }
    if (checkOut) {
      checkOut.min = toDateInputValue(new Date(tomorrow.getTime() + 86400000));
      if (!checkOut.value) checkOut.value = toDateInputValue(after);
    }
  }

  document.querySelectorAll('[data-book]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      if (!canCreateBooking()) {
        showToast(authUser ? 'Бронирование доступно только пользователю или администратору' : 'Для бронирования войдите или зарегистрируйтесь');
        const result = document.querySelector('[data-booking-result]');
        if (result) result.textContent = 'Гость может просматривать отели, но для бронирования нужен аккаунт пользователя.';
        return;
      }
      setText('[data-modal-hotel]', currentHotel.full || fallbackHotelById(getCurrentHotelId()).full);
      document.querySelectorAll('[data-booking-hotel-id]').forEach((input) => { input.value = currentHotel.id || getCurrentHotelId(); });
      fillDefaultBookingDates();
      const form = document.querySelector('[data-booking-form]');
      if (form && authUser) {
        const guestName = form.querySelector('[name="guestName"]');
        const email = form.querySelector('[name="email"]');
        const phone = form.querySelector('[name="phone"]');
        if (guestName && !guestName.value) guestName.value = authUser.name || '';
        if (email && !email.value) email.value = authUser.email || '';
        if (phone && !phone.value) phone.value = authUser.phone || '';
      }
      const result = document.querySelector('[data-booking-result]');
      if (result) result.textContent = '';
      const modal = document.querySelector('[data-booking-modal]');
      if (modal) modal.classList.add('rm-open');
    });
  });

  document.querySelectorAll('[data-close-modal]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.rm-modal-backdrop.rm-open').forEach((modal) => modal.classList.remove('rm-open'));
    });
  });

  document.querySelectorAll('.rm-modal-backdrop').forEach((modal) => {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) modal.classList.remove('rm-open');
    });
  });

  function saveGuestBooking(booking) {
    const saved = JSON.parse(localStorage.getItem(BOOKING_STORAGE_KEY) || '[]');
    const next = saved.filter((item) => item.id !== booking.id);
    next.unshift({ id: booking.id, accessToken: booking.accessToken, hotelId: booking.hotelId, createdAt: booking.createdAt });
    localStorage.setItem(BOOKING_STORAGE_KEY, JSON.stringify(next.slice(0, 20)));
  }

  const bookingForm = document.querySelector('[data-booking-form]');
  if (bookingForm) {
    fillDefaultBookingDates();
    bookingForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!canCreateBooking()) {
        showToast(authUser ? 'У этой роли нет права создавать бронирования' : 'Войдите в аккаунт пользователя, чтобы забронировать отель');
        return;
      }
      const result = bookingForm.querySelector('[data-booking-result]');
      const submit = bookingForm.querySelector('[type="submit"]');
      const formData = new FormData(bookingForm);
      const payload = Object.fromEntries(formData.entries());
      payload.guests = Number(payload.guests || 1);

      try {
        if (submit) submit.disabled = true;
        if (result) result.textContent = 'Отправляем бронь на сервер...';
        const data = await api('/bookings', { method: 'POST', body: JSON.stringify(payload) });
        saveGuestBooking(data.booking);
        if (result) result.textContent = `Бронь подтверждена. Номер бронирования: ${data.booking.id.slice(0, 8)}.`;
        showToast('Бронирование создано');
      } catch (error) {
        if (result) result.textContent = error.message;
        showToast(error.message);
      } finally {
        if (submit) submit.disabled = false;
      }
    });
  }

  const filterOptions = {
    location: [
      ['paris', 'Франция, Париж'],
      ['lagos', 'Нигерия, Лагос'],
      ['dubai', 'ОАЭ, Дубай'],
      ['london', 'Англия, Лондон']
    ],
    guests: [
      ['1', '1 гость'],
      ['2', '2 гостя'],
      ['3', '3 гостя'],
      ['4', '4 гостя']
    ],
    date: [
      ['may', '12 мая - 19 мая'],
      ['june', '2 июня - 11 июня'],
      ['july', '5 июля - 12 июля']
    ],
    budget: [
      ['low', 'до 7,000'],
      ['mid', '50,000-150,000'],
      ['high', '150,000+']
    ]
  };

  function closeSearchMenus() {
    document.querySelectorAll('.rm-search-menu').forEach((menu) => menu.remove());
  }

  document.querySelectorAll('[data-search-control]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeSearchMenus();
      const options = filterOptions[button.dataset.filter] || [];
      const page = document.querySelector('[data-roomly-page]');
      if (!page) return;
      const rect = button.getBoundingClientRect();
      const pageRect = page.getBoundingClientRect();
      const menu = document.createElement('div');
      menu.className = 'rm-search-menu';
      menu.style.left = `${rect.left - pageRect.left}px`;
      menu.style.top = `${rect.bottom - pageRect.top + 6}px`;
      menu.style.width = `${rect.width}px`;
      menu.innerHTML = options.map(([value, label]) => `<button type="button" data-value="${value}">${label}</button>`).join('');
      page.appendChild(menu);
      menu.querySelectorAll('button').forEach((option) => {
        option.addEventListener('click', (clickEvent) => {
          clickEvent.stopPropagation();
          button.dataset.value = option.dataset.value;
          button.textContent = option.textContent;
          closeSearchMenus();
          showToast('Фильтр выбран');
        });
      });
    });
  });

  document.addEventListener('click', closeSearchMenus);

  const searchForm = document.querySelector('[data-search-form]');
  if (searchForm) {
    searchForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const locationValue = document.querySelector('[data-filter="location"]')?.dataset.value || 'paris';
      const guestsValue = document.querySelector('[data-filter="guests"]')?.dataset.value || '2';
      const budgetValue = document.querySelector('[data-filter="budget"]')?.dataset.value || 'mid';
      const locationMap = {
        paris: 'lekki-paris',
        lagos: 'ikeja-lagos',
        dubai: 'jabi-dubai',
        london: 'ikeja-london'
      };
      try {
        const params = new URLSearchParams({ city: locationValue, guests: guestsValue, budget: budgetValue });
        const data = await api(`/hotels?${params.toString()}`);
        const first = data.items?.[0];
        if (first) {
          window.location.href = hotelUrl(first.id);
          return;
        }
        showToast('Свободных отелей по фильтрам нет');
      } catch (error) {
        let target = locationMap[locationValue] || 'lekki-paris';
        if (budgetValue === 'low') target = 'arara-lagos';
        window.location.href = hotelUrl(target);
      }
    });
  }

  function getStoredSupportDialog() {
    try {
      return JSON.parse(localStorage.getItem(SUPPORT_STORAGE_KEY) || 'null');
    } catch (_) {
      return null;
    }
  }

  function storeSupportDialog(ticket) {
    if (!ticket?.id || !ticket?.accessToken) return;
    localStorage.setItem(SUPPORT_STORAGE_KEY, JSON.stringify({ id: ticket.id, accessToken: ticket.accessToken }));
  }

  function renderSupportDialog(ticket) {
    const panel = document.querySelector('[data-support-dialog-panel]');
    const dialog = document.querySelector('[data-support-dialog]');
    const status = document.querySelector('[data-support-dialog-status]');
    const replyForm = document.querySelector('[data-support-reply-form]');
    if (!panel || !dialog || !status || !replyForm) return;

    if (!ticket) {
      panel.hidden = true;
      return;
    }

    panel.hidden = false;
    status.textContent = `Статус: ${supportStatusText(ticket.status)}`;
    const messages = Array.isArray(ticket.messages) ? ticket.messages : [];
    dialog.innerHTML = messages.map((message) => `
      <article class="rm-support-message ${message.authorRole === 'staff' ? 'rm-support-message--staff' : 'rm-support-message--customer'}">
        <div><strong>${escapeHtml(message.authorName)}</strong><small>${escapeHtml(new Date(message.createdAt).toLocaleString('ru-RU'))}</small></div>
        <p>${escapeHtml(message.message)}</p>
      </article>
    `).join('') || '<p>Сообщений пока нет.</p>';
    replyForm.hidden = ticket.status === 'closed';
  }

  async function loadStoredSupportDialog() {
    const saved = getStoredSupportDialog();
    if (!saved?.id || !saved?.accessToken) return;
    try {
      const data = await api(`/support/public/${encodeURIComponent(saved.id)}?accessToken=${encodeURIComponent(saved.accessToken)}`);
      renderSupportDialog(data.ticket);
    } catch (_) {
      localStorage.removeItem(SUPPORT_STORAGE_KEY);
    }
  }

  const supportForm = document.querySelector('[data-support-form]');
  if (supportForm) {
    supportForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const payload = {
        name: supportForm.querySelector('[name="name"]')?.value.trim(),
        email: supportForm.querySelector('[name="email"]')?.value.trim(),
        message: supportForm.querySelector('[name="message"]')?.value.trim()
      };
      if (!payload.name || !payload.email || !payload.message) {
        showToast('Заполните имя, email и сообщение');
        return;
      }
      try {
        const data = await api('/support', { method: 'POST', body: JSON.stringify(payload) });
        storeSupportDialog(data.ticket);
        renderSupportDialog(data.ticket);
        showToast('Обращение создано. Ответ появится в диалоге ниже.');
        supportForm.reset();
      } catch (error) {
        showToast(error.message);
      }
    });
  }

  const supportReplyForm = document.querySelector('[data-support-reply-form]');
  if (supportReplyForm) {
    supportReplyForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const saved = getStoredSupportDialog();
      const message = supportReplyForm.querySelector('[name="message"]')?.value.trim();
      if (!saved?.id || !saved?.accessToken) {
        showToast('Сначала создайте обращение');
        return;
      }
      if (!message) {
        showToast('Введите сообщение');
        return;
      }
      try {
        const data = await api(`/support/public/${encodeURIComponent(saved.id)}/messages`, {
          method: 'POST',
          body: JSON.stringify({ accessToken: saved.accessToken, message })
        });
        renderSupportDialog(data.ticket);
        supportReplyForm.reset();
        showToast('Сообщение отправлено');
      } catch (error) {
        showToast(error.message);
      }
    });
  }

  loadStoredSupportDialog();

  function renderAccountSession() {
    const authPanel = document.querySelector('[data-auth-panel]');
    const sessionPanel = document.querySelector('[data-session-panel]');
    const nameNode = document.querySelector('[data-current-user-name]');
    const infoNode = document.querySelector('[data-current-user-info]');

    if (authPanel) authPanel.hidden = Boolean(authUser);
    if (sessionPanel) sessionPanel.hidden = !authUser;
    if (!authUser) return;

    if (nameNode) nameNode.textContent = authUser.name || 'Пользователь';
    if (infoNode) {
      infoNode.innerHTML = `
        <li>Email: ${escapeHtml(authUser.email || '—')}</li>
        <li>Телефон: ${escapeHtml(authUser.phone || '—')}</li>
        <li>Роль: ${escapeHtml(roleText(authUser.role))}</li>
      `;
    }
  }

  function setupAuthForms() {
    const loginForm = document.querySelector('[data-login-form]');
    if (loginForm) {
      loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = new FormData(loginForm);
        try {
          const data = await api('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email: form.get('email'), password: form.get('password') })
          });
          setSession(data.token, data.user);
          showToast('Вход выполнен');
        } catch (error) {
          showToast(error.message);
        }
      });
    }

    const registerForm = document.querySelector('[data-register-form]');
    if (registerForm) {
      registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = new FormData(registerForm);
        try {
          const data = await api('/auth/register', {
            method: 'POST',
            body: JSON.stringify({
              name: form.get('name'),
              email: form.get('email'),
              phone: form.get('phone'),
              password: form.get('password')
            })
          });
          setSession(data.token, data.user);
          registerForm.reset();
          showToast('Аккаунт создан');
        } catch (error) {
          showToast(error.message);
        }
      });
    }
  }

  function renderAccountBookings(bookings) {
    if (!bookings || bookings.length === 0) {
      return '<p>Пока нет бронирований, созданных с этого браузера.</p>';
    }
    return bookings.map((booking) => `
      <article class="rm-account-booking-card">
        <strong>${booking.hotel?.full || booking.hotelId}</strong>
        <span>${booking.checkIn} — ${booking.checkOut}, ${booking.guests} гост.</span>
        <small>${formatPrice(booking.totalPrice)} · ${booking.status === 'cancelled' ? 'отменено' : booking.status === 'completed' ? 'завершено' : 'подтверждено'}</small>
      </article>
    `).join('');
  }


  function renderAccountSupportTickets(tickets) {
    if (!tickets || tickets.length === 0) {
      return '<p>У вас пока нет обращений в поддержку.</p>';
    }
    return tickets.map((ticket) => {
      const messages = Array.isArray(ticket.messages) ? ticket.messages : [];
      const closed = ticket.status === 'closed';
      return `
        <article class="rm-account-support-card" data-account-ticket="${escapeHtml(ticket.id)}">
          <header>
            <div><strong>Обращение #${escapeHtml(ticket.id.slice(0, 8))}</strong><br><small>${escapeHtml(supportStatusText(ticket.status))}</small></div>
            <small>${escapeHtml(new Date(ticket.updatedAt || ticket.createdAt).toLocaleString('ru-RU'))}</small>
          </header>
          <div class="rm-account-support-messages">
            ${messages.map((message) => `
              <div class="rm-account-support-message ${message.authorRole === 'staff' ? 'staff' : 'customer'}">
                <div><strong>${escapeHtml(message.authorName)}</strong><small>${escapeHtml(new Date(message.createdAt).toLocaleString('ru-RU'))}</small></div>
                <p>${escapeHtml(message.message)}</p>
              </div>
            `).join('')}
          </div>
          ${closed ? '<p class="rm-muted">Обращение закрыто. Если вопрос остался, создайте новое обращение.</p>' : `
            <form class="rm-account-support-reply" data-account-support-reply data-ticket-id="${escapeHtml(ticket.id)}">
              <textarea name="message" placeholder="Напишите уточнение или ответ администратору" required></textarea>
              <button type="submit">Отправить сообщение</button>
            </form>
          `}
        </article>
      `;
    }).join('');
  }

  async function initAccountSupportTickets() {
    const list = document.querySelector('[data-account-support-list]');
    if (!list) return;

    if (!authUser || !getStoredToken()) {
      list.innerHTML = '<p>Войдите в аккаунт, чтобы видеть свои обращения и ответы поддержки.</p>';
      return;
    }

    try {
      const data = await api('/support');
      list.innerHTML = renderAccountSupportTickets(data.items || []);
    } catch (error) {
      list.innerHTML = '<p>Не удалось загрузить обращения. Проверьте, запущен ли backend.</p>';
    }
  }

  async function initAccountBookings() {
    const panel = document.querySelector('[data-account-bookings]');
    const list = document.querySelector('[data-account-bookings-list]');
    if (!panel || !list) return;

    if (!authUser || !getStoredToken()) {
      list.innerHTML = '<p>Войдите как пользователь, чтобы видеть свои бронирования.</p>';
      return;
    }

    try {
      const data = await api('/bookings');
      list.innerHTML = renderAccountBookings(data.items || []);
    } catch (error) {
      list.innerHTML = '<p>Не удалось загрузить бронирования. Проверьте, запущен ли backend.</p>';
    }
  }


  document.addEventListener('submit', async (event) => {
    const form = event.target.closest('[data-account-support-reply]');
    if (!form) return;
    event.preventDefault();
    const ticketId = form.dataset.ticketId;
    const message = form.querySelector('[name="message"]')?.value.trim();
    if (!ticketId || !message) {
      showToast('Введите сообщение');
      return;
    }
    try {
      await api(`/support/${encodeURIComponent(ticketId)}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message })
      });
      form.reset();
      showToast('Сообщение отправлено');
      await initAccountSupportTickets();
    } catch (error) {
      showToast(error.message);
    }
  });

  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-logout]')) {
      event.preventDefault();
      clearSession();
      showToast('Вы вышли из аккаунта');
    }
  });

  setupAuthForms();
  refreshAuthUi();
  renderAccountSession();
  initHotelPage();
  loadSession().finally(() => { initAccountBookings(); initAccountSupportTickets(); });
})();
