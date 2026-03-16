const form = document.getElementById("price-form");
const leadForm = document.getElementById("leadForm");
const resultPrice = document.getElementById("resultPrice");
const resultTime = document.getElementById("resultTime");
const calcStatus = document.getElementById("calcStatus");
const leadStatus = document.getElementById("leadStatus");

const PAGE_LOADED_AT = Date.now();
const MIN_FILL_MS = 3000;
const API_URL_STORAGE_KEY = "sitemy_api_url";
let siteConfigPromise = null;

const LANG_KEY = "sitemy_lang";
const AUTO_TRANSLATE_CACHE_PREFIX = "sitemy_auto_i18n_";
const AUTO_TRANSLATE_TARGET = { uk: "uk", en: "en" };
const autoTranslateCache = { uk: null, en: null };
let autoTranslateRunId = 0;
let originalDomCaptured = false;
const originalTextNodes = [];
const originalAttributeNodes = [];
let supportWidgetInitialized = false;
let supportElements = null;

const LOCALE = {
  ru: {
    htmlLang: "ru",
    locale: "ru-RU",
    from: "от",
    timeLabel: "Срок",
    sending: "Отправка...",
    submit: "Отправить",
    wait: "Идет отправка, подождите...",
    tooFast: "Слишком быстро. Повторите через несколько секунд.",
    fillContact: "Укажите имя и контакт.",
    calcSent: "Расчет отправлен в Telegram ✅",
    leadSent: "Заявка отправлена в Telegram ✅",
    fileMode: "Сайт открыт как файл. Запустите: python3 server.py и откройте http://localhost:4173",
    noApi: "Нет связи с API. Запустите python3 server.py и откройте сайт через http://localhost:4173",
    sendErr: "Ошибка отправки",
    calcType: "Калькулятор",
    leadType: "Заявка",
    payload: {
      siteType: "Тип сайта",
      urgency: "Срочность",
      options: "Опции",
      noOptions: "Без доп. опций",
      estimate: "Предварительная стоимость",
      term: "Срок",
      name: "Имя",
      contact: "Контакт",
      project: "Описание проекта",
    },
    siteTypeLabel: {
      landing: "Лендинг",
      corporate: "Корпоративный сайт",
      shop: "Интернет-магазин",
    },
    urgencyLabel: {
      normal: "Стандартные сроки",
      fast: "Ускоренный запуск",
    },
    timeMap: {
      landing: "7–10 дней",
      corporate: "3–4 недели",
      shop: "4–8 недель",
      fast: "ускоренный запуск (с приоритетом)",
    },
  },
  uk: {
    htmlLang: "uk",
    locale: "uk-UA",
    from: "від",
    timeLabel: "Термін",
    sending: "Надсилання...",
    submit: "Надіслати",
    wait: "Йде надсилання, зачекайте...",
    tooFast: "Надто швидко. Повторіть через кілька секунд.",
    fillContact: "Вкажіть ім'я та контакт.",
    calcSent: "Розрахунок надіслано в Telegram ✅",
    leadSent: "Заявку надіслано в Telegram ✅",
    fileMode: "Сайт відкрито як файл. Запустіть: python3 server.py і відкрийте http://localhost:4173",
    noApi: "Немає зв'язку з API. Запустіть python3 server.py і відкрийте сайт через http://localhost:4173",
    sendErr: "Помилка надсилання",
    calcType: "Калькулятор",
    leadType: "Заявка",
    payload: {
      siteType: "Тип сайту",
      urgency: "Терміновість",
      options: "Опції",
      noOptions: "Без додаткових опцій",
      estimate: "Попередня вартість",
      term: "Термін",
      name: "Ім'я",
      contact: "Контакт",
      project: "Опис проєкту",
    },
    siteTypeLabel: {
      landing: "Лендінг",
      corporate: "Корпоративний сайт",
      shop: "Інтернет-магазин",
    },
    urgencyLabel: {
      normal: "Стандартні строки",
      fast: "Швидкий запуск",
    },
    timeMap: {
      landing: "7–10 днів",
      corporate: "3–4 тижні",
      shop: "4–8 тижнів",
      fast: "прискорений запуск (з пріоритетом)",
    },
  },
  en: {
    htmlLang: "en",
    locale: "en-US",
    from: "from",
    timeLabel: "Timeline",
    sending: "Sending...",
    submit: "Send",
    wait: "Sending, please wait...",
    tooFast: "Too fast. Please try again in a few seconds.",
    fillContact: "Please enter your name and contact details.",
    calcSent: "Estimate sent to Telegram ✅",
    leadSent: "Request sent to Telegram ✅",
    fileMode: "The site is opened as a file. Run: python3 server.py and open http://localhost:4173",
    noApi: "No API connection. Run python3 server.py and open the site via http://localhost:4173",
    sendErr: "Sending error",
    calcType: "Calculator",
    leadType: "Lead",
    payload: {
      siteType: "Website type",
      urgency: "Urgency",
      options: "Options",
      noOptions: "No extra options",
      estimate: "Estimated budget",
      term: "Timeline",
      name: "Name",
      contact: "Contact",
      project: "Project description",
    },
    siteTypeLabel: {
      landing: "Landing page",
      corporate: "Corporate website",
      shop: "Online store",
    },
    urgencyLabel: {
      normal: "Standard timeline",
      fast: "Fast-track launch",
    },
    timeMap: {
      landing: "7–10 days",
      corporate: "3–4 weeks",
      shop: "4–8 weeks",
      fast: "fast-track launch (priority)",
    },
  },
};

const SUPPORT_LOCALE = {
  ru: {
    title: "Техподдержка",
    subtitle: "Обычно отвечаем до 15 минут",
    welcome: "Здравствуйте! Опишите вопрос — поддержка свяжется с вами по контакту.",
    name: "Ваше имя",
    contact: "Телефон / Telegram / Email",
    question: "Ваш вопрос",
    send: "Отправить в поддержку",
    sent: "Сообщение отправлено ✅",
    needFields: "Укажите контакт и вопрос.",
    failed: "Не удалось отправить сообщение.",
    open: "Поддержка",
    close: "Свернуть",
    supportType: "Техподдержка",
  },
  uk: {
    title: "Техпідтримка",
    subtitle: "Зазвичай відповідаємо до 15 хвилин",
    welcome: "Вітаємо! Опишіть питання — підтримка зв'яжеться з вами за контактом.",
    name: "Ваше ім'я",
    contact: "Телефон / Telegram / Email",
    question: "Ваше питання",
    send: "Надіслати в підтримку",
    sent: "Повідомлення надіслано ✅",
    needFields: "Вкажіть контакт і питання.",
    failed: "Не вдалося надіслати повідомлення.",
    open: "Підтримка",
    close: "Згорнути",
    supportType: "Техпідтримка",
  },
  en: {
    title: "Support",
    subtitle: "We usually reply within 15 minutes",
    welcome: "Hi! Describe your question — support will contact you using your details.",
    name: "Your name",
    contact: "Phone / Telegram / Email",
    question: "Your question",
    send: "Send to support",
    sent: "Message sent ✅",
    needFields: "Please provide contact details and your question.",
    failed: "Failed to send message.",
    open: "Support",
    close: "Minimize",
    supportType: "Support",
  },
};

const HOME_TRANSLATIONS = {
  ru: {
    ".nav-links a[href='#services-seo']": "Услуги",
    ".nav-links a[href='#cases']": "Кейсы",
    ".nav-links a[href='#why']": "Почему работает",
    ".nav-links a[href='#process']": "Этапы",
    ".nav-links a[href='#calculator']": "Калькулятор",
    ".nav-links a[href='#contacts']": "Контакты",
    ".hero-main .badge": "Создание сайтов под ключ для бизнеса в Украине",
    ".hero-main h1": { html: "Создание сайтов под ключ,<span>которые приносят заявки и продажи</span>" },
    ".hero-main .lead": "Разрабатываю лендинги, корпоративные сайты, интернет-магазины и web-приложения, которые закрывают возражения, усиливают доверие и помогают бизнесу получать заявки из рекламы и поиска.",
    ".hero-actions .btn[href='#lead-form']": "Получить стратегию проекта",
    ".hero-actions .btn-ghost[href='#cases']": "Смотреть кейсы",
    "#calculator .section-kicker": "Быстрый просчет",
    "#calculator h2": "Рассчитаем стоимость проекта",
    "#calculator .section-lead": "Настройте параметры и получите предварительную стоимость — результат сразу уйдет в Telegram вместе с персональным планом запуска.",
    "#social .section-kicker": "Социальное доказательство",
    "#social h2": "Клиенты, которые пришли за сайтом — остались за результатом",
    "#faq .section-kicker": "Ответы на вопросы",
    "#faq h2": "Частые вопросы",
    "#lead-form .section-kicker": "Старт проекта",
    "#lead-form h2": "Готовы начать проект?",
    "#lead-form .cta-grid > div p": "Оставьте контакты — отправлю стратегию, сроки и коммерческое предложение под ваш бизнес в течение 20 минут.",
    "#leadForm input[name='name']": { placeholder: "Ваше имя" },
    "#leadForm input[name='contact']": { placeholder: "Телефон / Telegram" },
    "#leadForm textarea[name='project']": { placeholder: "Опишите проект: ниша, цель, бюджет" },
    "#leadForm button[type='submit']": "Получить предложение",
    ".calc-submit-btn": "Рассчитать и получить в Telegram",
    ".result-label": "Предварительная стоимость",
    ".hint": "Точную смету фиксирую после брифа. Обычно финальная цифра совпадает с расчетом ±5%.",
  },
  uk: {
    ".nav-links a[href='#services-seo']": "Послуги",
    ".nav-links a[href='#cases']": "Кейси",
    ".nav-links a[href='#why']": "Чому працює",
    ".nav-links a[href='#process']": "Етапи",
    ".nav-links a[href='#calculator']": "Калькулятор",
    ".nav-links a[href='#contacts']": "Контакти",
    ".hero-main .badge": "Створення сайтів під ключ для бізнесу в Україні",
    ".hero-main h1": { html: "Створення сайтів під ключ,<span>які приносять заявки та продажі</span>" },
    ".hero-main .lead": "Розробляю лендінги, корпоративні сайти, інтернет-магазини та web-додатки, які знімають заперечення, підсилюють довіру і допомагають бізнесу отримувати заявки з реклами та пошуку.",
    ".hero-actions .btn[href='#lead-form']": "Отримати стратегію проєкту",
    ".hero-actions .btn-ghost[href='#cases']": "Дивитися кейси",
    "#calculator .section-kicker": "Швидкий прорахунок",
    "#calculator h2": "Розрахуємо вартість проєкту",
    "#calculator .section-lead": "Налаштуйте параметри та отримайте попередню вартість — результат одразу надійде в Telegram разом із персональним планом запуску.",
    "#social .section-kicker": "Соціальний доказ",
    "#social h2": "Клієнти, які прийшли за сайтом — залишилися за результатом",
    "#faq .section-kicker": "Відповіді на запитання",
    "#faq h2": "Поширені запитання",
    "#lead-form .section-kicker": "Старт проєкту",
    "#lead-form h2": "Готові почати проєкт?",
    "#lead-form .cta-grid > div p": "Залиште контакти — надішлю стратегію, строки та комерційну пропозицію під ваш бізнес протягом 20 хвилин.",
    "#leadForm input[name='name']": { placeholder: "Ваше ім'я" },
    "#leadForm input[name='contact']": { placeholder: "Телефон / Telegram" },
    "#leadForm textarea[name='project']": { placeholder: "Опишіть проєкт: ніша, ціль, бюджет" },
    "#leadForm button[type='submit']": "Отримати пропозицію",
    ".calc-submit-btn": "Розрахувати та отримати в Telegram",
    ".result-label": "Попередня вартість",
    ".hint": "Точний кошторис фіксую після брифу. Зазвичай фінальна сума збігається з розрахунком у межах ±5%.",
  },
  en: {
    ".nav-links a[href='#services-seo']": "Services",
    ".nav-links a[href='#cases']": "Case studies",
    ".nav-links a[href='#why']": "Why it works",
    ".nav-links a[href='#process']": "Process",
    ".nav-links a[href='#calculator']": "Calculator",
    ".nav-links a[href='#contacts']": "Contacts",
    ".hero-main .badge": "Turnkey website development for businesses in Ukraine",
    ".hero-main h1": { html: "Turnkey website development,<span>that drives leads and sales</span>" },
    ".hero-main .lead": "I build landing pages, corporate websites, online stores and web apps that remove objections, increase trust, and help businesses generate leads from ads and search.",
    ".hero-actions .btn[href='#lead-form']": "Get project strategy",
    ".hero-actions .btn-ghost[href='#cases']": "View case studies",
    "#calculator .section-kicker": "Quick estimate",
    "#calculator h2": "Get a project cost estimate",
    "#calculator .section-lead": "Set your parameters and get a preliminary estimate — the result is sent to Telegram instantly with a personalized launch plan.",
    "#social .section-kicker": "Social proof",
    "#social h2": "Clients who came for a website stayed for results",
    "#faq .section-kicker": "Answers",
    "#faq h2": "Frequently asked questions",
    "#lead-form .section-kicker": "Project start",
    "#lead-form h2": "Ready to start your project?",
    "#lead-form .cta-grid > div p": "Leave your contact details — I will send strategy, timeline, and a commercial offer for your business within 20 minutes.",
    "#leadForm input[name='name']": { placeholder: "Your name" },
    "#leadForm input[name='contact']": { placeholder: "Phone / Telegram" },
    "#leadForm textarea[name='project']": { placeholder: "Describe your project: niche, goal, budget" },
    "#leadForm button[type='submit']": "Get proposal",
    ".calc-submit-btn": "Calculate and send to Telegram",
    ".result-label": "Preliminary cost",
    ".hint": "A final quote is fixed after a brief. Usually the final amount matches the estimate within ±5%.",
  },
};

const baseConfig = {
  landing: { price: 15000 },
  corporate: { price: 30000 },
  shop: { price: 55000 },
};

const extras = {
  seo: 4000,
  copy: 6000,
  ads: 5000,
};

const storedLang = localStorage.getItem(LANG_KEY);
let currentLang = LOCALE[storedLang] ? storedLang : "ru";
const currentPath = window.location.pathname.split("/").pop() || "index.html";
const pageKey = currentPath === "index.html" || currentPath === "" ? "index" : currentPath.replace(".html", "");
const isHomePage = pageKey === "index";

let isCalcSubmitting = false;
let isLeadSubmitting = false;

function t(key) {
  return LOCALE[currentLang]?.[key] ?? LOCALE.ru[key] ?? "";
}

function applySelectorMap(dict) {
  if (!dict) return;
  Object.entries(dict).forEach(([selector, value]) => {
    const nodes = document.querySelectorAll(selector);
    if (!nodes.length) return;
    nodes.forEach((node) => {
      if (typeof value === "string") {
        node.textContent = value;
        return;
      }
      if (value.html !== undefined) node.innerHTML = value.html;
      if (value.text !== undefined) node.textContent = value.text;
      if (value.placeholder !== undefined) node.setAttribute("placeholder", value.placeholder);
    });
  });
}

function captureOriginalDomState() {
  if (originalDomCaptured) return;
  if (!document.body) return;

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const parent = node.parentElement;
    if (!parent) continue;
    const tag = parent.tagName;
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") continue;
    if (parent.closest(".lang-switch")) continue;
    if (parent.closest(".support-widget")) continue;

    originalTextNodes.push({ node, value: node.nodeValue || "" });
  }

  document.querySelectorAll("[placeholder], [title], [aria-label]").forEach((element) => {
    if (element.closest(".lang-switch")) return;
    if (element.closest(".support-widget")) return;
    ["placeholder", "title", "aria-label"].forEach((attrName) => {
      if (!element.hasAttribute(attrName)) return;
      originalAttributeNodes.push({
        element,
        attrName,
        value: element.getAttribute(attrName) || "",
      });
    });
  });

  originalDomCaptured = true;
}

function restoreOriginalDomState() {
  if (!originalDomCaptured) return;

  originalTextNodes.forEach(({ node, value }) => {
    if (!node?.parentNode) return;
    node.nodeValue = value;
  });

  originalAttributeNodes.forEach(({ element, attrName, value }) => {
    if (!element?.isConnected) return;
    element.setAttribute(attrName, value);
  });
}

function getAutoTranslateCache(lang) {
  if (!AUTO_TRANSLATE_TARGET[lang]) return new Map();
  if (autoTranslateCache[lang] instanceof Map) return autoTranslateCache[lang];

  const cache = new Map();
  try {
    const raw = localStorage.getItem(`${AUTO_TRANSLATE_CACHE_PREFIX}${lang}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      Object.entries(parsed).forEach(([key, value]) => {
        if (typeof key === "string" && typeof value === "string") {
          cache.set(key, value);
        }
      });
    }
  } catch {
    // no-op
  }

  autoTranslateCache[lang] = cache;
  return cache;
}

function persistAutoTranslateCache(lang) {
  if (!AUTO_TRANSLATE_TARGET[lang]) return;
  const cache = getAutoTranslateCache(lang);
  try {
    localStorage.setItem(`${AUTO_TRANSLATE_CACHE_PREFIX}${lang}`, JSON.stringify(Object.fromEntries(cache)));
  } catch {
    // no-op
  }
}

function hasCyrillic(text) {
  return /[А-Яа-яЁёІіЇїЄєҐґ]/.test(text);
}

function getTrimmedNodeText(text) {
  const trimmed = text.trim();
  return trimmed.length ? trimmed : "";
}

function setNodeTextPreservingWhitespace(node, translated) {
  const raw = node.nodeValue || "";
  const trimmed = raw.trim();
  if (!trimmed) return;
  const start = raw.indexOf(trimmed);
  if (start < 0) {
    node.nodeValue = translated;
    return;
  }
  const end = start + trimmed.length;
  node.nodeValue = `${raw.slice(0, start)}${translated}${raw.slice(end)}`;
}

async function translateOneText(text, sourceLangKey, targetLang) {
  const cache = getAutoTranslateCache(sourceLangKey);
  if (cache.has(text)) return cache.get(text);

  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ru&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Translation HTTP ${response.status}`);

  const data = await response.json();
  const translated = Array.isArray(data?.[0]) ? data[0].map((chunk) => chunk?.[0] || "").join("") : "";
  const finalText = translated || text;

  cache.set(text, finalText);
  return finalText;
}

async function autoTranslateRemainingContent() {
  if (currentLang === "ru") return;
  const langKey = currentLang;
  const targetLang = AUTO_TRANSLATE_TARGET[langKey];
  if (!targetLang) return;

  const runId = ++autoTranslateRunId;
  const textNodes = [];
  const attributeTargets = [];

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const parent = node.parentElement;
    if (!parent) continue;
    const tag = parent.tagName;
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") continue;
    if (parent.closest(".lang-switch")) continue;
    if (parent.closest(".support-widget")) continue;

    const text = getTrimmedNodeText(node.nodeValue || "");
    if (!text || !hasCyrillic(text)) continue;
    textNodes.push(node);
  }

  document.querySelectorAll("[placeholder], [title], [aria-label]").forEach((element) => {
    if (element.closest(".lang-switch")) return;
    if (element.closest(".support-widget")) return;
    ["placeholder", "title", "aria-label"].forEach((attrName) => {
      const attrValue = element.getAttribute(attrName);
      if (!attrValue) return;
      const text = attrValue.trim();
      if (!text || !hasCyrillic(text)) return;
      attributeTargets.push({ element, attrName, text });
    });
  });

  const uniqueTexts = new Set();
  textNodes.forEach((node) => {
    const text = getTrimmedNodeText(node.nodeValue || "");
    if (text) uniqueTexts.add(text);
  });
  attributeTargets.forEach((target) => uniqueTexts.add(target.text));

  if (!uniqueTexts.size) return;

  const translatedMap = new Map();
  const sourceTexts = [...uniqueTexts];

  for (let index = 0; index < sourceTexts.length; index += 6) {
    const chunk = sourceTexts.slice(index, index + 6);
    const translatedChunk = await Promise.all(
      chunk.map(async (source) => {
        try {
          const translated = await translateOneText(source, langKey, targetLang);
          return [source, translated];
        } catch {
          return [source, source];
        }
      })
    );

    if (runId !== autoTranslateRunId) return;
    translatedChunk.forEach(([source, translated]) => translatedMap.set(source, translated));
  }

  if (runId !== autoTranslateRunId) return;

  textNodes.forEach((node) => {
    const source = getTrimmedNodeText(node.nodeValue || "");
    const translated = translatedMap.get(source);
    if (!translated || translated === source) return;
    setNodeTextPreservingWhitespace(node, translated);
  });

  attributeTargets.forEach(({ element, attrName, text }) => {
    const translated = translatedMap.get(text);
    if (!translated || translated === text) return;
    element.setAttribute(attrName, translated);
  });

  persistAutoTranslateCache(langKey);
}

const PAGE_META_TRANSLATIONS = {
  landing: {
    uk: { title: "Розробка лендінгу під ключ в Україні | SiteMy", description: "Розробка лендінгу під ключ в Україні: структура, тексти, дизайн, адаптивна верстка, SEO-підготовка і запуск реклами." },
    en: { title: "Turnkey Landing Page Development in Ukraine | SiteMy", description: "Turnkey landing page development in Ukraine: structure, copy, design, responsive layout, SEO setup and ad launch." },
  },
  corporate: {
    uk: { title: "Розробка корпоративного сайту під ключ | SiteMy", description: "Корпоративний сайт під ключ: структура, дизайн, сторінки послуг, блог, SEO-архітектура і запуск для бізнесу." },
    en: { title: "Turnkey Corporate Website Development | SiteMy", description: "Corporate website development: structure, design, service pages, blog, SEO architecture, analytics and launch." },
  },
  ecommerce: {
    uk: { title: "Створення інтернет-магазину та web-додатку | SiteMy", description: "Створення інтернет-магазину та web-додатку під ключ: каталог, кабінет, CRM, оплати, аналітика і масштабування." },
    en: { title: "Online Store & Web App Development | SiteMy", description: "Turnkey online store and web app development: catalog, account, CRM, payments, analytics and scaling." },
  },
  redesign: {
    uk: { title: "Редизайн сайту під ключ — зростання конверсії | SiteMy", description: "Редизайн сайту: аудит, нова структура, сучасний UI/UX, підвищення довіри та конверсії." },
    en: { title: "Website Redesign for Higher Conversion | SiteMy", description: "Website redesign: audit, new structure, modern UI/UX, improved trust and better conversion." },
  },
  seo: {
    uk: { title: "SEO-підготовка сайту під ключ | SiteMy", description: "SEO-підготовка сайту: структура, мета-теги, семантика, швидкість, індексація та технічна база під зростання." },
    en: { title: "Turnkey SEO Website Setup | SiteMy", description: "SEO website setup: structure, meta tags, semantics, speed, indexing and technical foundation for growth." },
  },
  kyiv: {
    uk: { title: "Створення сайтів у Києві під ключ | SiteMy", description: "Створення сайтів у Києві: лендінги, корпоративні сайти, інтернет-магазини та редизайн для бізнесу." },
    en: { title: "Website Development in Kyiv | SiteMy", description: "Website development in Kyiv: landing pages, corporate websites, online stores and redesign for business." },
  },
  dnipro: {
    uk: { title: "Розробка сайтів у Дніпрі під ключ | SiteMy", description: "Розробка сайтів у Дніпрі: лендінги, корпоративні сайти, інтернет-магазини і редизайн для бізнесу." },
    en: { title: "Website Development in Dnipro | SiteMy", description: "Website development in Dnipro: landing pages, corporate websites, online stores and redesign for business." },
  },
  odesa: {
    uk: { title: "Створення сайтів в Одесі під ключ | SiteMy", description: "Створення сайтів в Одесі: лендінги, корпоративні сайти, інтернет-магазини та редизайн для бізнесу." },
    en: { title: "Website Development in Odesa | SiteMy", description: "Website development in Odesa: landing pages, corporate websites, online stores and redesign for business." },
  },
  lviv: {
    uk: { title: "Створення сайтів у Львові під ключ | SiteMy", description: "Створення сайтів у Львові для бізнесу: лендінги, корпоративні сайти, інтернет-магазини, редизайн." },
    en: { title: "Website Development in Lviv | SiteMy", description: "Website development in Lviv for businesses: landing pages, corporate websites, online stores and redesign." },
  },
  kharkiv: {
    uk: { title: "Розробка сайтів у Харкові під ключ | SiteMy", description: "Розробка сайтів у Харкові для бізнесу: структура, дизайн, код, SEO-підготовка та запуск." },
    en: { title: "Website Development in Kharkiv | SiteMy", description: "Website development in Kharkiv: structure, design, code, SEO setup and launch for business." },
  },
  zaporizhzhia: {
    uk: { title: "Створення сайтів у Запоріжжі під ключ | SiteMy", description: "Створення сайтів у Запоріжжі для бізнесу: лендінги, корпоративні сайти, інтернет-магазини, редизайн." },
    en: { title: "Website Development in Zaporizhzhia | SiteMy", description: "Website development in Zaporizhzhia for business: landing pages, corporate websites, online stores and redesign." },
  },
};

const PAGE_TRANSLATIONS = {
  landing: {
    uk: {
      ".badge": "Розробка лендінгу під ключ",
      "h1": { html: "Лендінг, який перетворює трафік <span>у заявки та продажі</span>" },
      ".hero-main .lead": "Створюю лендінги для бізнесу під рекламу, запуск послуги або нового продукту: опрацювання офера, логіки блоків, текстів, дизайну, адаптиву та форм захоплення.",
      ".hero-actions .btn": "Отримати розрахунок лендінгу",
      ".hero-actions .btn-ghost": "Дивитися кейси",
      "#lead-form h2": "Потрібен лендінг під ключ?",
      "#lead-form .page-note": "Залиште контакт — підготую структуру, строки та попередній кошторис під ваш продукт.",
      "#leadForm textarea[name='project']": { placeholder: "Опишіть послугу, аудиторію та джерело трафіку" },
      "#leadForm button[type='submit']": "Отримати пропозицію",
    },
    en: {
      ".badge": "Turnkey landing page development",
      "h1": { html: "A landing page that turns traffic <span>into leads and sales</span>" },
      ".hero-main .lead": "I create landing pages for ads, service launches, and new products: offer strategy, conversion-focused block logic, copy, design, responsive layout, and lead forms.",
      ".hero-actions .btn": "Get landing estimate",
      ".hero-actions .btn-ghost": "View case studies",
      "#lead-form h2": "Need a turnkey landing page?",
      "#lead-form .page-note": "Leave your contact details — I will prepare structure, timeline, and a preliminary estimate for your product.",
      "#leadForm textarea[name='project']": { placeholder: "Describe your service, audience and traffic source" },
      "#leadForm button[type='submit']": "Get proposal",
    },
  },
  corporate: {
    uk: {
      ".badge": "Корпоративний сайт під ключ",
      "h1": { html: "Корпоративний сайт, який підсилює бренд <span>і приводить цільові звернення</span>" },
      ".hero-main .lead": "Підходить компаніям, яким потрібен сильний імідж, зрозуміла подача послуг, SEO-структура та стабільний потік звернень.",
      "#lead-form h2": "Потрібен корпоративний сайт?",
      "#leadForm button[type='submit']": "Отримати пропозицію",
    },
    en: {
      ".badge": "Turnkey corporate website",
      "h1": { html: "A corporate website that strengthens your brand <span>and drives qualified inquiries</span>" },
      ".hero-main .lead": "Best for companies that need strong positioning, clear service presentation, SEO architecture, and a predictable lead funnel.",
      "#lead-form h2": "Need a corporate website?",
      "#leadForm button[type='submit']": "Get proposal",
    },
  },
  ecommerce: {
    uk: {
      ".badge": "E-commerce та web-додатки",
      "h1": { html: "Інтернет-магазин або web-додаток <span>під процеси, продажі та масштаб</span>" },
      ".hero-main .lead": "Проєктую та розробляю складні digital-продукти: каталог, картки товарів, кабінет, заявки, інтеграції з CRM, оплатами та внутрішніми сервісами.",
      "#lead-form h2": "Потрібен інтернет-магазин або web-додаток?",
      "#leadForm button[type='submit']": "Отримати пропозицію",
    },
    en: {
      ".badge": "E-commerce and web applications",
      "h1": { html: "Online store or web app <span>for operations, sales, and scaling</span>" },
      ".hero-main .lead": "I design and build complex digital products: catalog, product pages, user account, requests, CRM integrations, payments, and internal services.",
      "#lead-form h2": "Need an online store or web app?",
      "#leadForm button[type='submit']": "Get proposal",
    },
  },
  redesign: {
    uk: {
      ".badge": "Редизайн сайту",
      "h1": { html: "Редизайн сайту, після якого <span>бренд виглядає дорожче й продає краще</span>" },
      ".hero-main .lead": "Якщо поточний сайт застарів, слабо конвертує або погано сприймається — редизайн допомагає оновити подачу, логіку та воронку без хаосу.",
      "#lead-form h2": "Потрібен редизайн сайту?",
      "#leadForm button[type='submit']": "Отримати аудит",
    },
    en: {
      ".badge": "Website redesign",
      "h1": { html: "A website redesign that makes your brand <span>look premium and sell better</span>" },
      ".hero-main .lead": "If your current website feels outdated, converts poorly, or weakens brand trust, redesign helps refresh the visual, structure, and conversion flow without chaos.",
      "#lead-form h2": "Need a website redesign?",
      "#leadForm button[type='submit']": "Get audit",
    },
  },
  seo: {
    uk: {
      ".badge": "SEO-підготовка сайту",
      "h1": { html: "SEO-підготовка сайту, щоб він був <span>готовий до зростання в пошуку</span>" },
      ".hero-main .lead": "Роблю технічну й контентну базу для SEO: структура сторінок, мета-теги, заголовки, семантика, перелінковка, швидкість, sitemap.xml, robots.txt і підготовка до індексації.",
      "#lead-form h2": "Потрібна SEO-підготовка сайту?",
      "#leadForm button[type='submit']": "Отримати аудит",
    },
    en: {
      ".badge": "SEO website setup",
      "h1": { html: "SEO setup for your website so it is <span>ready for search growth</span>" },
      ".hero-main .lead": "I build the technical and content SEO foundation: page structure, meta tags, headings, semantics, internal linking, speed, sitemap.xml, robots.txt and indexing readiness.",
      "#lead-form h2": "Need SEO setup for your website?",
      "#leadForm button[type='submit']": "Get audit",
    },
  },
};

const CITY_TRANSLATIONS = {
  kyiv: {
    uk: {
      ".badge": "Створення сайтів у Києві",
      "h1": { html: "Розробка сайтів у Києві <span>під ключ і під заявки</span>" },
      ".hero-main .lead": "Допомагаю компаніям у Києві запускати лендінги, корпоративні сайти, інтернет-магазини та редизайн з акцентом на конверсію і довіру.",
      "#lead-form h2": "Потрібен сайт у Києві?",
      "#lead-form .page-note": "Залиште нішу та задачу — підготую рішення під ваш ринок і продукт.",
      "#leadForm textarea[name='project']": { placeholder: "Чим займаєтесь і який сайт потрібен" },
      "#leadForm button[type='submit']": "Отримати пропозицію",
    },
    en: {
      ".badge": "Website development in Kyiv",
      "h1": { html: "Website development in Kyiv <span>for leads and business growth</span>" },
      ".hero-main .lead": "I help Kyiv-based businesses launch landing pages, corporate websites, online stores, and redesign projects focused on conversion and trust.",
      "#lead-form h2": "Need a website in Kyiv?",
      "#lead-form .page-note": "Share your niche and task — I will prepare a solution for your market and product.",
      "#leadForm textarea[name='project']": { placeholder: "What does your business do and what website do you need" },
      "#leadForm button[type='submit']": "Get proposal",
    },
  },
  dnipro: {
    uk: {
      ".badge": "Розробка сайтів у Дніпрі",
      "h1": { html: "Створення сайтів у Дніпрі <span>для бізнесу, який хоче рости</span>" },
      ".hero-main .lead": "Розробляю сайти в Дніпрі для послуг, виробництва, торгівлі та e-commerce: від лендінгів до корпоративних рішень з аналітикою.",
      "#lead-form h2": "Потрібен сайт у Дніпрі?",
      "#lead-form .page-note": "Опишіть нішу та задачу — підготую відповідний формат сайту і кошторис.",
      "#leadForm textarea[name='project']": { placeholder: "Який сайт потрібен і які звернення хочете отримувати" },
      "#leadForm button[type='submit']": "Отримати пропозицію",
    },
    en: {
      ".badge": "Website development in Dnipro",
      "h1": { html: "Website development in Dnipro <span>for businesses ready to grow</span>" },
      ".hero-main .lead": "I build websites in Dnipro for services, manufacturing, retail, and e-commerce: from landing pages to corporate solutions with analytics.",
      "#lead-form h2": "Need a website in Dnipro?",
      "#lead-form .page-note": "Describe your niche and task — I will prepare the right format and estimate.",
      "#leadForm textarea[name='project']": { placeholder: "What website do you need and what inquiries do you expect" },
      "#leadForm button[type='submit']": "Get proposal",
    },
  },
  odesa: {
    uk: {
      ".badge": "Створення сайтів в Одесі",
      "h1": { html: "Розробка сайтів в Одесі <span>для бізнесу, якому потрібні заявки</span>" },
      ".hero-main .lead": "Створюю сайти для компаній в Одесі: від лендінгів до корпоративних сайтів і магазинів з логікою продажів.",
      "#lead-form h2": "Потрібен сайт в Одесі?",
      "#lead-form .page-note": "Залиште контакт — підготую рішення під вашу нішу та задачі.",
      "#leadForm textarea[name='project']": { placeholder: "Яка ніша і який тип сайту потрібен" },
      "#leadForm button[type='submit']": "Отримати пропозицію",
    },
    en: {
      ".badge": "Website development in Odesa",
      "h1": { html: "Website development in Odesa <span>for businesses that need leads</span>" },
      ".hero-main .lead": "I build websites for Odesa companies: from landing pages to corporate websites and online stores with sales logic.",
      "#lead-form h2": "Need a website in Odesa?",
      "#lead-form .page-note": "Leave your contact details — I will prepare a solution for your niche and goals.",
      "#leadForm textarea[name='project']": { placeholder: "What is your niche and what type of website do you need" },
      "#leadForm button[type='submit']": "Get proposal",
    },
  },
  lviv: {
    uk: {
      ".badge": "Створення сайтів у Львові",
      "h1": { html: "Розробка сайтів у Львові <span>під заявки та довіру до бренду</span>" },
      ".hero-main .lead": "Допомагаю бізнесу у Львові запускати сучасні сайти під ключ: лендінги, корпоративні сайти, магазини та редизайн.",
      "#lead-form h2": "Потрібен сайт у Львові?",
      "#lead-form .page-note": "Залиште нішу та задачу — підготую рішення під ваш бізнес.",
      "#leadForm textarea[name='project']": { placeholder: "Який тип сайту вам потрібен" },
      "#leadForm button[type='submit']": "Отримати пропозицію",
    },
    en: {
      ".badge": "Website development in Lviv",
      "h1": { html: "Website development in Lviv <span>for leads and stronger brand trust</span>" },
      ".hero-main .lead": "I help businesses in Lviv launch modern turnkey websites: landing pages, corporate websites, online stores, and redesign.",
      "#lead-form h2": "Need a website in Lviv?",
      "#lead-form .page-note": "Share your niche and task — I will prepare the right solution for your business.",
      "#leadForm textarea[name='project']": { placeholder: "What type of website do you need" },
      "#leadForm button[type='submit']": "Get proposal",
    },
  },
  kharkiv: {
    uk: {
      ".badge": "Розробка сайтів у Харкові",
      "h1": { html: "Створення сайтів у Харкові <span>для компаній, яким потрібні звернення</span>" },
      ".hero-main .lead": "Розробляю сайти у Харкові з акцентом на комерційний результат: офер, структура, дизайн і підготовка до просування.",
      "#lead-form h2": "Потрібен сайт у Харкові?",
      "#lead-form .page-note": "Опишіть задачу — запропоную формат сайту та план запуску.",
      "#leadForm textarea[name='project']": { placeholder: "Який сайт потрібен і які цілі проєкту" },
      "#leadForm button[type='submit']": "Отримати пропозицію",
    },
    en: {
      ".badge": "Website development in Kharkiv",
      "h1": { html: "Website development in Kharkiv <span>for companies that need inquiries</span>" },
      ".hero-main .lead": "I build websites in Kharkiv focused on business outcomes: strong offer, service structure, modern design, and growth-ready setup.",
      "#lead-form h2": "Need a website in Kharkiv?",
      "#lead-form .page-note": "Describe your task — I will suggest the right format and launch plan.",
      "#leadForm textarea[name='project']": { placeholder: "What website do you need and what are your goals" },
      "#leadForm button[type='submit']": "Get proposal",
    },
  },
  zaporizhzhia: {
    uk: {
      ".badge": "Створення сайтів у Запоріжжі",
      "h1": { html: "Розробка сайтів у Запоріжжі <span>під продажі, довіру та зростання</span>" },
      ".hero-main .lead": "Створюю сайти для бізнесу в Запоріжжі: лендінги, корпоративні сайти, інтернет-магазини та редизайн з сильною структурою.",
      "#lead-form h2": "Потрібен сайт у Запоріжжі?",
      "#lead-form .page-note": "Опишіть проєкт — підготую пропозицію і дорожню карту запуску.",
      "#leadForm textarea[name='project']": { placeholder: "Які задачі має вирішувати сайт" },
      "#leadForm button[type='submit']": "Отримати пропозицію",
    },
    en: {
      ".badge": "Website development in Zaporizhzhia",
      "h1": { html: "Website development in Zaporizhzhia <span>for sales, trust, and growth</span>" },
      ".hero-main .lead": "I build websites for businesses in Zaporizhzhia: landing pages, corporate websites, online stores, and redesign with strong conversion structure.",
      "#lead-form h2": "Need a website in Zaporizhzhia?",
      "#lead-form .page-note": "Describe your project — I will prepare a proposal and launch roadmap.",
      "#leadForm textarea[name='project']": { placeholder: "What tasks should the website solve" },
      "#leadForm button[type='submit']": "Get proposal",
    },
  },
};

function localizeMetaByPage() {
  if (currentLang === "ru") return;
  const pageMeta = PAGE_META_TRANSLATIONS[pageKey]?.[currentLang];
  if (!pageMeta) return;

  if (pageMeta.title) document.title = pageMeta.title;
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription && pageMeta.description) metaDescription.setAttribute("content", pageMeta.description);
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle && pageMeta.title) ogTitle.setAttribute("content", pageMeta.title);
  const ogDescription = document.querySelector('meta[property="og:description"]');
  if (ogDescription && pageMeta.description) ogDescription.setAttribute("content", pageMeta.description);
}

function localizeInnerPagesContent() {
  if (isHomePage || currentLang === "ru") return;
  const pageDict = PAGE_TRANSLATIONS[pageKey]?.[currentLang] || CITY_TRANSLATIONS[pageKey]?.[currentLang];
  applySelectorMap(pageDict);
}

function localizeHomeContent() {
  if (!isHomePage) return;
  const dict = HOME_TRANSLATIONS[currentLang] || HOME_TRANSLATIONS.ru;
  applySelectorMap(dict);
}

function localizeExtendedHomeContent() {
  if (!isHomePage || currentLang === "ru") return;

  const extended = {
    uk: {
      "#services-seo .section-kicker": "Послуги",
      "#services-seo h2": "Які сайти можна замовити в SiteMy",
      "#services-seo .section-lead": "Якщо вам потрібне створення сайту під ключ, я закриваю весь цикл робіт: аналіз ніші, структура, тексти, UI/UX-дизайн, верстка, програмування, SEO-підготовка і запуск.",
      "#services-seo .keyword-cloud a:nth-of-type(1)": "створення сайту під ключ",
      "#services-seo .keyword-cloud a:nth-of-type(2)": "розробка лендінгу",
      "#services-seo .keyword-cloud a:nth-of-type(3)": "корпоративний сайт",
      "#services-seo .keyword-cloud a:nth-of-type(4)": "інтернет-магазин",
      "#services-seo .keyword-cloud a:nth-of-type(5)": "web-додаток",
      "#services-seo .keyword-cloud a:nth-of-type(6)": "редизайн сайту",
      "#services-seo .keyword-cloud a:nth-of-type(7)": "SEO-підготовка",
      "#services-seo .keyword-cloud a:nth-of-type(8)": "UI/UX дизайн і SEO",
      "#services-seo .seo-service-card:nth-of-type(1) h3 a": "Лендінг під рекламу",
      "#services-seo .seo-service-card:nth-of-type(2) h3 a": "Корпоративний сайт",
      "#services-seo .seo-service-card:nth-of-type(3) h3 a": "Інтернет-магазин і web-додаток",
      "#services-seo .seo-service-card:nth-of-type(1) p": "Односторінковий сайт для швидкого запуску трафіку, прогріву аудиторії та отримання заявок за комерційними запитами.",
      "#services-seo .seo-service-card:nth-of-type(2) p": "Багатосторінковий сайт компанії з послугами, кейсами, блогом, SEO-архітектурою та посиленням довіри до бренду.",
      "#services-seo .seo-service-card:nth-of-type(3) p": "Каталог, особистий кабінет, інтеграції з CRM і платіжними системами, складна логіка та готовність до масштабування.",
      "#services-seo .card-link": "Детальніше",
      "#cases .section-kicker": "Кейси в цифрах",
      "#cases h2": "Результати, за які платять",
      "#cases .section-lead": "Приклади у форматі “до / після”, які легко масштабувати під вашу нішу.",
      "#mockups .section-kicker": "Візуал рівня агенції",
      "#mockups h2": "Так виглядає “дорогий” сайт у подачі",
      "#why .section-kicker": "Результат для бізнесу",
      "#why h2": "Чому мої сайти реально продають",
      "#why .section-lead": "Ви купуєте не сторінки, а систему прийняття рішення клієнтом: від першого екрана до заявки.",
      "section.section.dark:nth-of-type(5) .section-kicker": "Пакети послуг",
      "section.section.dark:nth-of-type(5) h2": "Формати розробки сайтів під ключ",
      ".geo-section .section-kicker": "Географія роботи",
      ".geo-section h2": "Розробка сайтів у Києві, Дніпрі, Одесі та по всій Україні",
      ".geo-section .section-lead": "Працюю віддалено по всій Україні й допомагаю бізнесу запускати сайти під ключ незалежно від міста.",
      "#process .section-kicker": "Прозорий процес",
      "#process h2": "Етапи роботи",
      "#process .process-lead": "Кожен етап прозорий за строками, результатом і зоною відповідальності — ви завжди розумієте, що відбувається з проєктом зараз і що буде далі.",
      "#social h2": "Чому клієнти залишаються на довгострок",
      "#social .section-lead": "Працюю як продуктовий партнер: відповідаю за результат, а не лише за “здати макети”.",
      "#social .review:nth-of-type(1) span": "— Сфера послуг, Київ",
      "#social .review:nth-of-type(2) span": "— E-commerce, Дніпро",
      "#social .review:nth-of-type(3) span": "— B2B-платформа, Одеса",
      "footer .footer-grid > div:first-child p": "Створення сайтів під ключ, лендінгів, корпоративних сайтів і web-додатків для бізнесу",
      "#calculator .calc-badges span:nth-of-type(1)": "⚡ Відповідь за 20 хвилин",
      "#calculator .calc-badges span:nth-of-type(2)": "📋 Без зобов'язань",
      "#calculator .calc-badges span:nth-of-type(3)": "🎯 Точний кошторис після брифу",
      "#calculator .calc-section-label:nth-of-type(1)": "Тип проєкту",
      "#calculator .calc-section-label:nth-of-type(2)": "Додаткові опції",
      "#calculator .calc-section-label:nth-of-type(3)": "Терміновість",
      "#calculator .calc-type-card:nth-of-type(1) strong": "Лендінг",
      "#calculator .calc-type-card:nth-of-type(1) p": "1 сторінка, висока конверсія",
      "#calculator .calc-type-card:nth-of-type(1) .calc-type-time": "7–10 днів",
      "#calculator .calc-type-card:nth-of-type(2) strong": "Корпоративний",
      "#calculator .calc-type-card:nth-of-type(2) p": "До 10 сторінок + блог",
      "#calculator .calc-type-card:nth-of-type(2) .calc-type-time": "3–4 тижні",
      "#calculator .calc-type-card:nth-of-type(3) strong": "E-commerce / Веб-додаток",
      "#calculator .calc-type-card:nth-of-type(3) p": "Каталог, кабінет, CRM",
      "#calculator .calc-type-card:nth-of-type(3) .calc-type-time": "4–8 тижнів",
      "#calculator .calc-extra-chip:nth-of-type(1) span": "SEO-підготовка",
      "#calculator .calc-extra-chip:nth-of-type(2) span": "Тексти та структура",
      "#calculator .calc-extra-chip:nth-of-type(3) span": "Підготовка до реклами",
      "#calculator .calc-urgency-btn:nth-of-type(1) strong": "Стандартні строки",
      "#calculator .calc-urgency-btn:nth-of-type(1) span": "Базова вартість",
      "#calculator .calc-urgency-btn:nth-of-type(2) strong": "Швидкий запуск",
      "#calculator .calc-urgency-btn:nth-of-type(2) span": "+20% до вартості",
      "#social .review:nth-of-type(1) p": "Сайт нарешті почав реально продавати. До оновлення менеджери витрачали багато часу на пояснення — зараз клієнти приходять уже підготовленими.",
      "#social .review:nth-of-type(2) p": "Після редизайну змінилося сприйняття бренду: виріс середній чек і конверсія, а команда продажів працює ефективніше.",
      "#social .review:nth-of-type(3) p": "Складний проєкт з інтеграціями запустили вчасно і без хаосу. Після релізу сайт стабільно працює та масштабується.",
      "#faq .faq details:nth-of-type(1) summary span": "Що саме входить у розробку сайту під ключ?",
      "#faq .faq details:nth-of-type(2) summary span": "Скільки коштує сайт і від чого залежить ціна?",
      "#faq .faq details:nth-of-type(3) summary span": "Скільки триває розробка? Чи можна прискорити?",
      "#faq .faq details:nth-of-type(4) summary span": "Ви працюєте з проєктами будь-якої складності?",
      "#faq .faq details:nth-of-type(5) summary span": "Чи можна стартувати з обмеженим бюджетом?",
      "#faq .faq details:nth-of-type(6) summary span": "Що відбувається після запуску сайту?",
      "#faq .faq details:nth-of-type(1) .faq-body p": "Під ключ означає, що ви отримуєте повністю готовий продукт без потреби окремо шукати дизайнера, копірайтера чи розробника. У роботу входять аудит, структура, тексти, дизайн, розробка, аналітика, інтеграції, SEO-підготовка та запуск.",
      "#faq .faq details:nth-of-type(2) .faq-body p": "Вартість залежить від типу сайту, кількості сторінок, складності логіки, інтеграцій і термінів. Орієнтовно: лендінг — від 15 000 грн, корпоративний сайт — від 30 000 грн, e-commerce і web-додатки — від 55 000 грн.",
      "#faq .faq details:nth-of-type(3) .faq-body p": "Стандартні строки: лендінг — 7–10 робочих днів, корпоративний сайт — 3–4 тижні, складні проєкти — 4–8 тижнів. Прискорений запуск можливий за умови пріоритетної роботи.",
      "#faq .faq details:nth-of-type(4) .faq-body p": "Так. Від односторінкових сайтів до складних платформ із кабінетами, каталогами, CRM та оплатами. Перед стартом завжди оцінюю реалістичність задачі по строках і бюджету.",
      "#faq .faq details:nth-of-type(5) .faq-body p": "Так, можна стартувати з MVP: запустити мінімальну робочу версію, перевірити гіпотези й масштабуватися по етапах без зайвих витрат на старті.",
      "#faq .faq details:nth-of-type(6) .faq-body p": "Після запуску залишаюся на зв'язку: допомагаю з правками, стабілізацією, аналітикою і подальшим ростом. За потреби підключаємо A/B-тести та оптимізацію конверсії.",
    },
    en: {
      "#services-seo .section-kicker": "Services",
      "#services-seo h2": "What websites you can order from SiteMy",
      "#services-seo .section-lead": "If you need turnkey website development, I handle the full cycle: niche analysis, structure, copy, UI/UX design, coding, SEO setup, and launch.",
      "#services-seo .keyword-cloud a:nth-of-type(1)": "turnkey website development",
      "#services-seo .keyword-cloud a:nth-of-type(2)": "landing page development",
      "#services-seo .keyword-cloud a:nth-of-type(3)": "corporate website",
      "#services-seo .keyword-cloud a:nth-of-type(4)": "online store",
      "#services-seo .keyword-cloud a:nth-of-type(5)": "web application",
      "#services-seo .keyword-cloud a:nth-of-type(6)": "website redesign",
      "#services-seo .keyword-cloud a:nth-of-type(7)": "SEO setup",
      "#services-seo .keyword-cloud a:nth-of-type(8)": "UI/UX design and SEO",
      "#services-seo .seo-service-card:nth-of-type(1) h3 a": "Landing page for ads",
      "#services-seo .seo-service-card:nth-of-type(2) h3 a": "Corporate website",
      "#services-seo .seo-service-card:nth-of-type(3) h3 a": "Online store and web app",
      "#services-seo .seo-service-card:nth-of-type(1) p": "A single-page website for fast traffic launch, audience warming, and lead generation from commercial intent keywords.",
      "#services-seo .seo-service-card:nth-of-type(2) p": "A multi-page company website with services, case studies, blog, SEO architecture, and stronger brand trust.",
      "#services-seo .seo-service-card:nth-of-type(3) p": "Catalog, user account, CRM and payment integrations, advanced logic, and scalability.",
      "#services-seo .card-link": "Learn more",
      "#cases .section-kicker": "Case studies in numbers",
      "#cases h2": "Results clients are willing to pay for",
      "#cases .section-lead": "Before/after examples that can be adapted to your niche.",
      "#mockups .section-kicker": "Agency-level visual style",
      "#mockups h2": "How a premium website presentation looks",
      "#why .section-kicker": "Business outcome",
      "#why h2": "Why my websites actually sell",
      "#why .section-lead": "You’re not buying pages — you’re buying a customer decision system from first screen to lead.",
      "section.section.dark:nth-of-type(5) .section-kicker": "Service packages",
      "section.section.dark:nth-of-type(5) h2": "Turnkey website development formats",
      ".geo-section .section-kicker": "Service geography",
      ".geo-section h2": "Website development in Kyiv, Dnipro, Odesa and across Ukraine",
      ".geo-section .section-lead": "I work remotely across Ukraine and help businesses launch turnkey websites regardless of city.",
      "#process .section-kicker": "Transparent process",
      "#process h2": "Work stages",
      "#process .process-lead": "Each stage is transparent in timing, deliverables, and responsibility — you always know what’s happening now and what comes next.",
      "#social h2": "Why clients stay long-term",
      "#social .section-lead": "I work as a product partner: responsible for outcomes, not just design delivery.",
      "#social .review:nth-of-type(1) span": "— Services sector, Kyiv",
      "#social .review:nth-of-type(2) span": "— E-commerce, Dnipro",
      "#social .review:nth-of-type(3) span": "— B2B platform, Odesa",
      "footer .footer-grid > div:first-child p": "Turnkey website development, landing pages, corporate websites, and web apps for business",
      "#calculator .calc-badges span:nth-of-type(1)": "⚡ Response in 20 minutes",
      "#calculator .calc-badges span:nth-of-type(2)": "📋 No obligations",
      "#calculator .calc-badges span:nth-of-type(3)": "🎯 Accurate quote after brief",
      "#calculator .calc-section-label:nth-of-type(1)": "Project type",
      "#calculator .calc-section-label:nth-of-type(2)": "Extra options",
      "#calculator .calc-section-label:nth-of-type(3)": "Urgency",
      "#calculator .calc-type-card:nth-of-type(1) strong": "Landing page",
      "#calculator .calc-type-card:nth-of-type(1) p": "Single page with high conversion",
      "#calculator .calc-type-card:nth-of-type(1) .calc-type-time": "7–10 days",
      "#calculator .calc-type-card:nth-of-type(2) strong": "Corporate website",
      "#calculator .calc-type-card:nth-of-type(2) p": "Up to 10 pages + blog",
      "#calculator .calc-type-card:nth-of-type(2) .calc-type-time": "3–4 weeks",
      "#calculator .calc-type-card:nth-of-type(3) strong": "E-commerce / Web app",
      "#calculator .calc-type-card:nth-of-type(3) p": "Catalog, account, CRM",
      "#calculator .calc-type-card:nth-of-type(3) .calc-type-time": "4–8 weeks",
      "#calculator .calc-extra-chip:nth-of-type(1) span": "SEO setup",
      "#calculator .calc-extra-chip:nth-of-type(2) span": "Copywriting and structure",
      "#calculator .calc-extra-chip:nth-of-type(3) span": "Ads preparation",
      "#calculator .calc-urgency-btn:nth-of-type(1) strong": "Standard timeline",
      "#calculator .calc-urgency-btn:nth-of-type(1) span": "Base price",
      "#calculator .calc-urgency-btn:nth-of-type(2) strong": "Fast launch",
      "#calculator .calc-urgency-btn:nth-of-type(2) span": "+20% to budget",
      "#social .review:nth-of-type(1) p": "The website finally started selling. Before the redesign our sales team spent too much time explaining basics — now leads come in warmer.",
      "#social .review:nth-of-type(2) p": "After redesign, brand perception improved a lot. Average order value and conversion rate increased, and sales became more predictable.",
      "#social .review:nth-of-type(3) p": "A complex project with multiple integrations was launched on time and without chaos. After release, the website runs reliably and scales well.",
      "#faq .faq details:nth-of-type(1) summary span": "What is included in turnkey website development?",
      "#faq .faq details:nth-of-type(2) summary span": "How much does a website cost and what affects the price?",
      "#faq .faq details:nth-of-type(3) summary span": "How long does development take? Can it be accelerated?",
      "#faq .faq details:nth-of-type(4) summary span": "Do you handle projects of any complexity?",
      "#faq .faq details:nth-of-type(5) summary span": "Can we start with a limited budget?",
      "#faq .faq details:nth-of-type(6) summary span": "What happens after the website launch?",
      "#faq .faq details:nth-of-type(1) .faq-body p": "Turnkey means you get a fully completed product without hiring separate specialists. The process includes audit, structure, copy, UI design, development, analytics, integrations, SEO setup, and launch.",
      "#faq .faq details:nth-of-type(2) .faq-body p": "Pricing depends on website type, page count, logic complexity, integrations, and timeline. Typical range: landing page from 15,000 UAH, corporate website from 30,000 UAH, e-commerce/web apps from 55,000 UAH.",
      "#faq .faq details:nth-of-type(3) .faq-body p": "Standard delivery: landing page in 7–10 business days, corporate website in 3–4 weeks, complex products in 4–8 weeks. Fast-track launch is available with priority production.",
      "#faq .faq details:nth-of-type(4) .faq-body p": "Yes. From single-page websites to complex platforms with user accounts, catalogs, CRM, payments, and custom logic. Scope is always validated against timeline and budget.",
      "#faq .faq details:nth-of-type(5) .faq-body p": "Yes, you can start with MVP: launch a minimal working version first, validate demand, and then scale in phases without overpaying at the beginning.",
      "#faq .faq details:nth-of-type(6) .faq-body p": "After launch I stay involved: post-launch fixes, stabilization, analytics support, and growth iterations. If needed, we continue with A/B testing and conversion optimization.",
    },
  };

  const dict = extended[currentLang];
  if (!dict) return;

  Object.entries(dict).forEach(([selector, value]) => {
    const elements = document.querySelectorAll(selector);
    if (!elements.length) return;
    elements.forEach((element) => {
      element.textContent = value;
    });
  });
}

function localizeHomeMissingBlocks() {
  if (!isHomePage || currentLang === "ru") return;

  const setList = (selector, values) => {
    const elements = document.querySelectorAll(selector);
    values.forEach((value, index) => {
      const el = elements[index];
      if (!el) return;
      if (typeof value === "string") {
        el.textContent = value;
      } else if (value?.html !== undefined) {
        el.innerHTML = value.html;
      }
    });
  };

  if (currentLang === "uk") {
    setList("#cases .case-tag", ["Будівництво", "Медицина", "E-commerce"]);
    setList("#cases .case-card h3", ["Лендінг + реклама", "Корпоративний сайт", "Редизайн магазину"]);
    setList("#cases .case-card:nth-of-type(1) li", ["до: 9 заявок / міс", "після: 34 заявки / міс", "ріст: +277%"]);
    setList("#cases .case-card:nth-of-type(2) li", ["до: конверсія 1.2%", "після: конверсія 3.8%", "ріст: +216%"]);
    setList("#cases .case-card:nth-of-type(3) li", ["до: середній чек 780 грн", "після: 1 140 грн", "ріст: +46%"]);

    setList("#mockups .mockup-card h3", ["Головна сторінка", "Сторінка послуги", "Комерційний квіз"]);
    setList("#mockups .mockup-card p", [
      "Потужний перший екран, кейси в цифрах, блок довіри та чіткий CTA.",
      "Логіка прийняття рішення: проблема → рішення → кейс → форма заявки.",
      "Фільтрує цільові ліди та дає менеджеру підготовлений запит.",
    ]);
    setList("#mockups .mockup-metric", ["Конверсія: 3.8% → 6.1%", "CPL: 420 грн → 280 грн", "Кваліфікація лідів: +52%"]);

    setList("#why .card h3", ["Сильний офер", "Логіка конверсії", "Довіра до бренду", "Маркетинг-зв'язка"]);
    setList("#why .card p", [
      "Показуємо цінність за 5–7 секунд, без “води” та загальних фраз.",
      "Кожен блок веде до дії: заявка, дзвінок, консультація.",
      "Кейси, цифри, гарантії та експертна подача підвищують чек.",
      "Сайт, аналітика і реклама працюють як єдина система росту.",
    ]);

    setList("#packages .feature h3", ["Landing page", "Корпоративний сайт", "E-commerce / Web-app"]);
    setList("#packages .label", ["Найчастіше обирають"]);
    setList("#packages .feature:nth-of-type(1) li", ["1 сторінка з високою конверсією", "Копірайт + структура + UI", "Термін: 7–10 днів"]);
    setList("#packages .feature:nth-of-type(2) li", ["До 10 сторінок + блог", "Преміальна дизайн-система", "SEO-архітектура і аналітика"]);
    setList("#packages .feature:nth-of-type(3) li", ["Каталог, кабінет, API, CRM", "Інтеграції та автоматизація процесів", "Складна логіка та масштаб"]);

    setList("#geo .geo-card h3", ["За якими запитами можна просуватися"]);
    setList("#geo .geo-card li a", [
      "створення сайтів у Києві",
      "розробка сайту у Дніпрі",
      "створення сайту в Одесі",
      "створення сайту у Львові",
      "розробка сайту в Харкові",
      "створення сайту в Запоріжжі",
      "створення лендінгу під ключ",
      "розробка корпоративного сайту",
      "створення інтернет-магазину",
      "редизайн сайту",
      "SEO-підготовка сайту",
    ]);

    setList("#process .process-strip strong", ["1–2 дні", "Фіксуємо результат", "Завжди на зв'язку"]);
    setList("#process .process-strip span", ["на аудит і стартову стратегію", "по кожному етапу без розмитих обіцянок", "за статусом, правками та наступним кроком"]);
    setList("#process .timeline-eyebrow", ["СТАРТ", "ОСНОВА", "ПОДАЧА", "ЗБІРКА", "РЕЛІЗ", "МАСШТАБ"]);
    setList("#process .timeline-step strong", ["Бриф і аудит", "Стратегія і прототип", "UI-дизайн", "Розробка", "Запуск", "Ріст"]);
    setList("#process .timeline-step .timeline-content > p:not(.timeline-eyebrow)", [
      "Занурююсь у продукт, аудиторію, воронку і конкурентів, щоб зібрати сильну точку входу в проєкт.",
      "Збираю структуру сторінок, офери та логіку блоків так, щоб користувач йшов до заявки без зайвих кроків.",
      "Формую візуальний стиль, який підсилює цінність продукту, підвищує довіру і робить бренд дорожчим у сприйнятті.",
      "Верстаю і програмую проєкт з адаптивом, SEO-базою, формами, аналітикою та потрібними інтеграціями.",
      "Перевіряю всі сценарії, публікую проєкт, налаштовую доступи та передаю зрозумілу інструкцію по роботі із сайтом.",
      "Після запуску підсилюємо результат: тестуємо гіпотези, покращуємо конверсію і готуємо майданчик під рекламу та масштабування.",
    ]);
    setList("#process .timeline-meta", [
      "Результат: бриф, аудит і карта ключових задач",
      "Результат: прототип і зрозумілий сценарій конверсії",
      "Результат: готовий дизайн-макет із системою стилів",
      "Результат: робочий сайт, готовий до запуску",
      "Результат: стабільний реліз без хаосу і втрат",
      "Результат: зрозумілий план росту після релізу",
    ]);
  }

  if (currentLang === "en") {
    setList("#cases .case-tag", ["Construction", "Healthcare", "E-commerce"]);
    setList("#cases .case-card h3", ["Landing page + ads", "Corporate website", "Store redesign"]);
    setList("#cases .case-card:nth-of-type(1) li", ["before: 9 leads / month", "after: 34 leads / month", "growth: +277%"]);
    setList("#cases .case-card:nth-of-type(2) li", ["before: 1.2% conversion", "after: 3.8% conversion", "growth: +216%"]);
    setList("#cases .case-card:nth-of-type(3) li", ["before: avg check 780 UAH", "after: 1,140 UAH", "growth: +46%"]);

    setList("#mockups .mockup-card h3", ["Homepage", "Service page", "Commercial quiz"]);
    setList("#mockups .mockup-card p", [
      "Powerful hero section, numeric case studies, trust block, and clear CTA.",
      "Decision-making logic: problem → solution → case study → lead form.",
      "Filters qualified leads and gives sales managers a prepared request.",
    ]);
    setList("#mockups .mockup-metric", ["Conversion: 3.8% → 6.1%", "CPL: 420 UAH → 280 UAH", "Lead qualification: +52%"]);

    setList("#why .card h3", ["Strong offer", "Conversion logic", "Brand trust", "Marketing synergy"]);
    setList("#why .card p", [
      "We communicate value in 5–7 seconds, without fluff and generic copy.",
      "Each block drives action: lead form, call, consultation.",
      "Case studies, numbers, guarantees, and expert presentation increase order value.",
      "Website, analytics, and ads work as one growth system.",
    ]);

    setList("#packages .feature h3", ["Landing page", "Corporate website", "E-commerce / Web-app"]);
    setList("#packages .label", ["Most popular"]);
    setList("#packages .feature:nth-of-type(1) li", ["1 page with high conversion", "Copywriting + structure + UI", "Timeline: 7–10 days"]);
    setList("#packages .feature:nth-of-type(2) li", ["Up to 10 pages + blog", "Premium design system", "SEO architecture and analytics"]);
    setList("#packages .feature:nth-of-type(3) li", ["Catalog, account, API, CRM", "Integrations and process automation", "Complex logic and scalability"]);

    setList("#geo .geo-card h3", ["What search queries can be targeted"]);
    setList("#geo .geo-card li a", [
      "website development in Kyiv",
      "website development in Dnipro",
      "website development in Odesa",
      "website development in Lviv",
      "website development in Kharkiv",
      "website development in Zaporizhzhia",
      "turnkey landing page development",
      "corporate website development",
      "online store development",
      "website redesign",
      "SEO website setup",
    ]);

    setList("#process .process-strip strong", ["1–2 days", "Result-focused", "Always in touch"]);
    setList("#process .process-strip span", ["for audit and initial strategy", "for each stage without vague promises", "for status, revisions, and next steps"]);
    setList("#process .timeline-eyebrow", ["START", "FOUNDATION", "PRESENTATION", "BUILD", "RELEASE", "SCALE"]);
    setList("#process .timeline-step strong", ["Brief and audit", "Strategy and prototype", "UI design", "Development", "Launch", "Growth"]);
    setList("#process .timeline-step .timeline-content > p:not(.timeline-eyebrow)", [
      "I dive into your product, audience, funnel, and competitors to build a strong strategic starting point.",
      "I craft page structure, offers, and block logic so users move to inquiry without extra friction.",
      "I shape visual style that increases perceived value, strengthens trust, and elevates your brand.",
      "I build the project with responsive layout, SEO baseline, forms, analytics, and required integrations.",
      "I test all scenarios, publish the project, configure access, and provide clear usage instructions.",
      "After launch, we scale results: test hypotheses, improve conversion, and prepare the site for paid traffic growth.",
    ]);
    setList("#process .timeline-meta", [
      "Result: brief, audit, and key task map",
      "Result: prototype and clear conversion scenario",
      "Result: complete design mockup with style system",
      "Result: working website ready for launch",
      "Result: stable release without chaos",
      "Result: clear post-launch growth plan",
    ]);
  }
}

function initLanguageSwitcher() {
  const nav = document.querySelector(".nav");
  if (!nav || nav.querySelector(".lang-switch")) return;

  const switcher = document.createElement("div");
  switcher.className = "lang-switch";
  switcher.setAttribute("aria-label", "Language switch");

  const labels = { ru: "RU", uk: "UK", en: "EN" };
  ["ru", "uk", "en"].forEach((lang) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "lang-btn";
    button.dataset.lang = lang;
    button.textContent = labels[lang];
    if (lang === currentLang) button.classList.add("is-active");
    button.addEventListener("click", () => {
      if (lang === currentLang) return;
      currentLang = lang;
      localStorage.setItem(LANG_KEY, lang);
      window.location.reload();
    });
    switcher.appendChild(button);
  });

  const headerBtn = nav.querySelector(".btn-small");
  if (headerBtn) {
    nav.insertBefore(switcher, headerBtn);
  } else {
    nav.appendChild(switcher);
  }
}

function updateLanguageButtons() {
  document.querySelectorAll(".lang-btn").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.lang === currentLang);
  });
}

function updateCommonUiLanguage() {
  document.documentElement.lang = LOCALE[currentLang].htmlLang;

  const headerBtn = document.querySelector(".btn-small");
  if (headerBtn) {
    const labels = { ru: "Начать проект", uk: "Почати проєкт", en: "Start project" };
    headerBtn.textContent = labels[currentLang];
  }

  const navLabels = {
    ru: { services: "Услуги", cases: "Кейсы", process: "Этапы", faq: "FAQ", contacts: "Контакты" },
    uk: { services: "Послуги", cases: "Кейси", process: "Етапи", faq: "FAQ", contacts: "Контакти" },
    en: { services: "Services", cases: "Cases", process: "Process", faq: "FAQ", contacts: "Contacts" },
  };

  document.querySelectorAll(".nav-links a").forEach((link) => {
    const href = link.getAttribute("href") || "";
    if (href.includes("services-seo")) link.textContent = navLabels[currentLang].services;
    if (href.includes("cases")) link.textContent = navLabels[currentLang].cases;
    if (href.includes("process")) link.textContent = navLabels[currentLang].process;
    if (href.includes("faq")) link.textContent = navLabels[currentLang].faq;
    if (href.includes("contacts")) link.textContent = navLabels[currentLang].contacts;
  });

  document.querySelectorAll("footer p").forEach((paragraph) => {
    const link = paragraph.querySelector("a");
    if (!link) return;
    const href = link.getAttribute("href") || "";
    if (href.startsWith("tel:")) {
      const prefix = currentLang === "uk" ? "Телефон: " : currentLang === "en" ? "Phone: " : "Телефон: ";
      paragraph.childNodes[0].textContent = prefix;
    }
    if (href.includes("t.me")) {
      const prefix = currentLang === "uk" ? "Telegram: " : currentLang === "en" ? "Telegram: " : "Telegram: ";
      paragraph.childNodes[0].textContent = prefix;
    }
    if (href.startsWith("mailto:")) {
      const prefix = currentLang === "uk" ? "Email: " : currentLang === "en" ? "Email: " : "Email: ";
      paragraph.childNodes[0].textContent = prefix;
    }
  });
}

function getSupportLocale() {
  return SUPPORT_LOCALE[currentLang] || SUPPORT_LOCALE.ru;
}

function updateSupportWidgetLanguage() {
  if (!supportElements) return;
  const localePack = getSupportLocale();
  supportElements.title.textContent = localePack.title;
  supportElements.subtitle.textContent = localePack.subtitle;
  supportElements.welcome.textContent = localePack.welcome;
  supportElements.nameInput.placeholder = localePack.name;
  supportElements.contactInput.placeholder = localePack.contact;
  supportElements.questionInput.placeholder = localePack.question;
  supportElements.sendButton.textContent = localePack.send;
  supportElements.launcherLabel.textContent = localePack.open;
  supportElements.closeButton.textContent = localePack.close;
}

function initSupportWidget() {
  if (supportWidgetInitialized || !document.body) return;

  const wrapper = document.createElement("aside");
  wrapper.className = "support-widget";
  wrapper.innerHTML = `
    <button type="button" class="support-launcher" aria-expanded="false" aria-label="Support chat">
      <span class="support-launcher-dot"></span>
      <span class="support-launcher-label">Support</span>
    </button>
    <section class="support-panel" aria-hidden="true">
      <div class="support-head">
        <div>
          <strong class="support-title">Support</strong>
          <p class="support-subtitle"></p>
        </div>
        <button type="button" class="support-close">Minimize</button>
      </div>
      <div class="support-messages">
        <div class="support-message support-message-bot support-welcome"></div>
      </div>
      <form class="support-form" novalidate>
        <input name="supportName" type="text" autocomplete="name" />
        <input name="supportContact" type="text" autocomplete="tel" required />
        <textarea name="supportQuestion" rows="3" required></textarea>
        <button type="submit" class="btn">Send</button>
        <p class="support-status" aria-live="polite"></p>
      </form>
    </section>
  `;

  document.body.appendChild(wrapper);

  const launcher = wrapper.querySelector(".support-launcher");
  const launcherLabel = wrapper.querySelector(".support-launcher-label");
  const panel = wrapper.querySelector(".support-panel");
  const closeButton = wrapper.querySelector(".support-close");
  const formElement = wrapper.querySelector(".support-form");
  const title = wrapper.querySelector(".support-title");
  const subtitle = wrapper.querySelector(".support-subtitle");
  const welcome = wrapper.querySelector(".support-welcome");
  const nameInput = wrapper.querySelector('input[name="supportName"]');
  const contactInput = wrapper.querySelector('input[name="supportContact"]');
  const questionInput = wrapper.querySelector('textarea[name="supportQuestion"]');
  const sendButton = wrapper.querySelector('.support-form button[type="submit"]');
  const status = wrapper.querySelector(".support-status");
  const messages = wrapper.querySelector(".support-messages");

  if (!launcher || !launcherLabel || !panel || !closeButton || !formElement || !title || !subtitle || !welcome || !nameInput || !contactInput || !questionInput || !sendButton || !status || !messages) {
    return;
  }

  // Generate or restore session ID
  let sessionId = localStorage.getItem("supportSessionId");
  if (!sessionId) {
    sessionId = "sess_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    localStorage.setItem("supportSessionId", sessionId);
  }

  supportElements = {
    wrapper,
    launcher,
    launcherLabel,
    panel,
    closeButton,
    formElement,
    title,
    subtitle,
    welcome,
    nameInput,
    contactInput,
    questionInput,
    sendButton,
    status,
    messages,
    sessionId,
    lastMessageTimestamp: 0,
  };

  const setOpen = (isOpen) => {
    wrapper.classList.toggle("is-open", isOpen);
    panel.setAttribute("aria-hidden", isOpen ? "false" : "true");
    launcher.setAttribute("aria-expanded", isOpen ? "true" : "false");
    if (isOpen) questionInput.focus();
  };

  const addMessageToUI = (text, isUser) => {
    const message = document.createElement("div");
    message.className = `support-message ${isUser ? "support-message-user" : "support-message-bot"}`;
    message.textContent = text;
    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;
  };

  // Polling for new messages from support
  const pollMessages = async () => {
    if (!supportElements) return;
    try {
      const endpoint = await resolveTelegramEndpoint();
      const messagesUrl = endpoint.replace("/api/telegram", `/api/telegram/messages/${sessionId}`);
      
      const response = await fetch(messagesUrl);
      if (!response.ok) return;

      const data = await response.json();
      if (!data.ok || !Array.isArray(data.messages)) return;

      data.messages.forEach((msg) => {
        if (msg.type === "bot" && msg.timestamp > supportElements.lastMessageTimestamp) {
          addMessageToUI(msg.text, false);
          supportElements.lastMessageTimestamp = msg.timestamp;
        }
      });
    } catch {
      // Silently ignore polling errors
    }
  };

  // Start polling every 3 seconds when panel is open
  const pollingInterval = setInterval(() => {
    if (wrapper.classList.contains("is-open")) {
      pollMessages();
    }
  }, 3000);

  launcher.addEventListener("click", () => {
    const currentlyOpen = wrapper.classList.contains("is-open");
    setOpen(!currentlyOpen);
    if (!currentlyOpen) pollMessages();
  });

  closeButton.addEventListener("click", () => setOpen(false));

  formElement.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.textContent = "";

    const localePack = getSupportLocale();
    const name = nameInput.value.trim();
    const contact = contactInput.value.trim();
    const question = questionInput.value.trim();

    if (!contact || !question) {
      status.textContent = localePack.needFields;
      return;
    }

    sendButton.disabled = true;

    try {
      const result = await sendToTelegram(
        localePack.supportType,
        {
          Страница: window.location.href,
          Имя: name || "—",
          Контакт: contact,
          Вопрос: question,
        },
        null,
        sessionId
      );

      addMessageToUI(question, true);
      addMessageToUI(localePack.sent, false);
      supportElements.lastMessageTimestamp = Date.now();

      formElement.reset();
      status.textContent = localePack.sent;
      
      // Start polling for responses
      pollMessages();
    } catch (error) {
      const fallback = `${localePack.failed} ${formatSubmitError(error)}`;
      status.textContent = fallback;
    } finally {
      sendButton.disabled = false;
    }
  });

  updateSupportWidgetLanguage();
  supportWidgetInitialized = true;

  // Cleanup on page unload
  window.addEventListener("beforeunload", () => {
    if (pollingInterval) clearInterval(pollingInterval);
  });
}

function applyLanguage() {
  autoTranslateRunId += 1;
  restoreOriginalDomState();
  updateCommonUiLanguage();
  localizeMetaByPage();
  localizeHomeContent();
  localizeExtendedHomeContent();
  localizeHomeMissingBlocks();
  localizeInnerPagesContent();
  autoTranslateRemainingContent();
  updateLanguageButtons();
  updateSupportWidgetLanguage();

  [form, leadForm].forEach((formEl) => {
    const submitButton = formEl?.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.dataset.defaultText = submitButton.textContent || t("submit");
    }
  });

  calcPrice();
}

function initFormSecurity(formEl) {
  const ts = formEl?.querySelector('[name="_loadedAt"]');
  if (ts) ts.value = String(PAGE_LOADED_AT);
}

function checkAntiSpam(formEl) {
  const hp = formEl?.querySelector('[name="_hp"]');
  if (hp && hp.value.trim() !== "") return false;

  const ts = formEl?.querySelector('[name="_loadedAt"]');
  if (ts) {
    const elapsed = Date.now() - Number(ts.value || 0);
    if (elapsed < MIN_FILL_MS) return false;
  }
  return true;
}

document.querySelectorAll('[name="_loadedAt"]').forEach((el) => {
  el.value = String(PAGE_LOADED_AT);
});

function setFormSubmitting(formEl, isSubmitting) {
  const submitButton = formEl?.querySelector('button[type="submit"]');
  if (!submitButton) return;

  if (!submitButton.dataset.defaultText) {
    submitButton.dataset.defaultText = submitButton.textContent || t("submit");
  }

  submitButton.disabled = isSubmitting;
  submitButton.textContent = isSubmitting ? t("sending") : submitButton.dataset.defaultText;
}

async function getApiUrlFromSiteConfig() {
  if (!siteConfigPromise) {
    siteConfigPromise = fetch("site-config.json", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null);
  }

  try {
    const config = await siteConfigPromise;
    const apiBaseUrl = typeof config?.apiBaseUrl === "string" ? config.apiBaseUrl.trim() : "";
    return apiBaseUrl;
  } catch {
    return "";
  }
}

async function resolveApiBaseUrl() {
  const runtimeUrl = typeof window.SITEMY_API_URL === "string" ? window.SITEMY_API_URL.trim() : "";
  if (runtimeUrl) return runtimeUrl;

  const metaUrl = document.querySelector('meta[name="sitemy-api-url"]')?.getAttribute("content")?.trim() || "";
  if (metaUrl) return metaUrl;

  const storedUrl = localStorage.getItem(API_URL_STORAGE_KEY)?.trim() || "";
  if (storedUrl) return storedUrl;

  const isLocalHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  if (isLocalHost) return "";

  return await getApiUrlFromSiteConfig();
}

async function resolveTelegramEndpoint() {
  const baseUrl = await resolveApiBaseUrl();
  if (!baseUrl) return "/api/telegram";
  return `${baseUrl.replace(/\/$/, "")}/api/telegram`;
}

async function sendToTelegram(type, payload, formEl, sessionId = null) {
  const hp = formEl ? (formEl.querySelector('[name="_hp"]')?.value || "") : "";
  const loadedAt = formEl ? (formEl.querySelector('[name="_loadedAt"]')?.value || "") : "";
  const endpoint = await resolveTelegramEndpoint();

  if (window.location.hostname.endsWith("github.io") && endpoint === "/api/telegram") {
    throw new Error("Для GitHub Pages не настроен публичный API endpoint");
  }

  const body = { type, payload, _hp: hp, _loadedAt: loadedAt };
  if (sessionId) body.sessionId = sessionId;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  let result = null;
  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (!response.ok || !result?.ok) {
    const details = result?.details?.description ? ` (${result.details.description})` : "";
    const message = result?.message || `HTTP ${response.status}`;
    throw new Error(`${message}${details}`);
  }

  return result;
}

function formatSubmitError(error) {
  const message = String(error?.message || "");

  if (window.location.protocol === "file:") {
    return t("fileMode");
  }

  if (message.includes("Failed to fetch")) {
    return t("noApi");
  }

  if (message.includes("не настроен публичный API endpoint")) {
    return "Для сайта на GitHub Pages нужно подключить внешний API (см. README: Cloudflare Worker).";
  }

  return `${t("sendErr")}: ${message}`;
}

function calcPrice() {
  if (!form) return null;
  const data = new FormData(form);
  const siteType = String(data.get("siteType") || "landing");
  const urgency = String(data.get("urgency") || "normal");
  const selectedExtras = data.getAll("extras");

  const localePack = LOCALE[currentLang] || LOCALE.ru;
  let total = baseConfig[siteType]?.price || baseConfig.landing.price;
  let time = localePack.timeMap[siteType] || localePack.timeMap.landing;

  selectedExtras.forEach((key) => {
    total += extras[key] || 0;
  });

  if (urgency === "fast") {
    total = Math.round(total * 1.2);
    time = localePack.timeMap.fast;
  }

  if (resultPrice) resultPrice.textContent = `${localePack.from} ${total.toLocaleString(localePack.locale)} грн`;
  if (resultTime) resultTime.textContent = `${localePack.timeLabel}: ${time}`;

  return { total, time, siteType, urgency, selectedExtras };
}

form?.addEventListener("change", () => calcPrice());

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (calcStatus) calcStatus.textContent = "";

  if (isCalcSubmitting) {
    if (calcStatus) calcStatus.textContent = t("wait");
    return;
  }

  if (!checkAntiSpam(form)) {
    if (calcStatus) calcStatus.textContent = t("tooFast");
    return;
  }

  const estimate = calcPrice();
  if (!estimate) return;

  const localePack = LOCALE[currentLang] || LOCALE.ru;
  const { total, time, siteType, urgency, selectedExtras } = estimate;

  isCalcSubmitting = true;
  setFormSubmitting(form, true);

  try {
    await sendToTelegram(localePack.calcType, {
      [localePack.payload.siteType]: localePack.siteTypeLabel[siteType],
      [localePack.payload.urgency]: localePack.urgencyLabel[urgency],
      [localePack.payload.options]: selectedExtras.length ? selectedExtras.join(", ") : localePack.payload.noOptions,
      [localePack.payload.estimate]: `${localePack.from} ${total.toLocaleString(localePack.locale)} грн`,
      [localePack.payload.term]: time,
    }, form);
    if (calcStatus) calcStatus.textContent = t("calcSent");
  } catch (error) {
    if (calcStatus) calcStatus.textContent = formatSubmitError(error);
  } finally {
    isCalcSubmitting = false;
    setFormSubmitting(form, false);
  }
});

initFormSecurity(form);

leadForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (leadStatus) leadStatus.textContent = "";

  if (isLeadSubmitting) {
    if (leadStatus) leadStatus.textContent = t("wait");
    return;
  }

  if (!checkAntiSpam(leadForm)) {
    if (leadStatus) leadStatus.textContent = t("tooFast");
    return;
  }

  const data = new FormData(leadForm);
  const name = String(data.get("name") || "").trim();
  const contact = String(data.get("contact") || "").trim();
  const project = String(data.get("project") || "").trim();

  if (!name || !contact) {
    if (leadStatus) leadStatus.textContent = t("fillContact");
    return;
  }

  const localePack = LOCALE[currentLang] || LOCALE.ru;
  isLeadSubmitting = true;
  setFormSubmitting(leadForm, true);

  try {
    await sendToTelegram(localePack.leadType, {
      [localePack.payload.name]: name,
      [localePack.payload.contact]: contact,
      [localePack.payload.project]: project || "—",
    }, leadForm);

    if (leadStatus) leadStatus.textContent = t("leadSent");
    leadForm.reset();
    initFormSecurity(leadForm);
  } catch (error) {
    if (leadStatus) leadStatus.textContent = formatSubmitError(error);
  } finally {
    isLeadSubmitting = false;
    setFormSubmitting(leadForm, false);
  }
});

initFormSecurity(leadForm);

function initRevealAnimations() {
  const targets = document.querySelectorAll(
    ".hero-main, .hero-panel, .trust-strip div, .case-card, .mockup-card, .cards .card, .process-strip div, .timeline-step, .calc-wrap > div, .result, .cta-grid > div, .lead-form, .faq details"
  );

  if (!targets.length) return;

  targets.forEach((element) => {
    element.classList.add("reveal-item");
  });

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.14, rootMargin: "0px 0px -40px 0px" }
  );

  targets.forEach((element) => observer.observe(element));
}

initLanguageSwitcher();
initSupportWidget();
captureOriginalDomState();
applyLanguage();
initRevealAnimations();
