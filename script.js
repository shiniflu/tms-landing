/* ===========================================================
   Кругорейс Landing — data-driven renderer
   =========================================================== */

(async function () {
  'use strict';

  // ---------- Load content ----------
  let content;
  try {
    const res = await fetch('content.json?v=' + Date.now());
    content = await res.json();
  } catch (e) {
    document.getElementById('app').innerHTML = '<div style="padding:40px;text-align:center;color:#ef4444">Ошибка загрузки content.json</div>';
    console.error(e);
    return;
  }

  // ---------- Apply meta ----------
  document.title = content.site.title || 'Кругорейс';
  document.getElementById('metaDescription')?.setAttribute('content', content.site.description || '');
  document.getElementById('ogTitle')?.setAttribute('content', content.site.title || '');
  document.getElementById('ogDescription')?.setAttribute('content', content.site.description || '');
  document.documentElement.lang = 'ru';

  // ---------- Helpers ----------
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safe = (s) => String(s ?? ''); // for fields that allow inline HTML (b, i tags)
  const blockOn = (key) => content.blocks?.[key]?.enabled !== false;

  const SVG = {
    check: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10l3 3 7-7" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9s-.5-.1-.7.1c-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-1.6-.8-2.7-1.5-3.8-3.4-.3-.5.3-.5.9-1.6.1-.2.1-.4 0-.5-.1-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5 1.9.8 2.6.9 3.5.7.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3M12 2C6.5 2 2 6.5 2 12c0 1.7.4 3.4 1.3 4.9L2 22l5.3-1.4c1.4.8 3 1.2 4.7 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2"/></svg>',
    tg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/></svg>',
    icons: {
      route:     '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2"><circle cx="16" cy="13" r="5"/><path d="M16 21v8M11 26h10"/></svg>',
      fuel:      '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 26V12l8-6 8 6v14"/><path d="M14 26v-6h4v6"/></svg>',
      gps:       '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2"><circle cx="16" cy="14" r="4"/><path d="M16 4v3M16 21v3M4 14h3M25 14h3"/></svg>',
      chart:     '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 26h22M9 26V14M15 26V8M21 26V18M27 26v-6"/></svg>',
      doc:       '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="6" width="24" height="20" rx="2"/><path d="M4 12h24M9 18h6M9 22h10"/></svg>',
      integrate: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="16" r="5"/><circle cx="21" cy="16" r="5"/></svg>'
    }
  };

  // ---------- Block renderers ----------
  const R = {};

  R.header = () => `
    <header class="header" data-block="header">
      <div class="container header__inner">
        <a href="#" class="logo">
          <span class="logo__mark">${esc(content.site.logoMark)}</span>
          <span class="logo__text">${esc(content.site.logoText)}</span>
        </a>
        <nav class="nav">
          ${(content.nav || []).map(n => `<a href="${esc(n.href)}">${esc(n.label)}</a>`).join('')}
        </nav>
        <div class="header__cta">
          <a href="tel:${esc(content.site.phoneTel)}" class="header__phone">${esc(content.site.phone)}</a>
          <a href="#lead" class="btn btn--primary btn--sm">Получить демо</a>
        </div>
        <button class="burger" aria-label="Меню"><span></span><span></span><span></span></button>
      </div>
    </header>`;

  R.hero = () => {
    const h = content.hero;
    return `
    <section class="hero" data-block="hero">
      <div class="container hero__inner">
        <div class="hero__content">
          <div class="hero__badge"><span class="hero__badge-dot"></span>${esc(h.badge)}</div>
          <h1 class="hero__title">
            ${esc(h.title)}
            <span class="hero__title-accent">${esc(h.titleAccent)}</span>
          </h1>
          <p class="hero__subtitle">${safe(h.subtitle)}</p>
          <ul class="hero__bullets">
            ${(h.bullets || []).map(b => `<li>${SVG.check}${esc(b)}</li>`).join('')}
          </ul>
          <div class="hero__actions">
            <a href="#lead" class="btn btn--primary btn--lg" data-event="cta_demo_hero">${esc(h.ctaPrimary)}</a>
            <a href="https://wa.me/${esc(content.site.whatsapp)}" target="_blank" rel="noopener" class="btn btn--ghost btn--lg" data-event="cta_whatsapp_hero">
              ${SVG.wa}${esc(h.ctaSecondary)}
            </a>
          </div>
          <div class="hero__trust">
            ${(h.trust || []).map(t => `<div class="hero__trust-item"><b>${esc(t.value)}</b><span>${esc(t.label)}</span></div>`).join('')}
          </div>
        </div>
        <div class="hero__visual">
          <div class="dashboard">
            <div class="dashboard__head">
              <span class="dashboard__dot"></span><span class="dashboard__dot"></span><span class="dashboard__dot"></span>
              <span class="dashboard__title">${esc(content.site.logoText)} · Дашборд</span>
            </div>
            <div class="dashboard__body">
              <div class="dashboard__stat">
                <div class="dashboard__stat-label">Автопарк онлайн</div>
                <div class="dashboard__stat-value">87 / 92</div>
                <div class="dashboard__bar"><span style="width:94%"></span></div>
              </div>
              <div class="dashboard__row">
                <div class="dashboard__card">
                  <div class="dashboard__card-label">Расход топлива</div>
                  <div class="dashboard__card-value">-18%</div>
                  <div class="dashboard__card-trend dashboard__card-trend--good">↓ за месяц</div>
                </div>
                <div class="dashboard__card">
                  <div class="dashboard__card-label">Активных рейсов</div>
                  <div class="dashboard__card-value">42</div>
                  <div class="dashboard__card-trend">в пути</div>
                </div>
              </div>
              <div class="dashboard__map">
                <svg viewBox="0 0 300 140" preserveAspectRatio="none">
                  <path d="M10,100 Q80,30 150,70 T290,40" stroke="#1e40af" stroke-width="2.5" fill="none" stroke-dasharray="4 4"/>
                  <circle cx="10" cy="100" r="6" fill="#10b981"/>
                  <circle cx="150" cy="70" r="5" fill="#1e40af"/>
                  <circle cx="290" cy="40" r="6" fill="#ef4444"/>
                </svg>
                <span class="dashboard__map-tag">Ташкент → Алматы · 980 км</span>
              </div>
            </div>
          </div>
          <div class="hero__bg"></div>
        </div>
      </div>
    </section>`;
  };

  R.logos = () => `
    <section class="logos" data-block="logos">
      <div class="container">
        <p class="logos__title">${esc(content.logos.title)}</p>
        <div class="logos__row">
          ${(content.logos.items || []).map(l => `<div class="logos__item">${esc(l)}</div>`).join('')}
        </div>
      </div>
    </section>`;

  R.problems = () => {
    const p = content.problems;
    return `
    <section class="problems section" id="problems" data-block="problems">
      <div class="container">
        <div class="section__head">
          <span class="section__tag section__tag--red">${esc(p.tag)}</span>
          <h2 class="section__title">${esc(p.title)}</h2>
          <p class="section__subtitle">${esc(p.subtitle)}</p>
        </div>
        <div class="problems__grid">
          ${(p.items || []).map(i => `
            <article class="problem">
              <div class="problem__icon">${esc(i.icon)}</div>
              <h3>${esc(i.title)}</h3>
              <p>${esc(i.text)}</p>
            </article>`).join('')}
        </div>
      </div>
    </section>`;
  };

  R.solutions = () => {
    const s = content.solutions;
    return `
    <section class="solutions section section--alt" id="solutions" data-block="solutions">
      <div class="container">
        <div class="section__head">
          <span class="section__tag">${esc(s.tag)}</span>
          <h2 class="section__title">${esc(s.title)}</h2>
          <p class="section__subtitle">${esc(s.subtitle)}</p>
        </div>
        <div class="solutions__grid">
          ${(s.items || []).map(i => `
            <article class="solution">
              <div class="solution__icon">${SVG.icons[i.icon] || SVG.icons.route}</div>
              <h3>${esc(i.title)}</h3>
              <p>${esc(i.text)}</p>
            </article>`).join('')}
        </div>
      </div>
    </section>`;
  };

  R.benefits = () => {
    const b = content.benefits;
    return `
    <section class="benefits section" id="benefits" data-block="benefits">
      <div class="container">
        <div class="section__head">
          <span class="section__tag section__tag--green">${esc(b.tag)}</span>
          <h2 class="section__title">${esc(b.title)}</h2>
          <p class="section__subtitle">${esc(b.subtitle)}</p>
        </div>
        <div class="benefits__grid">
          ${(b.items || []).map(i => `
            <div class="benefit">
              <div class="benefit__num">${esc(i.num)}</div>
              <h3>${esc(i.title)}</h3>
              <p>${esc(i.text)}</p>
            </div>`).join('')}
        </div>
      </div>
    </section>`;
  };

  R.cases = () => {
    const c = content.cases;
    return `
    <section class="cases section section--alt" id="cases" data-block="cases">
      <div class="container">
        <div class="section__head">
          <span class="section__tag">${esc(c.tag)}</span>
          <h2 class="section__title">${esc(c.title)}</h2>
          <p class="section__subtitle">${esc(c.subtitle)}</p>
        </div>
        <div class="cases__grid">
          ${(c.items || []).map(i => `
            <article class="case">
              <div class="case__head">
                <div class="case__logo">${esc(i.logo)}</div>
                <div>
                  <h3>${esc(i.name)}</h3>
                  <p class="case__sub">${esc(i.sub)}</p>
                </div>
              </div>
              <div class="case__metrics">
                ${(i.metrics || []).map(m => `<div><b>${esc(m.v)}</b><span>${esc(m.l)}</span></div>`).join('')}
              </div>
              <p class="case__quote">«${esc(i.quote)}»</p>
            </article>`).join('')}
        </div>
      </div>
    </section>`;
  };

  R.how = () => {
    const h = content.how;
    return `
    <section class="how section" id="how" data-block="how">
      <div class="container">
        <div class="section__head">
          <span class="section__tag">${esc(h.tag)}</span>
          <h2 class="section__title">${esc(h.title)}</h2>
          <p class="section__subtitle">${esc(h.subtitle)}</p>
        </div>
        <div class="how__steps">
          ${(h.items || []).map((i, idx) => `
            <div class="how__step">
              <div class="how__num">${idx + 1}</div>
              <h3>${esc(i.title)}</h3>
              <p>${esc(i.text)}</p>
            </div>`).join('')}
        </div>
      </div>
    </section>`;
  };

  R.reviews = () => {
    const r = content.reviews;
    return `
    <section class="reviews section section--alt" data-block="reviews">
      <div class="container">
        <div class="section__head">
          <span class="section__tag">${esc(r.tag)}</span>
          <h2 class="section__title">${esc(r.title)}</h2>
        </div>
        <div class="reviews__grid">
          ${(r.items || []).map(i => `
            <article class="review">
              <div class="review__stars">${'★'.repeat(i.stars || 5)}</div>
              <p>${esc(i.text)}</p>
              <div class="review__author">
                <div class="review__avatar">${esc(i.avatar)}</div>
                <div>
                  <b>${esc(i.name)}</b>
                  <span>${esc(i.role)}</span>
                </div>
              </div>
            </article>`).join('')}
        </div>
      </div>
    </section>`;
  };

  R.lead = () => {
    const l = content.lead;
    return `
    <section class="lead section" id="lead" data-block="lead">
      <div class="container">
        <div class="lead__inner">
          <div class="lead__info">
            <span class="section__tag section__tag--white">${esc(l.tag)}</span>
            <h2 class="lead__title">${esc(l.title)}</h2>
            <p class="lead__subtitle">${esc(l.subtitle)}</p>
            <ul class="lead__bullets">
              ${(l.bullets || []).map(b => `<li>${esc(b)}</li>`).join('')}
            </ul>
            <div class="lead__messengers">
              <a href="https://wa.me/${esc(content.site.whatsapp)}" class="msg msg--wa" target="_blank" rel="noopener" data-event="lead_whatsapp">${SVG.wa}WhatsApp</a>
              <a href="https://t.me/${esc(content.site.telegram)}" class="msg msg--tg" target="_blank" rel="noopener" data-event="lead_telegram">${SVG.tg}Telegram</a>
            </div>
          </div>
          <form class="lead__form" id="leadForm" novalidate>
            <h3 class="lead__form-title">${esc(l.formTitle)}</h3>
            <div class="form__row">
              <label class="form__label"><span>Ваше имя <em>*</em></span><input type="text" name="name" required placeholder="Алишер" autocomplete="name"/></label>
            </div>
            <div class="form__row">
              <label class="form__label"><span>Телефон <em>*</em></span><input type="tel" name="phone" required placeholder="+998 90 123 45 67" autocomplete="tel"/></label>
            </div>
            <div class="form__row form__row--collapse" id="extendedFields">
              <label class="form__label"><span>Email</span><input type="email" name="email" placeholder="you@company.uz" autocomplete="email"/></label>
              <label class="form__label"><span>Компания</span><input type="text" name="company" placeholder="Название компании" autocomplete="organization"/></label>
              <label class="form__label"><span>Размер автопарка</span>
                <select name="fleet">
                  <option value="">Выберите</option>
                  <option>До 10 ТС</option><option>10–50 ТС</option><option>50–100 ТС</option><option>Более 100 ТС</option>
                </select>
              </label>
            </div>
            <button type="button" class="form__toggle" id="toggleExtended">+ Расширенная форма (для B2B)</button>
            <label class="form__check"><input type="checkbox" required checked/><span>Я согласен на обработку персональных данных</span></label>
            <button type="submit" class="btn btn--primary btn--lg btn--block" data-event="lead_submit">${esc(l.submitText)}</button>
            <p class="form__hint">Перезвоним в течение 15 минут (Пн–Сб, 9:00–18:00)</p>
            <div class="form__success" id="formSuccess" hidden>
              <div class="form__success-icon">✓</div>
              <h3>Заявка отправлена!</h3>
              <p>${esc(l.successText)}</p>
            </div>
          </form>
        </div>
      </div>
    </section>`;
  };

  R.faq = () => {
    const f = content.faq;
    return `
    <section class="faq section" id="faq" data-block="faq">
      <div class="container">
        <div class="section__head">
          <span class="section__tag">${esc(f.tag)}</span>
          <h2 class="section__title">${esc(f.title)}</h2>
        </div>
        <div class="faq__list">
          ${(f.items || []).map(i => `
            <details class="faq__item">
              <summary>${esc(i.q)}</summary>
              <p>${esc(i.a)}</p>
            </details>`).join('')}
        </div>
      </div>
    </section>`;
  };

  R.finalCta = () => {
    const f = content.finalCta;
    return `
    <section class="final-cta" data-block="finalCta">
      <div class="container">
        <div class="final-cta__inner">
          <h2>${esc(f.title)}</h2>
          <p>${esc(f.subtitle)}</p>
          <div class="final-cta__buttons">
            <a href="#lead" class="btn btn--white btn--lg">${esc(f.ctaPrimary)}</a>
            <a href="https://wa.me/${esc(content.site.whatsapp)}" class="btn btn--ghost-light btn--lg" target="_blank" rel="noopener">${esc(f.ctaSecondary)}</a>
          </div>
        </div>
      </div>
    </section>`;
  };

  R.footer = () => {
    const f = content.footer;
    return `
    <footer class="footer" data-block="footer">
      <div class="container">
        <div class="footer__grid">
          <div>
            <a href="#" class="logo logo--light">
              <span class="logo__mark">${esc(content.site.logoMark)}</span>
              <span class="logo__text">${esc(content.site.logoText)}</span>
            </a>
            <p class="footer__about">${esc(f.about)}</p>
          </div>
          ${(f.columns || []).map(col => `
            <div>
              <h4>${esc(col.title)}</h4>
              <ul>
                ${(col.links || []).map(l => `<li><a href="${esc(l.href)}">${esc(l.label)}</a></li>`).join('')}
              </ul>
            </div>`).join('')}
          <div>
            <h4>Контакты</h4>
            <ul>
              <li><a href="tel:${esc(content.site.phoneTel)}">${esc(content.site.phone)}</a></li>
              <li><a href="mailto:${esc(content.site.email)}">${esc(content.site.email)}</a></li>
              <li>${esc(content.site.address)}</li>
              <li>${esc(content.site.schedule)}</li>
            </ul>
          </div>
        </div>
        <div class="footer__bottom">
          <p>© ${esc(content.site.year)} ${esc(content.site.logoText)}. Все права защищены.</p>
          <p>${esc(content.site.inn)} · ${esc(content.site.company)}</p>
        </div>
      </div>
    </footer>`;
  };

  R.stickyMsg = () => `
    <div class="sticky-msg">
      <a href="https://wa.me/${esc(content.site.whatsapp)}" class="sticky-msg__btn sticky-msg__btn--wa" target="_blank" rel="noopener" aria-label="WhatsApp" data-event="sticky_whatsapp">${SVG.wa}</a>
      <a href="https://t.me/${esc(content.site.telegram)}" class="sticky-msg__btn sticky-msg__btn--tg" target="_blank" rel="noopener" aria-label="Telegram" data-event="sticky_telegram">${SVG.tg}</a>
    </div>`;

  // ---------- Render ----------
  const blocks = content.blocks || {};
  const order = Object.keys(blocks)
    .filter(k => blocks[k].enabled !== false && R[k])
    .sort((a, b) => (blocks[a].order || 0) - (blocks[b].order || 0));

  const html = order.map(k => R[k]()).join('') + R.stickyMsg();
  document.getElementById('app').innerHTML = html;

  // ---------- Behaviors ----------
  initBehaviors();

  function initBehaviors() {
    // Burger
    const burger = document.querySelector('.burger');
    const nav = document.querySelector('.nav');
    if (burger && nav) {
      burger.addEventListener('click', () => {
        const open = nav.classList.toggle('is-open');
        if (open) nav.style.cssText = 'display:flex;flex-direction:column;position:absolute;top:72px;left:0;right:0;background:#fff;padding:20px;border-bottom:1px solid var(--border);box-shadow:var(--shadow);';
        else nav.removeAttribute('style');
      });
      nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
        nav.classList.remove('is-open'); nav.removeAttribute('style');
      }));
    }

    // Smooth scroll
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        const id = a.getAttribute('href');
        if (id.length > 1) {
          const el = document.querySelector(id);
          if (el) {
            e.preventDefault();
            const top = el.getBoundingClientRect().top + window.pageYOffset - 80;
            window.scrollTo({ top, behavior: 'smooth' });
          }
        }
      });
    });

    // Form
    const toggleBtn = document.getElementById('toggleExtended');
    const ext = document.getElementById('extendedFields');
    if (toggleBtn && ext) {
      toggleBtn.addEventListener('click', () => {
        const open = ext.classList.toggle('is-open');
        toggleBtn.textContent = open ? '− Скрыть расширенные поля' : '+ Расширенная форма (для B2B)';
      });
    }

    const form = document.getElementById('leadForm');
    const success = document.getElementById('formSuccess');
    if (form) {
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const data = {
          name: form.name.value.trim(),
          phone: form.phone.value.trim(),
          email: form.email?.value.trim() || '',
          company: form.company?.value.trim() || '',
          fleet: form.fleet?.value || '',
          page: location.href,
          utm: {
            source: getParam('utm_source'), medium: getParam('utm_medium'),
            campaign: getParam('utm_campaign'), term: getParam('utm_term'), content: getParam('utm_content')
          },
          timestamp: new Date().toISOString()
        };
        if (!data.name || data.phone.length < 9) { alert('Укажите имя и корректный телефон.'); return; }
        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true; btn.textContent = 'Отправляем...';
        try {
          const url = content.lead?.webhookUrl || '';
          if (url) {
            await fetch(url, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) });
          } else {
            console.log('[LEAD]', data);
            await new Promise(r => setTimeout(r, 600));
          }
          trackConversion('lead_form', data);
          if (success) success.hidden = false;
          form.reset();
        } catch (err) {
          console.error(err); alert('Ошибка отправки. Попробуйте через WhatsApp.');
        } finally {
          btn.disabled = false; btn.textContent = content.lead?.submitText || 'Отправить';
        }
      });
    }

    // Track CTA
    document.querySelectorAll('[data-event]').forEach(el => {
      el.addEventListener('click', () => trackEvent(el.dataset.event, { label: el.textContent.trim() }));
    });

    // Reveal on scroll
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          en.target.style.opacity = '1';
          en.target.style.transform = 'translateY(0)';
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.problem,.solution,.benefit,.case,.how__step,.review').forEach((el, i) => {
      el.style.opacity = '0'; el.style.transform = 'translateY(20px)';
      el.style.transition = `opacity .6s ease ${i * 50}ms, transform .6s ease ${i * 50}ms`;
      io.observe(el);
    });
  }

  function getParam(n) { return new URLSearchParams(location.search).get(n) || ''; }
  function trackEvent(name, params = {}) {
    if (typeof gtag === 'function') gtag('event', name, params);
    if (typeof fbq === 'function') fbq('trackCustom', name, params);
    console.log('[track]', name, params);
  }
  function trackConversion(type) {
    if (typeof gtag === 'function') gtag('event', 'generate_lead', { currency: 'UZS', value: 1, lead_type: type });
    if (typeof fbq === 'function') fbq('track', 'Lead', { content_name: type });
  }
})();
