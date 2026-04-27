/* ===========================================================
   LogisTMS Admin — visual content editor
   Saves content.json to GitHub via API
   =========================================================== */

(function () {
  'use strict';

  // ============ CONFIG ============
  // Default password — change this and re-deploy
  const ADMIN_PASSWORD = 'admin123';

  // GitHub repo info
  const REPO_OWNER = 'shiniflu';
  const REPO_NAME  = 'tms-landing';
  const REPO_BRANCH = 'main';
  const FILE_PATH  = 'content.json';

  // ============ STATE ============
  let token = '';
  let content = null;
  let fileSha = null;
  let activeBlock = null;

  const BLOCK_LABELS = {
    header: '🔹 Шапка', hero: '🚀 Hero (первый экран)', logos: '🏢 Логотипы клиентов',
    problems: '⚠️ Проблемы', solutions: '💡 Решения / Возможности', benefits: '✨ Преимущества',
    cases: '📊 Кейсы', how: '🛠 Как это работает', reviews: '⭐ Отзывы',
    lead: '📝 Лид-форма', faq: '❓ FAQ', finalCta: '🎯 Финальный CTA', footer: '📌 Подвал'
  };

  // ============ DOM ============
  const $ = (s, p = document) => p.querySelector(s);
  const loginScreen = $('#loginScreen');
  const editorScreen = $('#editorScreen');
  const loginForm = $('#loginForm');
  const loginError = $('#loginError');
  const blockList = $('#blockList');
  const editorPanel = $('#editorPanel');
  const siteFields = $('#siteFields');
  const repoBadge = $('#repoBadge');
  const toast = $('#toast');

  // ============ INIT ============
  init();

  function init() {
    // restore token if remembered
    const saved = localStorage.getItem('admin_token');
    const savedAuth = sessionStorage.getItem('admin_auth') === '1';
    if (saved && savedAuth) {
      token = saved;
      enterEditor();
    }

    loginForm.addEventListener('submit', handleLogin);
    $('#saveBtn').addEventListener('click', handleSave);
    $('#reloadBtn').addEventListener('click', () => loadContent(true));
    $('#logoutBtn').addEventListener('click', logout);
  }

  // ============ AUTH ============
  async function handleLogin(e) {
    e.preventDefault();
    loginError.hidden = true;

    const pass = $('#loginPassword').value;
    const tok  = $('#loginToken').value.trim();
    const remember = $('#loginRemember').checked;

    console.log('[admin] login attempt, password length:', pass.length, 'token prefix:', tok.slice(0, 8));

    if (!pass) {
      return showLoginError('Введите пароль админки');
    }
    if (pass !== ADMIN_PASSWORD) {
      return showLoginError('Неверный пароль админки. По умолчанию: admin123');
    }
    if (!tok) {
      return showLoginError('Введите GitHub токен');
    }
    if (!tok.startsWith('ghp_') && !tok.startsWith('github_pat_')) {
      return showLoginError('Неверный формат токена. Должен начинаться с ghp_ или github_pat_');
    }

    token = tok;
    sessionStorage.setItem('admin_auth', '1');
    if (remember) localStorage.setItem('admin_token', tok);
    else localStorage.removeItem('admin_token');

    showLoginError('⏳ Проверяем токен...');
    loginError.style.background = '#dbeafe';
    loginError.style.color = '#1e40af';

    try {
      await enterEditor();
    } catch (err) {
      // restore error styles
      loginError.style.background = '';
      loginError.style.color = '';
      // bring login back if editor failed to load
      loginScreen.hidden = false;
      editorScreen.hidden = true;
      showLoginError('Ошибка GitHub API: ' + err.message + '. Проверьте токен и доступ к репозиторию.');
    }
  }

  function logout() {
    token = '';
    sessionStorage.removeItem('admin_auth');
    localStorage.removeItem('admin_token');
    location.reload();
  }

  function showLoginError(msg) {
    loginError.textContent = msg;
    loginError.hidden = false;
  }

  async function enterEditor() {
    // load FIRST, then switch screens (so login error UI can stay if it fails)
    await loadContent();
    loginScreen.hidden = true;
    editorScreen.hidden = false;
    repoBadge.textContent = `${REPO_OWNER}/${REPO_NAME}`;
  }

  // ============ GITHUB API ============
  async function gh(path, options = {}) {
    const url = `https://api.github.com${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(options.headers || {})
      }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return res.json();
  }

  async function loadContent(showMsg = false) {
    const data = await gh(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}?ref=${REPO_BRANCH}`);
    fileSha = data.sha;
    const text = decodeBase64Utf8(data.content);
    content = JSON.parse(text);
    renderUI();
    if (showMsg) showToast('Перезагружено с GitHub', 'success');
  }

  async function handleSave() {
    const btn = $('#saveBtn');
    btn.disabled = true;
    const orig = btn.textContent;
    btn.textContent = '⏳ Сохраняем...';

    try {
      const json = JSON.stringify(content, null, 2) + '\n';
      const data = await gh(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
        method: 'PUT',
        body: JSON.stringify({
          message: `Update content via admin (${new Date().toISOString().slice(0, 16)})`,
          content: encodeBase64Utf8(json),
          sha: fileSha,
          branch: REPO_BRANCH
        })
      });
      fileSha = data.content.sha;
      showToast('✓ Сохранено! Сайт обновится через ~30 сек', 'success');
    } catch (e) {
      console.error(e);
      showToast('Ошибка сохранения: ' + e.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = orig;
    }
  }

  // base64 with utf-8 support
  function encodeBase64Utf8(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }
  function decodeBase64Utf8(b64) {
    return decodeURIComponent(escape(atob(b64.replace(/\s/g, ''))));
  }

  // ============ UI RENDER ============
  function renderUI() {
    renderBlockList();
    renderSiteFields();
    if (activeBlock) selectBlock(activeBlock);
  }

  function renderBlockList() {
    blockList.innerHTML = '';
    const blocks = content.blocks || {};
    const order = Object.keys(blocks).sort((a, b) => (blocks[a].order || 0) - (blocks[b].order || 0));

    order.forEach(key => {
      const li = document.createElement('li');
      li.dataset.key = key;
      li.draggable = true;
      const enabled = blocks[key].enabled !== false;
      li.innerHTML = `
        <span class="drag" title="Перетащить">⋮⋮</span>
        <span class="name">${BLOCK_LABELS[key] || key}</span>
        <span class="toggle ${enabled ? 'on' : ''}" title="Скрыть/показать"></span>
      `;
      if (activeBlock === key) li.classList.add('active');

      // click to select
      li.addEventListener('click', e => {
        if (e.target.classList.contains('toggle')) return;
        if (e.target.classList.contains('drag')) return;
        selectBlock(key);
      });

      // toggle
      li.querySelector('.toggle').addEventListener('click', e => {
        e.stopPropagation();
        blocks[key].enabled = !blocks[key].enabled;
        renderBlockList();
      });

      // drag
      li.addEventListener('dragstart', () => li.classList.add('dragging'));
      li.addEventListener('dragend', () => {
        li.classList.remove('dragging');
        // re-assign order
        [...blockList.children].forEach((el, idx) => {
          if (content.blocks[el.dataset.key]) content.blocks[el.dataset.key].order = idx + 1;
        });
      });

      blockList.appendChild(li);
    });

    blockList.addEventListener('dragover', e => {
      e.preventDefault();
      const dragging = blockList.querySelector('.dragging');
      if (!dragging) return;
      const after = getDragAfterElement(blockList, e.clientY);
      if (after == null) blockList.appendChild(dragging);
      else blockList.insertBefore(dragging, after);
    });
  }

  function getDragAfterElement(container, y) {
    const els = [...container.querySelectorAll('li:not(.dragging)')];
    return els.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) return { offset, element: child };
      return closest;
    }, { offset: -Infinity }).element;
  }

  function renderSiteFields() {
    const s = content.site || {};
    const fields = [
      { key: 'logoText',  label: 'Название' },
      { key: 'phone',     label: 'Телефон (отображение)' },
      { key: 'phoneTel',  label: 'Телефон для звонка' },
      { key: 'whatsapp',  label: 'WhatsApp (без +)' },
      { key: 'telegram',  label: 'Telegram username' },
      { key: 'email',     label: 'Email' }
    ];
    siteFields.innerHTML = fields.map(f => `
      <div class="fld">
        <label>${f.label}</label>
        <input type="text" value="${escAttr(s[f.key] || '')}" data-site="${f.key}" />
      </div>
    `).join('');

    siteFields.querySelectorAll('input').forEach(inp => {
      inp.addEventListener('input', () => {
        content.site[inp.dataset.site] = inp.value;
      });
    });
  }

  function selectBlock(key) {
    activeBlock = key;
    [...blockList.children].forEach(li => li.classList.toggle('active', li.dataset.key === key));
    renderEditor(key);
  }

  // ============ EDITOR PANELS ============
  function renderEditor(key) {
    const data = content[key];
    const label = BLOCK_LABELS[key] || key;

    const panels = {
      hero:      renderHero,
      logos:     renderLogos,
      problems:  () => renderTagTitleItems('problems', ['icon', 'title', 'text']),
      solutions: () => renderSolutions(),
      benefits:  () => renderTagTitleItems('benefits', ['num', 'title', 'text']),
      cases:     renderCases,
      how:       () => renderTagTitleItems('how', ['title', 'text']),
      reviews:   renderReviews,
      lead:      renderLead,
      faq:       renderFaq,
      finalCta:  renderFinalCta,
      footer:    renderFooter,
      header:    renderHeader
    };

    const fn = panels[key];
    if (!fn) {
      editorPanel.innerHTML = `<div class="panel__empty"><h2>${label}</h2><p>Этот блок не редактируется в админке.</p></div>`;
      return;
    }

    editorPanel.innerHTML = `
      <div class="panel__head">
        <h2>${label}</h2>
        <span class="pill">/${key}</span>
      </div>
      <div class="fields" id="fields"></div>
    `;
    fn();
    bindFields();
  }

  // ----- builders -----
  function field(label, value, path, type = 'text', hint = '') {
    const v = escAttr(value || '');
    if (type === 'textarea') {
      return `
        <div class="field">
          <label>${label}</label>
          <textarea data-path="${path}">${escHtml(value || '')}</textarea>
          ${hint ? `<span class="hint">${hint}</span>` : ''}
        </div>`;
    }
    return `
      <div class="field">
        <label>${label}</label>
        <input type="${type}" value="${v}" data-path="${path}" />
        ${hint ? `<span class="hint">${hint}</span>` : ''}
      </div>`;
  }
  function row(...html) { return `<div class="field--row">${html.join('')}</div>`; }

  function bindFields() {
    editorPanel.querySelectorAll('[data-path]').forEach(el => {
      el.addEventListener('input', () => setByPath(content, el.dataset.path, el.value));
    });
  }

  function setByPath(obj, path, value) {
    const parts = path.split('.');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (!(p in cur)) cur[p] = isNaN(parts[i + 1]) ? {} : [];
      cur = cur[p];
    }
    cur[parts[parts.length - 1]] = value;
  }

  // ----- HEADER -----
  function renderHeader() {
    const f = $('#fields');
    const nav = content.nav || [];
    f.innerHTML = `
      <p class="hint">Шапка наследует контакты из «Настроек сайта» в боковой панели.</p>
      <div class="field">
        <label>Пункты меню</label>
        <div class="items" id="navItems">
          ${nav.map((n, i) => navItem(n, i)).join('')}
        </div>
        <button class="add-item" id="addNav">+ Добавить пункт</button>
      </div>
    `;
    bindArrayHandlers('nav', '#navItems', '#addNav', () => ({ href: '#', label: 'Новый пункт' }), navItem);
  }
  function navItem(n, i) {
    return `
      <div class="item-card" data-index="${i}">
        <div class="item-card__head">
          <b>Пункт #${i + 1}</b>
          <div class="item-card__actions">
            <button class="icon-btn" data-act="up" title="Вверх">↑</button>
            <button class="icon-btn" data-act="down" title="Вниз">↓</button>
            <button class="icon-btn icon-btn--danger" data-act="del" title="Удалить">✕</button>
          </div>
        </div>
        ${row(
          field('Текст', n.label, `nav.${i}.label`),
          field('Ссылка (href)', n.href, `nav.${i}.href`)
        )}
      </div>`;
  }

  // ----- HERO -----
  function renderHero() {
    const h = content.hero;
    const f = $('#fields');
    f.innerHTML = `
      ${field('Бейдж сверху', h.badge, 'hero.badge')}
      ${row(
        field('Заголовок', h.title, 'hero.title'),
        field('Цветная часть заголовка', h.titleAccent, 'hero.titleAccent')
      )}
      ${field('Подзаголовок (можно &lt;b&gt; и &lt;i&gt;)', h.subtitle, 'hero.subtitle', 'textarea', 'Поддерживает HTML-теги для выделения')}
      ${row(
        field('Текст основной кнопки', h.ctaPrimary, 'hero.ctaPrimary'),
        field('Текст второй кнопки', h.ctaSecondary, 'hero.ctaSecondary')
      )}

      <div class="field">
        <label>Буллеты под заголовком</label>
        <div class="bullet-list" id="heroBullets">
          ${(h.bullets || []).map((b, i) => bulletRow(b, `hero.bullets.${i}`, i)).join('')}
        </div>
        <button class="add-item" id="addHeroBullet">+ Добавить буллет</button>
      </div>

      <div class="field">
        <label>Соцдоказательства (3 цифры)</label>
        <div class="items" id="heroTrust">
          ${(h.trust || []).map((t, i) => `
            <div class="item-card" data-index="${i}">
              <div class="item-card__head"><b>#${i + 1}</b>
                <div class="item-card__actions">
                  <button class="icon-btn icon-btn--danger" data-act="del">✕</button>
                </div>
              </div>
              ${row(
                field('Цифра', t.value, `hero.trust.${i}.value`),
                field('Подпись', t.label, `hero.trust.${i}.label`)
              )}
            </div>
          `).join('')}
        </div>
        <button class="add-item" id="addTrust">+ Добавить</button>
      </div>
    `;
    bindBullets('hero.bullets', '#heroBullets', '#addHeroBullet');
    bindArrayHandlers('hero.trust', '#heroTrust', '#addTrust',
      () => ({ value: '0', label: 'Подпись' }),
      (t, i) => `
        <div class="item-card" data-index="${i}">
          <div class="item-card__head"><b>#${i + 1}</b>
            <div class="item-card__actions"><button class="icon-btn icon-btn--danger" data-act="del">✕</button></div>
          </div>
          ${row(field('Цифра', t.value, `hero.trust.${i}.value`), field('Подпись', t.label, `hero.trust.${i}.label`))}
        </div>`);
  }

  // ----- LOGOS -----
  function renderLogos() {
    const l = content.logos;
    const f = $('#fields');
    f.innerHTML = `
      ${field('Заголовок', l.title, 'logos.title')}
      <div class="field">
        <label>Логотипы (просто текст)</label>
        <div class="bullet-list" id="logoItems">
          ${(l.items || []).map((it, i) => bulletRow(it, `logos.items.${i}`, i)).join('')}
        </div>
        <button class="add-item" id="addLogo">+ Добавить логотип</button>
      </div>
    `;
    bindBullets('logos.items', '#logoItems', '#addLogo');
  }

  // ----- generic tag/title/items -----
  function renderTagTitleItems(blockKey, fields) {
    const b = content[blockKey];
    const f = $('#fields');

    const itemHtml = (it, i) => `
      <div class="item-card" data-index="${i}">
        <div class="item-card__head">
          <b>${blockKey === 'how' ? `Шаг ${i + 1}` : `Карточка #${i + 1}`}</b>
          <div class="item-card__actions">
            <button class="icon-btn" data-act="up">↑</button>
            <button class="icon-btn" data-act="down">↓</button>
            <button class="icon-btn icon-btn--danger" data-act="del">✕</button>
          </div>
        </div>
        ${fields.map(fname => field(
          fname === 'icon' ? 'Эмодзи (1 символ)' :
          fname === 'num' ? 'Большая цифра (например, −18%, ×2)' :
          fname === 'title' ? 'Заголовок' :
          fname === 'text' ? 'Описание' : fname,
          it[fname],
          `${blockKey}.items.${i}.${fname}`,
          fname === 'text' ? 'textarea' : 'text'
        )).join('')}
      </div>`;

    f.innerHTML = `
      ${field('Тег (бейдж сверху)', b.tag, `${blockKey}.tag`)}
      ${field('Заголовок', b.title, `${blockKey}.title`)}
      ${field('Подзаголовок', b.subtitle, `${blockKey}.subtitle`, 'textarea')}
      <div class="field">
        <label>Карточки</label>
        <div class="items" id="items">
          ${(b.items || []).map(itemHtml).join('')}
        </div>
        <button class="add-item" id="addItem">+ Добавить</button>
      </div>
    `;

    const newItem = () => {
      const o = {};
      fields.forEach(fn => {
        o[fn] = fn === 'icon' ? '✨' : fn === 'num' ? '+0%' : fn === 'title' ? 'Новый заголовок' : 'Описание';
      });
      return o;
    };
    bindArrayHandlers(`${blockKey}.items`, '#items', '#addItem', newItem, itemHtml);
  }

  // ----- SOLUTIONS (special: icon select) -----
  function renderSolutions() {
    const b = content.solutions;
    const f = $('#fields');
    const ICONS = ['route', 'fuel', 'gps', 'chart', 'doc', 'integrate'];

    const itemHtml = (it, i) => `
      <div class="item-card" data-index="${i}">
        <div class="item-card__head">
          <b>Решение #${i + 1}</b>
          <div class="item-card__actions">
            <button class="icon-btn" data-act="up">↑</button>
            <button class="icon-btn" data-act="down">↓</button>
            <button class="icon-btn icon-btn--danger" data-act="del">✕</button>
          </div>
        </div>
        ${row(
          `<div class="field"><label>Иконка</label>
            <select data-path="solutions.items.${i}.icon">
              ${ICONS.map(ic => `<option value="${ic}" ${ic === it.icon ? 'selected' : ''}>${ic}</option>`).join('')}
            </select>
          </div>`,
          field('Заголовок', it.title, `solutions.items.${i}.title`)
        )}
        ${field('Описание', it.text, `solutions.items.${i}.text`, 'textarea')}
      </div>`;

    f.innerHTML = `
      ${field('Тег', b.tag, 'solutions.tag')}
      ${field('Заголовок', b.title, 'solutions.title')}
      ${field('Подзаголовок', b.subtitle, 'solutions.subtitle', 'textarea')}
      <div class="field">
        <label>Решения</label>
        <div class="items" id="items">${(b.items || []).map(itemHtml).join('')}</div>
        <button class="add-item" id="addItem">+ Добавить</button>
      </div>
    `;
    bindArrayHandlers('solutions.items', '#items', '#addItem',
      () => ({ icon: 'route', title: 'Новый модуль', text: 'Описание' }), itemHtml);
  }

  // ----- CASES -----
  function renderCases() {
    const b = content.cases;
    const f = $('#fields');

    const metric = (m, i, j) => `
      <div class="field">
        ${row(
          field('Цифра', m.v, `cases.items.${i}.metrics.${j}.v`),
          field('Подпись', m.l, `cases.items.${i}.metrics.${j}.l`)
        )}
      </div>`;

    const itemHtml = (it, i) => `
      <div class="item-card" data-index="${i}">
        <div class="item-card__head">
          <b>Кейс #${i + 1}</b>
          <div class="item-card__actions">
            <button class="icon-btn" data-act="up">↑</button>
            <button class="icon-btn" data-act="down">↓</button>
            <button class="icon-btn icon-btn--danger" data-act="del">✕</button>
          </div>
        </div>
        ${row(
          field('Логотип (2 буквы)', it.logo, `cases.items.${i}.logo`),
          field('Название клиента', it.name, `cases.items.${i}.name`)
        )}
        ${field('Описание (парк, тип перевозок)', it.sub, `cases.items.${i}.sub`)}
        ${field('Цитата / результат', it.quote, `cases.items.${i}.quote`, 'textarea')}
        <div class="field"><label>3 метрики результата</label>
          <div class="metrics-grid">${(it.metrics || []).map((m, j) => metric(m, i, j)).join('')}</div>
        </div>
      </div>`;

    f.innerHTML = `
      ${field('Тег', b.tag, 'cases.tag')}
      ${field('Заголовок', b.title, 'cases.title')}
      ${field('Подзаголовок', b.subtitle, 'cases.subtitle', 'textarea')}
      <div class="field">
        <label>Кейсы</label>
        <div class="items" id="items">${(b.items || []).map(itemHtml).join('')}</div>
        <button class="add-item" id="addItem">+ Добавить кейс</button>
      </div>
    `;
    bindArrayHandlers('cases.items', '#items', '#addItem',
      () => ({ logo: 'XX', name: 'Новый клиент', sub: 'Парк ХХ ТС', quote: 'Результат внедрения...',
        metrics: [{v:'+0%',l:'метрика'},{v:'+0%',l:'метрика'},{v:'+0%',l:'метрика'}] }), itemHtml);
  }

  // ----- REVIEWS -----
  function renderReviews() {
    const b = content.reviews;
    const f = $('#fields');

    const itemHtml = (it, i) => `
      <div class="item-card" data-index="${i}">
        <div class="item-card__head">
          <b>Отзыв #${i + 1}</b>
          <div class="item-card__actions">
            <button class="icon-btn" data-act="up">↑</button>
            <button class="icon-btn" data-act="down">↓</button>
            <button class="icon-btn icon-btn--danger" data-act="del">✕</button>
          </div>
        </div>
        ${field('Текст отзыва', it.text, `reviews.items.${i}.text`, 'textarea')}
        ${row(
          field('Имя', it.name, `reviews.items.${i}.name`),
          field('Должность', it.role, `reviews.items.${i}.role`)
        )}
        ${row(
          field('Аватар (2 буквы)', it.avatar, `reviews.items.${i}.avatar`),
          field('Звёзды (1-5)', it.stars, `reviews.items.${i}.stars`)
        )}
      </div>`;

    f.innerHTML = `
      ${field('Тег', b.tag, 'reviews.tag')}
      ${field('Заголовок', b.title, 'reviews.title')}
      <div class="field">
        <label>Отзывы</label>
        <div class="items" id="items">${(b.items || []).map(itemHtml).join('')}</div>
        <button class="add-item" id="addItem">+ Добавить отзыв</button>
      </div>
    `;
    bindArrayHandlers('reviews.items', '#items', '#addItem',
      () => ({ stars: 5, text: 'Текст отзыва...', name: 'Имя', role: 'Должность', avatar: 'ХХ' }), itemHtml);
  }

  // ----- LEAD -----
  function renderLead() {
    const l = content.lead;
    const f = $('#fields');
    f.innerHTML = `
      ${field('Тег', l.tag, 'lead.tag')}
      ${field('Заголовок', l.title, 'lead.title')}
      ${field('Подзаголовок', l.subtitle, 'lead.subtitle', 'textarea')}
      ${row(
        field('Заголовок формы', l.formTitle, 'lead.formTitle'),
        field('Текст кнопки', l.submitText, 'lead.submitText')
      )}
      ${field('Текст после успешной отправки', l.successText, 'lead.successText', 'textarea')}
      ${field('CRM Webhook URL (для отправки заявок)', l.webhookUrl, 'lead.webhookUrl', 'text', 'AmoCRM, Bitrix24, ваш бэкенд. Оставьте пустым для тестирования.')}
      <div class="field">
        <label>Буллеты в форме</label>
        <div class="bullet-list" id="leadBullets">
          ${(l.bullets || []).map((b, i) => bulletRow(b, `lead.bullets.${i}`, i)).join('')}
        </div>
        <button class="add-item" id="addLeadBullet">+ Добавить</button>
      </div>
    `;
    bindBullets('lead.bullets', '#leadBullets', '#addLeadBullet');
  }

  // ----- FAQ -----
  function renderFaq() {
    const b = content.faq;
    const f = $('#fields');

    const itemHtml = (it, i) => `
      <div class="item-card" data-index="${i}">
        <div class="item-card__head">
          <b>Вопрос #${i + 1}</b>
          <div class="item-card__actions">
            <button class="icon-btn" data-act="up">↑</button>
            <button class="icon-btn" data-act="down">↓</button>
            <button class="icon-btn icon-btn--danger" data-act="del">✕</button>
          </div>
        </div>
        ${field('Вопрос', it.q, `faq.items.${i}.q`)}
        ${field('Ответ', it.a, `faq.items.${i}.a`, 'textarea')}
      </div>`;

    f.innerHTML = `
      ${field('Тег', b.tag, 'faq.tag')}
      ${field('Заголовок', b.title, 'faq.title')}
      <div class="field">
        <label>Вопросы и ответы</label>
        <div class="items" id="items">${(b.items || []).map(itemHtml).join('')}</div>
        <button class="add-item" id="addItem">+ Добавить вопрос</button>
      </div>
    `;
    bindArrayHandlers('faq.items', '#items', '#addItem',
      () => ({ q: 'Новый вопрос?', a: 'Ответ на вопрос.' }), itemHtml);
  }

  // ----- FINAL CTA -----
  function renderFinalCta() {
    const b = content.finalCta;
    const f = $('#fields');
    f.innerHTML = `
      ${field('Заголовок', b.title, 'finalCta.title')}
      ${field('Подзаголовок', b.subtitle, 'finalCta.subtitle', 'textarea')}
      ${row(
        field('Кнопка 1', b.ctaPrimary, 'finalCta.ctaPrimary'),
        field('Кнопка 2', b.ctaSecondary, 'finalCta.ctaSecondary')
      )}
    `;
  }

  // ----- FOOTER -----
  function renderFooter() {
    const b = content.footer;
    const f = $('#fields');
    const cols = b.columns || [];

    const linkHtml = (l, ci, li) => `
      <div class="bullet-row">
        <input type="text" placeholder="Текст" value="${escAttr(l.label)}" data-path="footer.columns.${ci}.links.${li}.label" />
        <input type="text" placeholder="href" value="${escAttr(l.href)}" data-path="footer.columns.${ci}.links.${li}.href" />
      </div>`;

    f.innerHTML = `
      ${field('О компании', b.about, 'footer.about', 'textarea')}
      ${cols.map((col, ci) => `
        <div class="field">
          <label>Колонка: ${escHtml(col.title)}</label>
          ${field('Заголовок колонки', col.title, `footer.columns.${ci}.title`)}
          <div class="bullet-list">
            ${(col.links || []).map((l, li) => linkHtml(l, ci, li)).join('')}
          </div>
        </div>
      `).join('')}
    `;
  }

  // ============ ARRAY HELPERS ============
  function bulletRow(value, path, idx) {
    return `
      <div class="bullet-row" data-index="${idx}">
        <input type="text" value="${escAttr(value)}" data-path="${path}" />
        <button class="icon-btn icon-btn--danger" data-act="del" type="button" title="Удалить">✕</button>
      </div>`;
  }

  function bindBullets(path, listSel, addSel) {
    const list = $(listSel);
    const add = $(addSel);
    list.addEventListener('click', e => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      if (btn.dataset.act === 'del') {
        const idx = +btn.closest('[data-index]').dataset.index;
        const arr = getByPath(content, path);
        arr.splice(idx, 1);
        rerenderActive();
      }
    });
    add.addEventListener('click', () => {
      const arr = getByPath(content, path);
      arr.push('Новый пункт');
      rerenderActive();
    });
  }

  function bindArrayHandlers(path, listSel, addSel, factory, renderItem) {
    const list = $(listSel);
    const add = $(addSel);
    list.addEventListener('click', e => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const card = btn.closest('[data-index]');
      const idx = +card.dataset.index;
      const arr = getByPath(content, path);
      if (btn.dataset.act === 'del') arr.splice(idx, 1);
      if (btn.dataset.act === 'up' && idx > 0) [arr[idx-1], arr[idx]] = [arr[idx], arr[idx-1]];
      if (btn.dataset.act === 'down' && idx < arr.length - 1) [arr[idx+1], arr[idx]] = [arr[idx], arr[idx+1]];
      rerenderActive();
    });
    add.addEventListener('click', () => {
      const arr = getByPath(content, path);
      arr.push(factory());
      rerenderActive();
    });
  }

  function getByPath(obj, path) {
    return path.split('.').reduce((cur, p) => cur?.[p], obj);
  }

  function rerenderActive() {
    if (activeBlock) renderEditor(activeBlock);
  }

  // ============ TOAST ============
  let toastTimer;
  function showToast(msg, type = '') {
    toast.textContent = msg;
    toast.className = 'toast' + (type ? ' toast--' + type : '');
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.hidden = true, 4000);
  }

  // ============ ESCAPING ============
  function escHtml(s) {
    return String(s ?? '').replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  }
  function escAttr(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

})();
