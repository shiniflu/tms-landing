# LogisTMS — лендинг + админка

Готовый прототип лендинга с **визуальной админкой**. Целевой рынок — Узбекистан.

🌐 **Live:** https://shiniflu.github.io/tms-landing/
🔧 **Админка:** https://shiniflu.github.io/tms-landing/admin.html

---

## 📁 Структура

```
tms-landing/
├── index.html       # лендинг (минимальный shell)
├── styles.css       # стили лендинга
├── script.js        # рендерер из content.json
├── content.json     # ⭐ ВСЕ ТЕКСТЫ И ДАННЫЕ
├── admin.html       # админ-панель
├── admin.css        # стили админки
└── admin.js         # логика админки + GitHub API
```

---

## 🎛 Как работает админка

1. Открываете `/admin.html`
2. Логинитесь паролем + GitHub Personal Access Token
3. Редактируете блоки в визуальном редакторе:
   - меняете тексты, цифры, ссылки
   - скрываете/показываете блоки тогглом
   - перетаскиваете блоки для смены порядка
   - добавляете и удаляете кейсы, отзывы, FAQ-вопросы и т.п.
4. Жмёте **«💾 Сохранить и опубликовать»**
5. Через ~30 секунд GitHub Pages обновляет сайт

### Что можно редактировать:

| Блок | Что меняется |
|------|--------------|
| Hero | Заголовок, подзаголовок, кнопки, буллеты, цифры доверия |
| Логотипы | Заголовок и список клиентов |
| Проблемы | Тег, заголовок, 6 проблем (с эмодзи и описанием) |
| Решения | 6 модулей с иконками (route/fuel/gps/chart/doc/integrate) |
| Преимущества | 4 цифры с описанием |
| Кейсы | Клиенты, цитаты, метрики результата |
| Как работает | Шаги внедрения |
| Отзывы | Текст, имя, должность, аватар, звёзды |
| Лид-форма | Тексты, бейджи, **Webhook URL для CRM** |
| FAQ | Вопросы и ответы |
| CTA блок | Заголовок и кнопки |
| Подвал | Колонки и ссылки |

### Настройки сайта (в боковой панели):
- Название, телефон, WhatsApp, Telegram, Email

---

## 🔐 Получить GitHub токен

1. Откройте https://github.com/settings/tokens/new
2. **Note:** `LogisTMS Admin`
3. **Expiration:** на год или без срока
4. **Scopes:** только `repo`
5. Generate → скопируйте токен `ghp_...`
6. Вставьте в форму логина админки

> ⚠️ Токен хранится локально в вашем браузере. Не делитесь им.

---

## 🔧 Изменить пароль админки

В файле `admin.js`, строка 8:
```js
const ADMIN_PASSWORD = 'admin123';  // <-- замените
```
Закоммитьте — пароль обновится.

> Это клиентский пароль (не криптостойкий) — он защищает только от случайных посетителей. Реальная безопасность даёт **GitHub токен**: без него ничего сохранить нельзя.

---

## 🔌 Подключение CRM

В админке: блок **«Лид-форма»** → поле **«CRM Webhook URL»**.
Вставьте URL вашего CRM:
- AmoCRM: `https://yourdomain.amocrm.ru/api/v4/leads/...`
- Bitrix24: `https://yourdomain.bitrix24.ru/rest/.../crm.lead.add`
- Свой бэкенд: `https://api.example.uz/lead`

Отправляются: `name`, `phone`, `email`, `company`, `fleet`, `utm_*`, `page`, `timestamp`.

---

## 📊 Аналитика

Код для GA4 / Meta Pixel / Яндекс.Метрика закомментирован в `index.html` старой версии. Для новой версии добавьте теги в `<head>` файла `index.html`:

```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXX');
</script>
```

События уже трекаются через `script.js`:
- `cta_demo_hero`, `cta_whatsapp_hero`
- `lead_submit`, `lead_whatsapp`, `lead_telegram`
- `sticky_whatsapp`, `sticky_telegram`
- `generate_lead` / `Lead` (конверсия)

---

## 🛠 Локальная разработка

```bash
cd tms-landing
python -m http.server 5500
# или
npx serve .
```

Откройте http://localhost:5500.

> ⚠️ В локальном режиме админка работает только частично — для GitHub API нужен HTTPS-домен. Лучше тестировать после `git push`.

---

## 🚀 Деплой обновлений

```bash
git add .
git commit -m "Update"
git push
```

Через 30–60 секунд GitHub Pages обновится.

---

## 🎯 Что осталось доделать перед production

- [ ] Заменить пароль админки на свой
- [ ] Настроить кастомный домен (logistms.uz) в Settings → Pages
- [ ] Добавить Google Analytics, Meta Pixel, Яндекс.Метрику
- [ ] Заполнить webhookUrl для CRM
- [ ] Загрузить реальные логотипы клиентов (заменить текстовые в content.json)
- [ ] Добавить страницы /privacy, /terms, /offer (или убрать ссылки)

---

## 🆘 Если что-то сломалось

**Сайт не открывается:**
- Проверьте Actions: https://github.com/shiniflu/tms-landing/actions
- Если красная сборка — откройте лог, чаще всего это синтаксис в content.json

**Админка не сохраняет:**
- Проверьте срок жизни токена (https://github.com/settings/tokens)
- В токене должен быть scope `repo`
- Попробуйте «Перезагрузить» в админке

**Сломали content.json:**
- Откатите коммит на GitHub: → коммит → Revert
- Или восстановите вручную через редактор GitHub
