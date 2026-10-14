(() => {
  // Все данные клиента меняются здесь
  const CONFIG = {
    phones: {
      msk: '+7 (000) 000-00-00', // TODO: номер для Москвы (Домодедово)
      khv: '+7 (000) 000-00-00', // TODO: номер для Хабаровска
    },
    metrikaId: 0, // TODO: номер счётчика Яндекс Метрики
    // Цены за м² задаются в index.html, в таблицах .ptable (data-price у строки)
    // Ходовые размеры для таблицы цен, длина × ширина в метрах
    sizes: [[3, 4], [4, 6], [6, 8], [8, 10], [10, 12], [10, 15], [15, 20]],
    sizeCols: [['pvh', '400 г/м²'], ['pvh', '550 г/м²'], ['pvh', '630 г/м²']], // колонки таблицы ходовых размеров
  };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const digits = s => String(s).replace(/\D/g, '');
  const fmt = n => n.toLocaleString('ru-RU');
  const telHref = key => 'tel:+' + digits(CONFIG.phones[key] || '');

  // Яндекс Метрика
  if (CONFIG.metrikaId) {
    (function (m, e, t, r, i, k, a) {
      m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
      m[i].l = 1 * new Date();
      k = e.createElement(t); a = e.getElementsByTagName(t)[0];
      k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
    })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');
    ym(CONFIG.metrikaId, 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: true });
  }
  const goal = name => { if (CONFIG.metrikaId && window.ym) ym(CONFIG.metrikaId, 'reachGoal', name); };

  // Телефоны
  $$('[data-phone]').forEach(a => { a.href = telHref(a.dataset.phone); a.textContent = CONFIG.phones[a.dataset.phone]; });
  $$('[data-phone-link]').forEach(a => { a.href = telHref(a.dataset.phoneLink); });
  $$('[data-phone-text]').forEach(el => { el.textContent = CONFIG.phones[el.dataset.phoneText]; });
  document.addEventListener('click', e => { if (e.target.closest('a[href^="tel:"]')) goal('phone_click'); });

  // Цены: читаем из таблиц .ptable, чтобы цена менялась в одном месте
  const mats = {};
  $$('.ptable').forEach(t => {
    mats[t.dataset.mat] = $$('tr[data-grade]', t).map(r => ({ grade: r.dataset.grade, price: +r.dataset.price || null }));
  });
  const gradePrice = (mat, grade) => ((mats[mat] || []).find(g => g.grade === grade) || {}).price || null;
  const minOf = list => { const v = list.filter(Boolean); return v.length ? Math.min(...v) : null; };

  const single = minOf(Object.values(mats).flat().map(g => g.price));
  $$('[data-from="single"]').forEach(el => { if (single) el.textContent = `от ${fmt(single)} ₽/м²`; });

  // Таблица ходовых размеров показывается, только когда есть цены
  const sizesBody = $('[data-sizes]');
  const cols = CONFIG.sizeCols.map(([m, g]) => gradePrice(m, g));
  if (sizesBody && cols.some(Boolean)) {
    const cell = (area, p) => p ? fmt(Math.round(area * p)) + ' ₽' : 'по запросу';
    sizesBody.innerHTML = CONFIG.sizes.map(([l, w]) => `<tr><td>${l} × ${w} м</td>${cols.map(p => `<td>${cell(l * w, p)}</td>`).join('')}</tr>`).join('');
    $('[data-price-table]').hidden = false;
  }

  // Калькулятор
  const calc = $('#calc-form');
  if (calc) {
    const f = calc.elements;
    const num = el => Math.max(0, parseFloat(String(el.value).replace(',', '.')) || 0);
    const matKey = () => f.material.selectedOptions[0].dataset.key;
    const fillGrades = () => {
      f.grade.innerHTML = (mats[matKey()] || []).map(g =>
        `<option value="${g.grade}">${g.grade} · ${g.price ? 'от ' + fmt(g.price) + ' ₽/м²' : 'по запросу'}</option>`).join('');
      const firstPriced = (mats[matKey()] || []).findIndex(g => g.price);
      if (firstPriced > 0) f.grade.selectedIndex = firstPriced;
    };
    const update = () => {
      const qty = Math.max(1, Math.round(num(f.qty)));
      const area = Math.round(num(f.namedItem('length')) * num(f.width) * qty * 10) / 10;
      const p = f.type.checked ? null : gradePrice(matKey(), f.grade.value);
      const total = p && area ? Math.round(area * p) : 0;
      $('#calc-area').textContent = area ? fmt(area) + ' м²' : '—';
      $('#calc-price').textContent = total ? '≈ ' + fmt(total) + ' ₽' : 'рассчитаем';
      f.area.value = area ? area + ' м²' : '';
      f.estimate.value = total ? total + ' ₽' : '';
    };
    f.material.addEventListener('change', fillGrades);
    calc.addEventListener('input', update);
    calc.addEventListener('change', update);
    fillGrades();
    update();

    $$('[data-pick-type]').forEach(a => a.addEventListener('click', () => {
      f.type.checked = a.dataset.pickType === 'warm'; update();
    }));
  }

  // Маска телефона
  const mask = v => {
    let d = digits(v);
    if (!d) return '';
    if (d[0] === '8') d = '7' + d.slice(1);
    if (d[0] !== '7') d = '7' + d;
    d = d.slice(0, 11);
    let out = '+7';
    if (d.length > 1) out += ' (' + d.slice(1, 4);
    if (d.length >= 4) out += ')';
    if (d.length > 4) out += ' ' + d.slice(4, 7);
    if (d.length > 7) out += '-' + d.slice(7, 9);
    if (d.length > 9) out += '-' + d.slice(9, 11);
    return out;
  };
  $$('input[type="tel"]').forEach(i => {
    i.addEventListener('input', e => {
      i.classList.remove('is-invalid');
      if (e.inputType && e.inputType.startsWith('delete')) return;
      i.value = mask(i.value);
    });
    i.addEventListener('focus', () => { if (!i.value) i.value = '+7 '; });
    i.addEventListener('blur', () => { if (digits(i.value).length < 2) i.value = ''; });
  });

  // UTM-метки для рекламщика
  const params = new URLSearchParams(location.search);
  let utm = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
    .filter(k => params.get(k)).map(k => `${k}=${params.get(k)}`).join('; ');
  try {
    if (utm) sessionStorage.setItem('utm', utm);
    else utm = sessionStorage.getItem('utm') || '';
  } catch (e) { /* хранилище недоступно */ }

  // Отправка заявок
  $$('form.lead-form').forEach(form => {
    form.addEventListener('change', e => {
      if (e.target.name === 'agree') e.target.closest('.check').classList.remove('is-invalid');
    });
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const phone = form.elements.phone;
      const agree = form.elements.agree;
      let ok = true;
      if (digits(phone.value).length !== 11) { phone.classList.add('is-invalid'); ok = false; }
      if (agree && !agree.checked) { agree.closest('.check').classList.add('is-invalid'); ok = false; }
      if (!ok) return;

      const btn = form.querySelector('button[type="submit"]');
      const label = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Отправляем…';

      const data = new FormData(form);
      data.append('form', form.dataset.form || '');
      data.append('utm', utm);
      data.append('page', location.href);

      try {
        const res = await fetch('send.php', { method: 'POST', body: data });
        const json = await res.json();
        if (!json.ok) throw new Error('send failed');
        form.innerHTML = '<div class="form__success"><b>Заявка отправлена</b><p>Скоро перезвоним и всё посчитаем.</p></div>';
        goal('lead');
      } catch (err) {
        btn.disabled = false;
        btn.textContent = label;
        alert('Не получилось отправить. Позвоните нам: ' + CONFIG.phones.msk);
      }
    });
  });

  // Окно «Заказать звонок»
  const modal = $('#modal');
  const openModal = () => {
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    const input = modal.querySelector('input[name="phone"]');
    if (input) input.focus();
  };
  const closeModal = () => {
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
  };
  $$('[data-modal-open]').forEach(b => b.addEventListener('click', openModal));
  modal.addEventListener('click', e => {
    if (e.target === modal || e.target.closest('[data-modal-close]')) closeModal();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  // Шапка и меню
  const header = $('.header');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 10);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const burger = $('.burger');
  const nav = $('#nav');
  const setMenu = open => {
    nav.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', open);
  };
  burger.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  nav.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });

  // Видео на первом экране только на компьютере, чтобы телефон грузился быстро
  const video = $('.hero__video');
  const canPlay = matchMedia('(min-width: 768px)').matches
    && !matchMedia('(prefers-reduced-motion: reduce)').matches
    && !(navigator.connection && navigator.connection.saveData);
  if (video && canPlay) {
    video.addEventListener('canplay', () => video.classList.add('is-ready'), { once: true });
    video.src = video.dataset.src;
    video.play().catch(() => {});
  }
})();
