(function () {
  var SERVICES_KEY = "landingAdminServices";
  var ORDERS_KEY = "landingAdminOrders";
  var CHATS_KEY = "landingAdminChats";

  var launcher = document.getElementById("chatbot-launcher");
  var panel = document.getElementById("chatbot-panel");
  var closeBtn = document.getElementById("chatbot-close");
  var messagesEl = document.getElementById("chatbot-messages");
  var quickRepliesEl = document.getElementById("chatbot-quick-replies");
  var leadForm = document.getElementById("chatbot-lead-form");
  var msgForm = document.getElementById("chatbot-message-form");
  var msgInput = document.getElementById("chatbot-input");
  var sendBtn = document.getElementById("chatbot-send");
  var managerRow = document.getElementById("chatbot-manager-row");
  var resetBtn = document.getElementById("chatbot-reset");
  var nameInput = document.getElementById("chatbot-name");
  var contactMethodInput = document.getElementById("chatbot-contact-method");
  var contactValueInput = document.getElementById("chatbot-contact-value");
  var consentInput = document.getElementById("chatbot-consent");

  if (!launcher || !panel || !messagesEl || !quickRepliesEl || !leadForm || !msgForm || !msgInput || !sendBtn || !managerRow || !resetBtn || !nameInput || !contactMethodInput || !contactValueInput || !consentInput) return;

  var session = {
    id: "",
    leadReady: false,
    clientName: "",
    contact: "",
    contactMethod: "",
    intakeStep: "niche",
    brief: {
      niche: "",
      goal: "",
      placement: "",
      audience: "",
      timeline: ""
    },
    chatCompleted: false
  };

  function readArray(key) {
    try {
      var raw = localStorage.getItem(key);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function writeArray(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function normalizePhone(value) { return (value || "").replace(/[^\d+]/g, ""); }

  function formatRuPhone(digits) {
    var d = digits.replace(/\D/g, "");
    if (d.startsWith("8")) d = "7" + d.slice(1);
    if (d.startsWith("9")) d = "7" + d;
    if (!d.startsWith("7")) d = "7" + d;
    d = d.slice(0, 11);
    var p1 = d.slice(1, 4);
    var p2 = d.slice(4, 7);
    var p3 = d.slice(7, 9);
    var p4 = d.slice(9, 11);
    var result = "+7";
    if (p1) result += " (" + p1;
    if (p1.length === 3) result += ")";
    if (p2) result += " " + p2;
    if (p3) result += "-" + p3;
    if (p4) result += "-" + p4;
    return result;
  }

  function isPhoneComplete(value) {
    return normalizePhone(value).length >= 11;
  }

  function getContactMethodLabel(value) {
    if (value === "telegram") return "Telegram";
    if (value === "whatsapp") return "WhatsApp";
    if (value === "phone") return "Телефон";
    if (value === "email") return "E-mail";
    if (value === "other") return "Другой";
    return "Не указан";
  }

  function updateContactInputByMethod() {
    var method = contactMethodInput.value;
    contactValueInput.value = "";
    contactValueInput.disabled = !method;
    contactValueInput.type = "text";
    contactValueInput.removeAttribute("maxlength");
    contactValueInput.removeAttribute("inputmode");

    if (!method) {
      contactValueInput.placeholder = "Выберите способ связи";
      return;
    }
    if (method === "telegram") {
      contactValueInput.placeholder = "@username";
      return;
    }
    if (method === "whatsapp" || method === "phone") {
      contactValueInput.placeholder = "+7 (___) ___-__-__";
      contactValueInput.inputMode = "tel";
      contactValueInput.maxLength = 18;
      return;
    }
    if (method === "email") {
      contactValueInput.type = "email";
      contactValueInput.placeholder = "name@example.com";
      return;
    }
    contactValueInput.placeholder = "Укажите удобный контакт";
  }

  function validateContactByMethod() {
    var method = contactMethodInput.value;
    var value = contactValueInput.value.trim();
    if (!method || !value) return false;
    if (method === "telegram") return /^@?[a-zA-Z0-9_]{5,}$/.test(value);
    if (method === "whatsapp" || method === "phone") return isPhoneComplete(value);
    if (method === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    return value.length >= 3;
  }

  function normalizeContactByMethod() {
    var method = contactMethodInput.value;
    var value = contactValueInput.value.trim();
    if (method === "telegram") return value.startsWith("@") ? value : "@" + value;
    if (method === "whatsapp" || method === "phone") return normalizePhone(value);
    return value;
  }

  function addMessage(role, text) {
    var msg = document.createElement("div");
    msg.className = "chat-msg " + role;
    msg.innerHTML = text;
    messagesEl.appendChild(msg);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    if (!session.id) return;
    var chats = readArray(CHATS_KEY);
    var chat = chats.find(function (item) { return item.id === session.id; });
    if (!chat) return;
    chat.messages.push({
      role: role,
      text: text.replace(/<br>/g, "\n"),
      createdAt: new Date().toISOString()
    });
    chat.lastMessage = text.replace(/<br>/g, " ");
    chat.updatedAt = new Date().toISOString();
    writeArray(CHATS_KEY, chats);
  }

  function clearQuickReplies() {
    quickRepliesEl.innerHTML = "";
    quickRepliesEl.hidden = true;
  }

  function getQuickRepliesForStep(step) {
    if (step === "niche") {
      return ["Эксперт/консультант", "Интернет-магазин", "Онлайн-обучение", "Услуги", "Другое"];
    }
    if (step === "goal") {
      return ["Заявки", "Продажи", "Запись клиентов", "Презентация услуги", "MVP/тест идеи"];
    }
    return [];
  }

  function showQuickReplies() {
    clearQuickReplies();
    var variants = getQuickRepliesForStep(session.intakeStep);
    if (!variants.length) return;

    quickRepliesEl.hidden = false;
    quickRepliesEl.innerHTML = "";

    variants.forEach(function (label) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "chat-quick-btn";
      button.textContent = label;
      button.addEventListener("click", function () {
        processUserMessage(label);
      });
      quickRepliesEl.appendChild(button);
    });

    quickRepliesEl.scrollIntoView({ block: "nearest" });
  }

  function getServices() {
    var services = readArray(SERVICES_KEY);
    if (services.length) return services;
    return [
      { name: "Первая консультация", category: "consultation", price: 0 },
      { name: "Дальнейшая консультация", category: "consultation", price: 2500 },
      { name: "Проектная работа", category: "project", price: 10000 },
      { name: "Сопровождение / аудит", category: "support", price: 0 }
    ];
  }

  function classifyNeed(text) {
    var t = text.toLowerCase();
    if (/(аудит|проверить|улучшить|анализ)/.test(t)) return "audit";
    if (/(сайт|лендинг|бот|прилож|mvp|игр|проект)/.test(t)) return "project";
    if (/(поддерж|сопровожд|доработ)/.test(t)) return "support";
    return "consultation";
  }

  function recommendService(category) {
    var services = getServices();
    var matched = services.find(function (s) { return s.category === category; }) || services[0];
    var price = matched && matched.price ? Number(matched.price).toLocaleString("ru-RU") + " ₽" : "по задаче";
    return "Спасибо, уже понятнее.<br>Рекомендую начать с услуги <strong>" + matched.name + "</strong>.<br>Ориентировочная стоимость: <strong>" + price + "</strong>.<br><br>Напишите: <em>Согласен, оформить заявку</em>";
  }

  function buildBriefText() {
    return [
      "Ниша: " + (session.brief.niche || "не указана"),
      "Цель: " + (session.brief.goal || "не указана"),
      "Размещение: " + (session.brief.placement || "не указано"),
      "Аудитория: " + (session.brief.audience || "не указана"),
      "Сроки: " + (session.brief.timeline || "не указаны")
    ].join("; ");
  }

  function handleIntake(text) {
    if (session.intakeStep === "niche") {
      session.brief.niche = text;
      session.intakeStep = "goal";
      return "Спасибо. Какая основная цель проекта: заявки, продажи, запись, презентация услуги или другое?";
    }
    if (session.intakeStep === "goal") {
      session.brief.goal = text;
      session.intakeStep = "placement";
      return "Отлично, спасибо. Где планируете размещать проект: сайт (в том числе лендинг), Telegram mini app, маркетплейс или другое?";
    }
    if (session.intakeStep === "placement") {
      session.brief.placement = text;
      session.intakeStep = "audience";
      return "Понял. Кто ваша целевая аудитория и какое ключевое действие должен сделать пользователь?";
    }
    if (session.intakeStep === "audience") {
      session.brief.audience = text;
      session.intakeStep = "timeline";
      return "Отлично. Подскажите желаемые сроки запуска и, если комфортно, ориентир по бюджету.";
    }
    if (session.intakeStep === "timeline") {
      session.brief.timeline = text;
      session.intakeStep = "done";
      var category = classifyNeed(buildBriefText());
      return recommendService(category);
    }
    return "";
  }

  function createOrderFromChat(taskText, escalated) {
    var orders = readArray(ORDERS_KEY);
    orders.unshift({
      id: "ORD-" + Date.now().toString(36).toUpperCase(),
      createdAt: new Date().toISOString(),
      clientName: session.clientName || "Не указано",
      contact: (session.contact ? session.contact + " (" + getContactMethodLabel(session.contactMethod) + ")" : "Не указан"),
      phone: (session.contactMethod === "whatsapp" || session.contactMethod === "phone") ? session.contact : "",
      task: taskText || "Заявка из чат-бота",
      category: escalated ? "support" : classifyNeed(taskText || ""),
      amount: 0,
      status: "new",
      archived: false,
      source: "chatbot",
      formTitle: escalated ? "Тикет оператору" : "Заявка из чат-бота"
    });
    writeArray(ORDERS_KEY, orders);
  }

  function escalateToOperator(reason) {
    var chats = readArray(CHATS_KEY);
    var chat = chats.find(function (item) { return item.id === session.id; });
    if (chat) {
      chat.ticket = true;
      chat.ticketStatus = "open";
      chat.ticketReason = reason || "Пользователь запросил оператора";
      chat.updatedAt = new Date().toISOString();
      writeArray(CHATS_KEY, chats);
    }
    createOrderFromChat(reason || "Нужен живой оператор", true);
  }

  function botReply(userText) {
    var text = (userText || "").toLowerCase();
    if (/(оператор|живой|человек|сложно|трудно)/.test(text)) {
      escalateToOperator(userText);
      return "Я передал запрос живому оператору. Он свяжется с вами в ближайшее время. Тикет уже создан в админке.<br>Если хотите написать сразу, вот контакт менеджера: <a href=\"https://t.me/Sveg77\" target=\"_blank\" rel=\"noopener noreferrer\">@Sveg77</a>.";
    }
    if (/(согласен|оформ|подходит|беру)/.test(text)) {
      var taskText = session.intakeStep === "done" ? (userText + ". Бриф: " + buildBriefText()) : userText;
      createOrderFromChat(taskText, false);
      session.chatCompleted = true;
      return [
        "Отлично, оформляю заявку.",
        "Готово! Ваша заявка добавлена, и с вами свяжутся в ближайшее время."
      ];
    }
    if (/(цена|стоим|бюджет|сколько)/.test(text)) {
      if (session.intakeStep !== "done") {
        return "Чтобы назвать стоимость точнее, сначала коротко уточню задачу. Расскажите, какая у вас цель проекта?";
      }
      var services = getServices();
      var lines = services.map(function (s) {
        var p = s.price ? Number(s.price).toLocaleString("ru-RU") + " ₽" : "по задаче";
        return "• " + s.name + " — " + p;
      });
      return "Вот ориентиры по стоимости:<br>" + lines.join("<br>") + "<br><br>Опишите задачу, и я подскажу оптимальный вариант.";
    }
    if (session.intakeStep !== "done") {
      return handleIntake(userText);
    }
    var need = classifyNeed(userText + " " + buildBriefText());
    return recommendService(need);
  }

  function processUserMessage(text) {
    if (!session.leadReady) return;
    var normalizedText = (text || "").trim();
    if (!normalizedText) return;
    clearQuickReplies();
    addMessage("user", normalizedText);
    msgInput.value = "";
    var response = botReply(normalizedText);
    window.setTimeout(function () {
      if (Array.isArray(response)) {
        response.forEach(function (message, index) {
          window.setTimeout(function () {
            addMessage("bot", message);
          }, index * 180);
        });
      } else {
        addMessage("bot", response);
      }
      showQuickReplies();
      if (session.chatCompleted) {
        clearQuickReplies();
        msgForm.hidden = true;
        managerRow.hidden = true;
        return;
      }
      if (session.intakeStep === "done") {
        managerRow.hidden = false;
        msgInput.value = "";
        msgInput.placeholder = "";
        msgInput.classList.remove("is-consent-hint");
        msgInput.focus();
        msgForm.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } else {
        managerRow.hidden = true;
        msgInput.placeholder = "Напишите вопрос...";
        msgInput.classList.remove("is-consent-hint");
      }
    }, 300);
  }

  function initChatRecord() {
    session.id = "CHAT-" + Date.now().toString(36).toUpperCase();
    var chats = readArray(CHATS_KEY);
    chats.unshift({
      id: session.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      clientName: session.clientName,
      phone: session.contact,
      contactMethod: session.contactMethod,
      leadAccepted: true,
      ticket: false,
      ticketStatus: "none",
      lastMessage: "",
      messages: []
    });
    writeArray(CHATS_KEY, chats);
  }

  function resetToLeadState() {
    session.id = "";
    session.leadReady = false;
    session.chatCompleted = false;
    session.intakeStep = "niche";
    session.brief = { niche: "", goal: "", placement: "", audience: "", timeline: "" };

    messagesEl.innerHTML = "";
    clearQuickReplies();
    leadForm.hidden = false;
    msgForm.hidden = true;
    managerRow.hidden = true;
    msgInput.disabled = true;
    sendBtn.disabled = true;
    msgInput.value = "";
    msgInput.placeholder = "Напишите вопрос...";
    msgInput.classList.remove("is-consent-hint");

    nameInput.value = "";
    contactMethodInput.value = "";
    contactValueInput.value = "";
    consentInput.checked = false;
    updateContactInputByMethod();
    window.setTimeout(function () {
      nameInput.value = "";
      contactValueInput.value = "";
      msgInput.value = "";
    }, 0);
    window.setTimeout(function () {
      nameInput.value = "";
      contactValueInput.value = "";
      msgInput.value = "";
    }, 120);
  }

  function openPanel() {
    panel.hidden = false;
    launcher.style.display = "none";
    if (!session.leadReady) {
      resetToLeadState();
    }
  }

  function closePanel() {
    panel.hidden = true;
    launcher.style.display = "inline-flex";
    updateLauncherContrast();
  }

  function updateLauncherContrast() {
    if (launcher.style.display === "none") return;
    var rect = launcher.getBoundingClientRect();
    var centerX = rect.left + rect.width / 2;
    var centerY = rect.top + rect.height / 2;
    var stack = document.elementsFromPoint(centerX, centerY);
    if (!stack || !stack.length) return;

    var probeEl = null;
    for (var i = 0; i < stack.length; i += 1) {
      var el = stack[i];
      if (el === launcher) continue;
      if (panel.contains(el)) continue;
      probeEl = el;
      break;
    }

    if (!probeEl) {
      launcher.classList.remove("is-on-dark");
      return;
    }

    var host = probeEl.closest(".hero, .section, .site-header, .site-footer, .final-cta");
    if (!host) {
      launcher.classList.remove("is-on-dark");
      return;
    }

    function luminanceFromRgb(bg) {
      var m = bg && bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/i);
      if (!m) return null;
      var alpha = typeof m[4] === "undefined" ? 1 : Number(m[4]);
      if (alpha === 0) return null;
      var r = Number(m[1]);
      var g = Number(m[2]);
      var b = Number(m[3]);
      return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    }

    var node = host;
    var luminance = null;
    while (node && node !== document.documentElement && node !== document.body) {
      var bg = window.getComputedStyle(node).backgroundColor;
      luminance = luminanceFromRgb(bg);
      if (luminance !== null) break;
      node = node.parentElement;
    }

    var isDark = host.classList.contains("section-dark");
    if (luminance !== null) {
      isDark = luminance < 0.52;
    }

    // Hero visually dark even if computed background is transparent.
    if (host.classList && host.classList.contains("hero")) {
      isDark = true;
    }

    launcher.classList.toggle("is-on-dark", isDark);
  }

  window.addEventListener("load", function () {
    updateLauncherContrast();
    window.setTimeout(updateLauncherContrast, 120);
    window.setTimeout(updateLauncherContrast, 400);
  });

  // Initial state: chat stays closed until user clicks launcher
  closePanel();
  msgForm.hidden = true;
  msgInput.disabled = true;
  sendBtn.disabled = true;
  managerRow.hidden = true;
  updateContactInputByMethod();

  launcher.addEventListener("click", openPanel);
  closeBtn.addEventListener("click", closePanel);
  document.addEventListener("click", function (event) {
    if (panel.hidden) return;
    var path = typeof event.composedPath === "function" ? event.composedPath() : [];
    var clickedInsidePanel = path.indexOf(panel) !== -1;
    var clickedLauncher = path.indexOf(launcher) !== -1;
    if (clickedInsidePanel || clickedLauncher) return;
    closePanel();
  });
  contactMethodInput.addEventListener("change", updateContactInputByMethod);
  window.addEventListener("scroll", updateLauncherContrast, { passive: true });
  window.addEventListener("resize", updateLauncherContrast);

  contactValueInput.addEventListener("input", function () {
    if (contactMethodInput.value === "whatsapp" || contactMethodInput.value === "phone") {
      contactValueInput.value = formatRuPhone(contactValueInput.value);
    }
  });

  leadForm.addEventListener("submit", function (event) {
    event.preventDefault();
    if (!validateContactByMethod()) {
      contactValueInput.focus();
      return;
    }
    session.clientName = nameInput.value.trim();
    session.contact = normalizeContactByMethod();
    session.contactMethod = contactMethodInput.value;
    session.leadReady = true;
    session.chatCompleted = false;
    initChatRecord();
    leadForm.hidden = true;
    msgForm.hidden = false;
    msgInput.disabled = false;
    sendBtn.disabled = false;
    managerRow.hidden = true;
    msgInput.placeholder = "Напишите вопрос...";
    msgInput.classList.remove("is-consent-hint");
    session.intakeStep = "niche";
    session.brief = { niche: "", goal: "", placement: "", audience: "", timeline: "" };
    addMessage("bot", "Здравствуйте, " + session.clientName + "!");
    addMessage("bot", "Чтобы дать точную рекомендацию и не перегружать вас, уточню 5 коротких пунктов.<br>1) В каком направлении работаете (ниша)?");
    showQuickReplies();
    window.requestAnimationFrame(function () {
      msgInput.focus();
      msgForm.scrollIntoView({ behavior: "smooth", block: "end" });
    });
  });

  msgForm.addEventListener("submit", function (event) {
    event.preventDefault();
    processUserMessage(msgInput.value);
  });

  resetBtn.addEventListener("click", function () {
    resetToLeadState();
  });

  updateLauncherContrast();
})();
