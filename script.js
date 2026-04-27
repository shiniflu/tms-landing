/* ===========================================================
   LogisTMS Landing — interactions
   =========================================================== */

(function () {
  'use strict';

  // ---------- Burger / mobile nav ----------
  const burger = document.querySelector('.burger');
  const nav = document.querySelector('.nav');
  if (burger && nav) {
    burger.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', open);
      if (open) {
        nav.style.cssText = 'display:flex;flex-direction:column;position:absolute;top:72px;left:0;right:0;background:#fff;padding:20px;border-bottom:1px solid var(--border);box-shadow:var(--shadow);';
      } else {
        nav.removeAttribute('style');
      }
    });
    // close on link click
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      nav.classList.remove('is-open');
      nav.removeAttribute('style');
      burger.setAttribute('aria-expanded', 'false');
    }));
  }

  // ---------- Smooth scroll for hash links ----------
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const id = anchor.getAttribute('href');
      if (id.length > 1) {
        const el = document.querySelector(id);
        if (el) {
          e.preventDefault();
          const offset = 80;
          const top = el.getBoundingClientRect().top + window.pageYOffset - offset;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      }
    });
  });

  // ---------- Form: extended fields toggle ----------
  const toggleBtn = document.getElementById('toggleExtended');
  const extendedFields = document.getElementById('extendedFields');
  if (toggleBtn && extendedFields) {
    toggleBtn.addEventListener('click', () => {
      const isOpen = extendedFields.classList.toggle('is-open');
      toggleBtn.textContent = isOpen
        ? '− Скрыть расширенные поля'
        : '+ Расширенная форма (для B2B)';
    });
  }

  // ---------- Form submission ----------
  const form = document.getElementById('leadForm');
  const success = document.getElementById('formSuccess');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const data = {
        name:    form.name.value.trim(),
        phone:   form.phone.value.trim(),
        email:   form.email ? form.email.value.trim() : '',
        company: form.company ? form.company.value.trim() : '',
        fleet:   form.fleet ? form.fleet.value : '',
        page:    window.location.href,
        utm: {
          source:   getParam('utm_source'),
          medium:   getParam('utm_medium'),
          campaign: getParam('utm_campaign'),
          term:     getParam('utm_term'),
          content:  getParam('utm_content'),
        },
        timestamp: new Date().toISOString(),
      };

      // basic validation
      if (!data.name || data.phone.length < 9) {
        alert('Пожалуйста, укажите имя и корректный номер телефона.');
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Отправляем...';

      try {
        // ============ CRM WEBHOOK INTEGRATION ============
        // Replace YOUR_WEBHOOK_URL with real endpoint (AmoCRM, Bitrix24, custom backend)
        const WEBHOOK_URL = ''; // e.g. 'https://your-crm.com/webhook/lead'

        if (WEBHOOK_URL) {
          await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
        } else {
          // dev/demo fallback — just log the payload
          console.log('[LEAD]', data);
          await new Promise(r => setTimeout(r, 600));
        }

        // ============ CONVERSION TRACKING ============
        trackConversion('lead_form', data);

        // show success
        if (success) success.hidden = false;
        form.reset();
      } catch (err) {
        console.error(err);
        alert('Ошибка отправки. Попробуйте написать в WhatsApp.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Получить консультацию';
      }
    });
  }

  // ---------- CTA event tracking ----------
  document.querySelectorAll('[data-event]').forEach(el => {
    el.addEventListener('click', () => {
      const event = el.dataset.event;
      trackEvent(event, { label: el.textContent.trim() });
    });
  });

  // ---------- helpers ----------
  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name) || '';
  }

  function trackEvent(name, params = {}) {
    // Google Analytics 4
    if (typeof gtag === 'function') {
      gtag('event', name, params);
    }
    // Meta Pixel
    if (typeof fbq === 'function') {
      fbq('trackCustom', name, params);
    }
    // Yandex.Metrika
    if (typeof ym === 'function') {
      // replace XXXXXXXX with your counter ID
      // ym(XXXXXXXX, 'reachGoal', name, params);
    }
    console.log('[track]', name, params);
  }

  function trackConversion(type, data) {
    if (typeof gtag === 'function') {
      gtag('event', 'generate_lead', {
        currency: 'UZS',
        value: 1,
        lead_type: type,
      });
    }
    if (typeof fbq === 'function') {
      fbq('track', 'Lead', { content_name: type });
    }
    if (typeof ym === 'function') {
      // ym(XXXXXXXX, 'reachGoal', 'lead_submit');
    }
    console.log('[conversion]', type, data);
  }

  // ---------- Reveal on scroll (lightweight) ----------
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll(
    '.problem, .solution, .benefit, .case, .how__step, .review'
  ).forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = `opacity .6s ease ${i * 50}ms, transform .6s ease ${i * 50}ms`;
    io.observe(el);
  });

})();
