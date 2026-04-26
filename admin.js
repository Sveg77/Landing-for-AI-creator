(function () {
  var ADMIN_PASSWORD = "Sveg-admin-2026";
  var AUTH_KEY = "landingAdminAuthOk";

  if (sessionStorage.getItem(AUTH_KEY) !== "1") {
    var input = window.prompt("Введите пароль для входа в админ-панель:");
    if (input !== ADMIN_PASSWORD) {
      alert("Неверный пароль. Доступ запрещён.");
      window.location.href = "index.html";
      return;
    }
    sessionStorage.setItem(AUTH_KEY, "1");
  }

  var ORDERS_KEY = "landingAdminOrders";
  var SERVICES_KEY = "landingAdminServices";
  var CHATS_KEY = "landingAdminChats";
  var STATUS_LABELS = {
    new: "Новый",
    in_progress: "В работе",
    completed: "Завершен",
    archived: "В архиве"
  };
  var CATEGORY_LABELS = {
    general: "Общее",
    consultation: "Консультация",
    audit: "Аудит",
    project: "Проект",
    support: "Сопровождение",
    other: "Другое"
  };

  function readJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function defaultServices() {
    return [
      { id: "SRV-1", name: "Первая консультация", category: "consultation", price: 0, description: "15 минут бесплатно", imageData: "" },
      { id: "SRV-2", name: "Дальнейшая консультация", category: "consultation", price: 2500, description: "Глубокий разбор задачи", imageData: "" },
      { id: "SRV-3", name: "Проектная работа", category: "project", price: 10000, description: "Сайт, приложение, бот, MVP", imageData: "" },
      { id: "SRV-4", name: "Сопровождение / аудит", category: "support", price: 0, description: "Развитие и улучшение существующего проекта", imageData: "" }
    ];
  }

  var orders = readJSON(ORDERS_KEY, []);
  var services = readJSON(SERVICES_KEY, []);
  if (!services.length) {
    services = defaultServices();
    writeJSON(SERVICES_KEY, services);
  }

  var dashRange = document.getElementById("dash-range");
  var dashFrom = document.getElementById("dash-from");
  var dashTo = document.getElementById("dash-to");
  var dashApply = document.getElementById("dash-apply");

  var orderSearch = document.getElementById("order-search");
  var orderStatusFilter = document.getElementById("order-status-filter");
  var orderCategoryFilter = document.getElementById("order-category-filter");
  var ordersBody = document.getElementById("orders-body");

  var serviceSearch = document.getElementById("service-search");
  var serviceCategoryFilter = document.getElementById("service-category-filter");
  var servicesGrid = document.getElementById("services-grid");
  var serviceForm = document.getElementById("service-form");
  var serviceImageInput = document.getElementById("service-image");
  var chatSearch = document.getElementById("chat-search");
  var chatFilter = document.getElementById("chat-filter");
  var chatsBody = document.getElementById("chats-body");

  var pendingImageData = "";
  var chats = readJSON(CHATS_KEY, []);

  function startOfDay(date) {
    var d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function endOfDay(date) {
    var d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  function rangeByPreset(preset) {
    var now = new Date();
    var from = startOfDay(now);
    var to = endOfDay(now);
    if (preset === "today") return { from: from, to: to };
    if (preset === "week") {
      from.setDate(from.getDate() - 6);
      return { from: from, to: to };
    }
    if (preset === "month") {
      from.setMonth(from.getMonth() - 1);
      return { from: from, to: to };
    }
    if (preset === "3m") {
      from.setMonth(from.getMonth() - 3);
      return { from: from, to: to };
    }
    if (preset === "6m") {
      from.setMonth(from.getMonth() - 6);
      return { from: from, to: to };
    }
    if (preset === "12m") {
      from.setMonth(from.getMonth() - 12);
      return { from: from, to: to };
    }
    var customFrom = dashFrom.value ? startOfDay(new Date(dashFrom.value)) : null;
    var customTo = dashTo.value ? endOfDay(new Date(dashTo.value)) : null;
    return { from: customFrom, to: customTo };
  }

  function inRange(dateIso, range) {
    var dt = new Date(dateIso);
    if (Number.isNaN(dt.getTime())) return false;
    if (range.from && dt < range.from) return false;
    if (range.to && dt > range.to) return false;
    return true;
  }

  function formatDate(iso) {
    var dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return "-";
    return dt.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function statusSelect(order) {
    var options = Object.keys(STATUS_LABELS).map(function (key) {
      var selected = order.status === key ? " selected" : "";
      return "<option value=\"" + key + "\"" + selected + ">" + STATUS_LABELS[key] + "</option>";
    }).join("");
    return "<select data-action=\"status\" data-id=\"" + order.id + "\">" + options + "</select>";
  }

  function categorySelect(order) {
    var options = Object.keys(CATEGORY_LABELS).map(function (key) {
      var selected = (order.category || "general") === key ? " selected" : "";
      return "<option value=\"" + key + "\"" + selected + ">" + CATEGORY_LABELS[key] + "</option>";
    }).join("");
    return "<select data-action=\"category\" data-id=\"" + order.id + "\">" + options + "</select>";
  }

  function renderOrders() {
    var query = (orderSearch.value || "").trim().toLowerCase();
    var statusFilter = orderStatusFilter.value;
    var categoryFilter = orderCategoryFilter.value;

    var filtered = orders.filter(function (order) {
      var haystack = (order.clientName + " " + order.contact + " " + (order.phone || "")).toLowerCase();
      var queryMatch = !query || haystack.indexOf(query) !== -1;
      var statusMatch = statusFilter === "all" || order.status === statusFilter;
      var categoryMatch = categoryFilter === "all" || (order.category || "general") === categoryFilter;
      return queryMatch && statusMatch && categoryMatch;
    });

    ordersBody.innerHTML = filtered.map(function (order) {
      return [
        "<tr>",
        "<td>" + order.id + "</td>",
        "<td>" + formatDate(order.createdAt) + "</td>",
        "<td><strong>" + (order.clientName || "-") + "</strong><br><small>" + (order.formTitle || "") + "</small></td>",
        "<td>" + (order.contact || "-") + "</td>",
        "<td>" + categorySelect(order) + "</td>",
        "<td><input data-action=\"amount\" data-id=\"" + order.id + "\" type=\"number\" min=\"0\" step=\"100\" value=\"" + (order.amount || 0) + "\" style=\"width:100px\"></td>",
        "<td>" + statusSelect(order) + "</td>",
        "<td><div class=\"row-actions\">" +
          "<button class=\"tiny-btn warn\" data-action=\"archive\" data-id=\"" + order.id + "\">Архив</button>" +
          "<button class=\"tiny-btn danger\" data-action=\"delete\" data-id=\"" + order.id + "\">Удалить</button>" +
        "</div></td>",
        "</tr>"
      ].join("");
    }).join("");
  }

  function updateDashboard() {
    var range = rangeByPreset(dashRange.value);
    var inRangeOrders = orders.filter(function (order) {
      return inRange(order.createdAt, range);
    });

    var totalOrders = inRangeOrders.length;
    var totalSales = inRangeOrders.reduce(function (sum, order) {
      return sum + (Number(order.amount) || 0);
    }, 0);

    document.getElementById("stat-orders").textContent = String(totalOrders);
    document.getElementById("stat-sales").textContent = totalSales.toLocaleString("ru-RU") + " ₽";

    var byStatus = {};
    Object.keys(STATUS_LABELS).forEach(function (status) { byStatus[status] = 0; });
    inRangeOrders.forEach(function (order) {
      byStatus[order.status] = (byStatus[order.status] || 0) + 1;
    });
    document.getElementById("stat-statuses").innerHTML = Object.keys(STATUS_LABELS).map(function (status) {
      return "<li>" + STATUS_LABELS[status] + ": " + (byStatus[status] || 0) + "</li>";
    }).join("");
  }

  function saveOrdersAndRefresh() {
    writeJSON(ORDERS_KEY, orders);
    renderOrders();
    updateDashboard();
  }

  ordersBody.addEventListener("change", function (event) {
    var target = event.target;
    var id = target.getAttribute("data-id");
    var action = target.getAttribute("data-action");
    if (!id || !action) return;
    var order = orders.find(function (item) { return item.id === id; });
    if (!order) return;
    if (action === "status") order.status = target.value;
    if (action === "category") order.category = target.value;
    if (action === "amount") order.amount = Math.max(Number(target.value) || 0, 0);
    saveOrdersAndRefresh();
  });

  ordersBody.addEventListener("click", function (event) {
    var target = event.target;
    var id = target.getAttribute("data-id");
    var action = target.getAttribute("data-action");
    if (!id || !action) return;
    if (action === "delete") {
      if (!confirm("Удалить заказ? Действие нельзя отменить.")) return;
      orders = orders.filter(function (item) { return item.id !== id; });
      saveOrdersAndRefresh();
      return;
    }
    if (action === "archive") {
      var order = orders.find(function (item) { return item.id === id; });
      if (!order) return;
      order.status = "archived";
      order.archived = true;
      saveOrdersAndRefresh();
    }
  });

  [orderSearch, orderStatusFilter, orderCategoryFilter].forEach(function (el) {
    el.addEventListener("input", renderOrders);
    el.addEventListener("change", renderOrders);
  });

  dashRange.addEventListener("change", function () {
    var custom = dashRange.value === "custom";
    dashFrom.disabled = !custom;
    dashTo.disabled = !custom;
    if (!custom) updateDashboard();
  });
  dashApply.addEventListener("click", updateDashboard);

  function renderServices() {
    var query = (serviceSearch.value || "").trim().toLowerCase();
    var category = serviceCategoryFilter.value;
    var filtered = services.filter(function (service) {
      var queryMatch = !query || (service.name + " " + service.description).toLowerCase().indexOf(query) !== -1;
      var catMatch = category === "all" || service.category === category;
      return queryMatch && catMatch;
    });

    servicesGrid.innerHTML = filtered.map(function (service) {
      return [
        "<article class=\"service-card\">",
        service.imageData ? "<img src=\"" + service.imageData + "\" alt=\"" + service.name + "\">" : "",
        "<h3>" + service.name + "</h3>",
        "<p class=\"meta\">" + (CATEGORY_LABELS[service.category] || service.category) + " • " + (service.price ? Number(service.price).toLocaleString("ru-RU") + " ₽" : "По запросу") + "</p>",
        "<p>" + (service.description || "") + "</p>",
        "<div class=\"row-actions\">",
        "<button class=\"tiny-btn\" data-action=\"edit-service\" data-id=\"" + service.id + "\">Редактировать</button>",
        "<button class=\"tiny-btn danger\" data-action=\"delete-service\" data-id=\"" + service.id + "\">Удалить</button>",
        "</div>",
        "</article>"
      ].join("");
    }).join("");
  }

  function resetServiceForm() {
    serviceForm.reset();
    document.getElementById("service-id").value = "";
    pendingImageData = "";
  }

  serviceImageInput.addEventListener("change", function () {
    var file = serviceImageInput.files && serviceImageInput.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      pendingImageData = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  });

  serviceForm.addEventListener("submit", function (event) {
    event.preventDefault();
    var id = document.getElementById("service-id").value;
    var payload = {
      id: id || ("SRV-" + Date.now().toString(36).toUpperCase()),
      name: document.getElementById("service-name").value.trim(),
      category: document.getElementById("service-category").value,
      price: Number(document.getElementById("service-price").value) || 0,
      description: document.getElementById("service-description").value.trim(),
      imageData: pendingImageData || "",
      updatedAt: new Date().toISOString()
    };
    if (!payload.name || !payload.category) return;

    if (id) {
      services = services.map(function (item) {
        if (item.id !== id) return item;
        return {
          id: item.id,
          name: payload.name,
          category: payload.category,
          price: payload.price,
          description: payload.description,
          imageData: payload.imageData || item.imageData || "",
          updatedAt: payload.updatedAt
        };
      });
    } else {
      services.unshift(payload);
    }

    writeJSON(SERVICES_KEY, services);
    resetServiceForm();
    renderServices();
  });

  servicesGrid.addEventListener("click", function (event) {
    var target = event.target;
    var id = target.getAttribute("data-id");
    var action = target.getAttribute("data-action");
    if (!id || !action) return;
    var service = services.find(function (item) { return item.id === id; });
    if (!service) return;

    if (action === "edit-service") {
      document.getElementById("service-id").value = service.id;
      document.getElementById("service-name").value = service.name || "";
      document.getElementById("service-category").value = service.category || "";
      document.getElementById("service-price").value = service.price || 0;
      document.getElementById("service-description").value = service.description || "";
      pendingImageData = service.imageData || "";
      window.scrollTo({ top: document.getElementById("services").offsetTop - 20, behavior: "smooth" });
      return;
    }

    if (action === "delete-service") {
      if (!confirm("Удалить услугу?")) return;
      services = services.filter(function (item) { return item.id !== id; });
      writeJSON(SERVICES_KEY, services);
      renderServices();
    }
  });

  [serviceSearch, serviceCategoryFilter].forEach(function (el) {
    el.addEventListener("input", renderServices);
    el.addEventListener("change", renderServices);
  });

  function renderChats() {
    if (!chatsBody) return;
    chats = readJSON(CHATS_KEY, []);
    var query = (chatSearch && chatSearch.value || "").trim().toLowerCase();
    var filter = chatFilter ? chatFilter.value : "all";
    var filtered = chats.filter(function (chat) {
      var haystack = ((chat.clientName || "") + " " + (chat.phone || "")).toLowerCase();
      var queryMatch = !query || haystack.indexOf(query) !== -1;
      var ticketOpen = chat.ticket && chat.ticketStatus === "open";
      var ticketAny = chat.ticket;
      var ticketMatch = filter === "all" || (filter === "ticket_open" ? ticketOpen : ticketAny);
      return queryMatch && ticketMatch;
    });

    chatsBody.innerHTML = filtered.map(function (chat) {
      return [
        "<tr>",
        "<td>" + chat.id + "</td>",
        "<td>" + formatDate(chat.createdAt) + "</td>",
        "<td><strong>" + (chat.clientName || "-") + "</strong><br><small>" + (chat.phone || "-") + "</small></td>",
        "<td>" + (chat.lastMessage || "-") + "</td>",
        "<td>" + (chat.ticket ? (chat.ticketStatus === "open" ? "Открыт" : "Закрыт") : "Нет") + "</td>",
        "<td><div class=\"row-actions\">" +
          (chat.ticket && chat.ticketStatus === "open" ? "<button class=\"tiny-btn warn\" data-action=\"resolve-ticket\" data-id=\"" + chat.id + "\">Закрыть тикет</button>" : "") +
          "<button class=\"tiny-btn danger\" data-action=\"delete-chat\" data-id=\"" + chat.id + "\">Удалить</button>" +
        "</div></td>",
        "</tr>"
      ].join("");
    }).join("");
  }

  if (chatSearch) chatSearch.addEventListener("input", renderChats);
  if (chatFilter) chatFilter.addEventListener("change", renderChats);
  if (chatsBody) {
    chatsBody.addEventListener("click", function (event) {
      var target = event.target;
      var id = target.getAttribute("data-id");
      var action = target.getAttribute("data-action");
      if (!id || !action) return;
      chats = readJSON(CHATS_KEY, []);
      var chat = chats.find(function (item) { return item.id === id; });
      if (!chat) return;
      if (action === "resolve-ticket") {
        chat.ticketStatus = "closed";
        writeJSON(CHATS_KEY, chats);
        renderChats();
        return;
      }
      if (action === "delete-chat") {
        if (!confirm("Удалить чат?")) return;
        chats = chats.filter(function (item) { return item.id !== id; });
        writeJSON(CHATS_KEY, chats);
        renderChats();
      }
    });
  }

  renderOrders();
  renderServices();
  renderChats();
  updateDashboard();
})();
