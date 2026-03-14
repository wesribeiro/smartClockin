// app.js - Versão 3.1.0 (Planner UX & Independent Holidays)

// --- CONFIGURAÇÃO ---
const API_URL = "/api";
const TOKEN_STORAGE_KEY = "authToken";

// Estado Global
const state = {
  authToken: null,
  user: null,
  settings: {},
  
  // Estado do Dashboard (Hoje)
  todayRecord: {
    date: new Date().toISOString().split("T")[0],
    events: [],
    aggregates: {},
    is_gig: false,
    justification: null,
    is_finalized: false,
  },
  
  // Estado do Planner
  planner: {
    currentDate: new Date(), // Mês sendo visualizado
    config: null, // Configuração do Mês (MonthConfig)
    overrides: [], // Exceções (PlannerOverrides)
    // V3.1 Novos Estados
    isBatchMode: false,
    selectedDates: new Set(),
  },

  // Estado do Auditor
  auditor: {
    pendingDates: [], // Lista de dias pendentes
    currentIndex: 0,
    isActive: false
  },

  // Controles de UI
  clockInterval: null,
  listenersBound: false,
};

// --- SELETORES DO DOM ---
const dom = {
  // Global Containers
  mainContent: document.getElementById("main-content"),
  
  // Pages
  pages: {
    login: document.getElementById("page-login"),
    dashboard: document.getElementById("page-dashboard"),
    planner: document.getElementById("page-planner"),
    alarmes: document.getElementById("page-alarmes"),
    settings: document.getElementById("page-settings"),
    admin: document.getElementById("page-admin"),
  },
  // Login
  loginForm: document.getElementById("loginForm"),
  loginError: document.getElementById("loginError"),
  // Header
  headerDate: document.getElementById("header-date"),
  userGreeting: document.getElementById("user-greeting"),
  userInitial: document.getElementById("user-initial"),
  btnShare: document.getElementById("btn-share"),
  btnDarkMode: document.getElementById("btn-darkmode"),
  // Nav
  nav: document.getElementById("app-nav"),
  navLinks: document.querySelectorAll(".nav-link"),
  // Dashboard Elements
  realtimeClock: document.getElementById("realtime-clock"),
  farmBar: {
    totalValue: document.getElementById("farm-total-valor"),
    totalHours: document.getElementById("farm-total-horas"),
    barTotal: document.getElementById("bar-farm-total"),
    barJornada: document.getElementById("bar-farm-jornada"),
    barHe: document.getElementById("bar-farm-he"),
    toggle: document.getElementById("farm-bar-toggle"),
    details: document.getElementById("farm-bar-details"),
    holidayCard: document.getElementById("holiday-card"),
  },
  // Planner Elements
  planner: {
    currentMonthLabel: document.getElementById("planner-current-month"),
    btnPrev: document.getElementById("planner-prev-month"),
    btnNext: document.getElementById("planner-next-month"),
    grid: document.getElementById("planner-calendar-grid"),
    workDaysCount: document.getElementById("planner-work-days-count"),
    estimatedHourly: document.getElementById("planner-estimated-hourly"),
    btnOpenAuditor: document.getElementById("btn-open-auditor"),
    // V3.1 Batch Elements
    btnBatchMode: document.getElementById("btn-batch-mode-toggle"),
    batchBar: document.getElementById("batch-action-bar"),
    batchCountLabel: document.getElementById("batch-count-label"),
    btnBatchCancel: document.getElementById("btn-batch-cancel"),
    batchButtons: document.querySelectorAll(".btn-batch-apply"),
  },
  // Modais
  modals: {
    pointRecord: document.getElementById("modal-point-record"),
    dayOptions: document.getElementById("modal-day-options"),
    auditorResolve: document.getElementById("modal-auditor-resolve"),
    warningIgnore: document.getElementById("modal-warning-ignore"),
    justification: document.getElementById("modal-justification"),
  }
};

// --- UTILITÁRIOS ---

function formatMoney(value) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function getTodayString() {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD local (aproximado)
}

// Helper para parsear notas do planner (ex: "[HOLIDAY] [GIG:20]")
function parsePlannerNotes(notes) {
    const isHoliday = notes && notes.includes("[HOLIDAY]");
    const gigMatch = notes ? notes.match(/\[GIG:([\d.]+)\]/) : null;
    const isGig = notes && (notes.includes("[GIG]") || !!gigMatch);
    const gigRate = gigMatch ? parseFloat(gigMatch[1]) : 0;
    return { isHoliday, isGig, gigRate };
}

function buildPlannerNotes(isHoliday, isGig, gigRate) {
    let tags = [];
    if (isHoliday) tags.push("[HOLIDAY]");
    if (isGig) tags.push(`[GIG:${gigRate || 0}]`);
    return tags.join(" ");
}

// --- API CLIENT ---

async function apiCall(endpoint, method = "GET", body = null) {
  const headers = { "Content-Type": "application/json" };
  if (state.authToken) headers["Authorization"] = `Bearer ${state.authToken}`;

  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
    });

    if (res.status === 401 || res.status === 403) {
      logout();
      return null;
    }
    
    return await res.json();
  } catch (err) {
    console.error("API Error:", err);
    return null;
  }
}

// --- AUTH ---

async function handleLogin(e) {
  e.preventDefault();
  const login = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  const data = await apiCall("/auth/login", "POST", { login, password });
  
  if (data && data.token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
    state.authToken = data.token;
    state.user = data.user;
    dom.loginError.innerText = "";
    
    // Setup inicial
    const success = await initializeApp();
    if (success) {
      showPage("dashboard");
    }
  } else {
    dom.loginError.innerText = data?.error || "Erro ao conectar.";
  }
}

function logout() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  state.authToken = null;
  location.reload();
}

// --- APP FLOW ---

async function initializeApp() {
  console.log("Inicializando App V3.1...");
  // 1. Carregar Perfil e Settings
  const data = await apiCall("/me");
  if (!data) return false;
  
  state.user = data.user;
  state.settings = data.settings;
  
  updateHeader();
  applySettingsToUI();
  
  // 2. Carregar Ponto de Hoje
  await fetchTodayRecord();
  
  // 3. Iniciar Relógio
  startClock();

  // 4. Executar Auditor (V3.0)
  setTimeout(runAuditor, 1000);

  return true;
}

function updateHeader() {
  if(dom.userGreeting) dom.userGreeting.innerText = `Olá, ${state.user.name.split(" ")[0]}`;
  if(dom.userInitial) dom.userInitial.innerText = state.user.name.charAt(0).toUpperCase();
  const now = new Date();
  const options = { weekday: 'long', day: 'numeric', month: 'long' };
  if(dom.headerDate) dom.headerDate.innerText = now.toLocaleDateString('pt-BR', options);
}

// --- NAVEGAÇÃO SPA ---

function showPage(pageId) {
  // 1. Oculta todas as páginas
  Object.values(dom.pages).forEach(el => {
      if(el) el.classList.add("hidden");
  });

  if (pageId === "login") {
    if(dom.mainContent) dom.mainContent.classList.add("hidden");
    if(dom.nav) dom.nav.classList.add("hidden");
    if(dom.pages.login) dom.pages.login.classList.remove("hidden");
  } else {
    if(dom.mainContent) dom.mainContent.classList.remove("hidden");
    if(dom.nav) dom.nav.classList.remove("hidden");
    if(dom.pages[pageId]) dom.pages[pageId].classList.remove("hidden");
    
    const header = document.getElementById("app-header");
    if(header) header.classList.remove("hidden");
    
    if (pageId === "planner") loadPlannerData();
  }

  // Update Nav Active State
  dom.navLinks.forEach(link => {
    link.classList.remove("active", "text-blue-600");
    link.classList.add("text-muted");
    if (link.getAttribute("href") === `#/${pageId === 'dashboard' ? '' : pageId}`) {
      link.classList.add("active", "text-blue-600");
      link.classList.remove("text-muted");
    }
  });
}

window.addEventListener("hashchange", () => {
  const hash = location.hash.replace("#/", "") || "dashboard";
  if (!state.authToken && hash !== "login") {
    showPage("login");
  } else {
    const map = {
        "": "dashboard",
        "dashboard": "dashboard",
        "planner": "planner",
        "alarmes": "alarmes",
        "settings": "settings"
    };
    if (map[hash]) showPage(map[hash]);
  }
});

// --- DASHBOARD & LOGIC (V3.0) ---

async function fetchTodayRecord() {
  const data = await apiCall(`/point/today`);
  if (data) {
    state.todayRecord = data;
    renderDashboard();
  }
}

function renderDashboard() {
  const events = state.todayRecord.events || [];
  
  if(document.getElementById("btn-container-entrada")) document.getElementById("btn-container-entrada").classList.remove("disabled");
  if(document.getElementById("btn-container-almoco")) document.getElementById("btn-container-almoco").classList.add("disabled");
  if(document.getElementById("btn-container-saida")) document.getElementById("btn-container-saida").classList.add("disabled");
  
  document.querySelectorAll(".font-mono.font-bold.text-lg").forEach(el => el.innerText = "--:--");
  document.querySelectorAll(".edit-icon").forEach(el => el.classList.add("hidden"));

  events.forEach(ev => {
     if (ev.type === 'entrada') {
         const el = document.querySelector("#btn-container-entrada .font-mono");
         if(el) el.innerText = ev.time;
         const editBtn = document.getElementById("btn-edit-entrada");
         if(editBtn) editBtn.classList.remove("hidden");
         
         document.getElementById("btn-container-entrada").classList.add("disabled");
         document.getElementById("btn-container-almoco").classList.remove("disabled");
         document.getElementById("btn-container-saida").classList.remove("disabled");
         document.getElementById("btn-container-pausa").classList.remove("disabled");
     }
     if (ev.type === 'almoco_saida') {
         const el = document.getElementById("time-almoco_saida");
         if(el) el.innerText = ev.time;
         if(document.getElementById("btn-edit-almoco_saida")) document.getElementById("btn-edit-almoco_saida").classList.remove("hidden");
         if(document.getElementById("almoco-retorno-labels")) document.getElementById("almoco-retorno-labels").classList.remove("hidden");
     }
     if (ev.type === 'almoco_retorno') {
         const el = document.getElementById("time-almoco_retorno");
         if(el) {
             el.innerText = ev.time;
             el.classList.remove("hidden");
         }
         if(document.getElementById("btn-edit-almoco_retorno")) document.getElementById("btn-edit-almoco_retorno").classList.remove("hidden");
         document.getElementById("btn-container-almoco").classList.add("disabled");
     }
     if (ev.type === 'saida') {
         const el = document.querySelector("#btn-container-saida .font-mono");
         if(el) el.innerText = ev.time;
         if(document.getElementById("btn-edit-saida")) document.getElementById("btn-edit-saida").classList.remove("hidden");
         document.getElementById("btn-container-saida").classList.add("disabled");
         document.getElementById("btn-container-entrada").classList.add("disabled");
         document.getElementById("btn-container-almoco").classList.add("disabled");
         document.getElementById("btn-container-pausa").classList.add("disabled");
     }
  });
  
  if (state.todayRecord.aggregates && state.todayRecord.aggregates.saida_sugerida_minutes) {
      document.getElementById("display-saida-sugerida").innerText = formatTime(state.todayRecord.aggregates.saida_sugerida_minutes);
      document.getElementById("display-faltam").innerText = "Previsto";
  }

  updateFarmBar();
}

function startClock() {
  if (state.clockInterval) clearInterval(state.clockInterval);
  state.clockInterval = setInterval(() => {
    const now = new Date();
    if(dom.realtimeClock) dom.realtimeClock.innerText = now.toLocaleTimeString("pt-BR");
    if (now.getSeconds() === 0) updateFarmBar();
  }, 1000);
  updateFarmBar(); 
}

function updateFarmBar() {
  if (!state.user || !state.settings || !dom.farmBar.totalValue) return;

  const events = state.todayRecord.events || [];
  const settings = state.settings;
  const isGig = state.todayRecord.is_gig;
  const gigRate = state.todayRecord.gig_hourly_rate || 0;
  
  let workedMinutes = 0;
  let entryMinutes = null;
  
  const timeToMin = (t) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  const ent = events.find(e => e.type === 'entrada');
  const sai = events.find(e => e.type === 'saida');
  
  if (ent) {
      entryMinutes = timeToMin(ent.time);
      let endCalc = sai ? timeToMin(sai.time) : currentMinutes;
      
      let discounts = 0;
      const aOut = events.find(e => e.type === 'almoco_saida');
      const aIn = events.find(e => e.type === 'almoco_retorno');
      
      let almocoReal = 0;
      if (aOut) {
          let aEnd = aIn ? timeToMin(aIn.time) : (sai ? timeToMin(sai.time) : currentMinutes);
          almocoReal = Math.max(0, aEnd - timeToMin(aOut.time));
      }
      
      if (almocoReal > 0 && !settings.is_almoco_pago) discounts += almocoReal;
      workedMinutes = Math.max(0, (endCalc - entryMinutes) - discounts);
  }

  let totalValue = 0;
  let statusText = "";

  if (state.todayRecord.justification) {
      totalValue = (state.todayRecord.aggregates?.deduction_value || 0) * -1;
      statusText = state.todayRecord.justification;
      dom.farmBar.holidayCard.classList.remove("hidden");
      dom.farmBar.holidayCard.querySelector("span:nth-child(2)").innerText = statusText;
  } else if (isGig) {
      const rateMin = gigRate / 60;
      totalValue = workedMinutes * rateMin;
      statusText = "Modo Diária";
      dom.farmBar.holidayCard.classList.remove("hidden");
      dom.farmBar.holidayCard.querySelector("span:nth-child(2)").innerText = statusText;
  } else {
      const baseRateMin = (settings.salary_monthly || 0) / 220 / 60; 
      const jornada = settings.jornada_diaria_minutes || 440;
      const normalMins = Math.min(workedMinutes, jornada);
      const extraMins = Math.max(0, workedMinutes - jornada);
      
      totalValue = (normalMins * baseRateMin) + (extraMins * baseRateMin * settings.multiplicador_hora_extra);
      dom.farmBar.holidayCard.classList.add("hidden");
  }

  dom.farmBar.totalValue.innerText = formatMoney(totalValue);
  if (totalValue < 0) dom.farmBar.totalValue.classList.replace("text-green-500", "text-red-500");
  else dom.farmBar.totalValue.classList.replace("text-red-500", "text-green-500");

  dom.farmBar.totalHours.innerText = formatTime(workedMinutes);
  
  const meta = isGig ? (workedMinutes + 60) : (settings.jornada_diaria_minutes || 440);
  const pct = Math.min(100, (workedMinutes / meta) * 100);
  dom.farmBar.barTotal.style.width = `${pct}%`;
}

// --- PLANNER LOGIC (V3.1 - Batch & Independent Holiday) ---

async function loadPlannerData() {
    const year = state.planner.currentDate.getFullYear();
    const month = state.planner.currentDate.getMonth();
    
    // API
    const data = await apiCall(`/planner/${year}/${month}`);
    if (data) {
        state.planner.config = data.config;
        state.planner.overrides = data.overrides;
        renderPlanner(year, month);
    }
}

function renderPlanner(year, month) {
    if(!dom.planner.grid) return;
    const grid = dom.planner.grid;
    grid.innerHTML = "";
    
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    dom.planner.currentMonthLabel.innerText = `${monthNames[month]} ${year}`;
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0=Dom
    
    const overridesMap = {};
    state.planner.overrides.forEach(o => overridesMap[o.date] = o);
    
    // Empty cells
    for (let i = 0; i < startDayOfWeek; i++) {
        const cell = document.createElement("div");
        cell.className = "planner-day-cell bg-transparent pointer-events-none";
        grid.appendChild(cell);
    }
    
    let workDays = 0;
    
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const cell = document.createElement("div");
        cell.className = "planner-day-cell bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm";
        
        let type = "WORK";
        // Default logic
        const dayOfWeek = new Date(dateStr + "T12:00:00Z").getDay();
        if (dayOfWeek === 0) type = "OFF"; 
        else if (dayOfWeek === 6 && state.settings.dias_trabalho_por_semana === 5) type = "OFF";
        
        let meta = { isHoliday: false, isGig: false };
        
        if (overridesMap[dateStr]) {
            const override = overridesMap[dateStr];
            type = override.day_type;
            meta = parsePlannerNotes(override.notes);
            
            // Retrocompatibilidade V3.0
            if (type === 'HOLIDAY') meta.isHoliday = true;
        }
        
        // V3.1 Logic: Render based on Type AND Holiday Flag
        if (type === "WORK") {
            cell.classList.add("status-work");
            if (!meta.isHoliday) workDays++;
        }
        else if (type === "OFF") cell.classList.add("status-off");
        else if (type === "HOLIDAY") cell.classList.add("status-holiday"); // Legacy visual
        
        // Check "GIG" via notes or type (schema constraint workaround)
        if (meta.isGig) {
             cell.classList.remove("status-off");
             cell.classList.add("status-gig");
        }

        // Selection Highlight
        if (state.planner.isBatchMode && state.planner.selectedDates.has(dateStr)) {
            cell.classList.add("selected");
        }

        // Content
        let html = `<span class="day-number">${d}</span>`;
        html += `<span class="day-label">${meta.isGig ? 'DIÁRIA' : (type === 'OFF' ? 'FOLGA' : '')}</span>`;
        
        // Independent Holiday Indicator
        if (meta.isHoliday) {
            html += `<span class="holiday-indicator"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg></span>`;
            cell.classList.add("is-holiday-bg"); // Optional sub-style
        }

        cell.innerHTML = html;
        
        cell.onclick = () => handleDayClick(dateStr, type, overridesMap[dateStr]);
        grid.appendChild(cell);
    }
    
    dom.planner.workDaysCount.innerText = workDays;
    const hourly = (state.settings.salary_monthly || 0) / 220;
    dom.planner.estimatedHourly.innerText = formatMoney(hourly);
}

// --- PLANNER INTERACTION (V3.1) ---

// 1. Click Handler (Router)
function handleDayClick(dateStr, currentType, overrideData) {
    if (state.planner.isBatchMode) {
        // Toggle Selection
        if (state.planner.selectedDates.has(dateStr)) {
            state.planner.selectedDates.delete(dateStr);
        } else {
            state.planner.selectedDates.add(dateStr);
        }
        updateBatchUI();
        // Re-render visual only (efficient) -> calling full render for safety now
        const [y, m, d] = dateStr.split("-");
        renderPlanner(parseInt(y), parseInt(m)-1);
    } else {
        // Open Modal
        openDayOptions(dateStr, currentType, overrideData);
    }
}

// 2. Batch Mode Logic
if(dom.planner.btnBatchMode) {
    dom.planner.btnBatchMode.addEventListener("click", () => {
        state.planner.isBatchMode = !state.planner.isBatchMode;
        state.planner.selectedDates.clear();
        
        if (state.planner.isBatchMode) {
            dom.planner.btnBatchMode.classList.replace("bg-blue-100", "bg-blue-600");
            dom.planner.btnBatchMode.classList.replace("text-blue-800", "text-white");
            dom.planner.btnBatchMode.innerText = "Concluir Seleção";
            dom.planner.batchBar.classList.add("active");
        } else {
            dom.planner.btnBatchMode.classList.replace("bg-blue-600", "bg-blue-100");
            dom.planner.btnBatchMode.classList.replace("text-white", "text-blue-800");
            dom.planner.btnBatchMode.innerText = "Selecionar Vários";
            dom.planner.batchBar.classList.remove("active");
        }
        updateBatchUI();
        const d = state.planner.currentDate;
        renderPlanner(d.getFullYear(), d.getMonth());
    });
}

if(dom.planner.btnBatchCancel) {
    dom.planner.btnBatchCancel.onclick = () => {
        state.planner.isBatchMode = false;
        state.planner.selectedDates.clear();
        dom.planner.batchBar.classList.remove("active");
        dom.planner.btnBatchMode.classList.replace("bg-blue-600", "bg-blue-100");
        dom.planner.btnBatchMode.classList.replace("text-white", "text-blue-800");
        dom.planner.btnBatchMode.innerText = "Selecionar Vários";
        const d = state.planner.currentDate;
        renderPlanner(d.getFullYear(), d.getMonth());
    };
}

function updateBatchUI() {
    dom.planner.batchCountLabel.innerText = `${state.planner.selectedDates.size} dias selecionados`;
}

// 3. Batch Apply Actions
dom.planner.batchButtons.forEach(btn => {
    btn.addEventListener("click", async () => {
        const type = btn.dataset.type;
        if (state.planner.selectedDates.size === 0) return;
        
        // Loop and apply
        // Note: For 'HOLIDAY', we want to keep the underlying day type if possible, 
        // but since we don't have all data loaded perfectly in a map for batch, 
        // we might enforce a rule.
        // User Rule: "Apenas adicione o status de feriado"
        
        const overridesMap = {};
        state.planner.overrides.forEach(o => overridesMap[o.date] = o);
        
        const promises = Array.from(state.planner.selectedDates).map(dateStr => {
            let currentOverride = overridesMap[dateStr];
            let newType = type;
            let newNotes = currentOverride ? currentOverride.notes : "";
            let meta = parsePlannerNotes(newNotes);
            
            // Logic Matrix
            if (type === 'HOLIDAY') {
                // Keep existing type, just add tag
                newType = currentOverride ? currentOverride.day_type : 'WORK'; // Default to work if unknown? Or Off?
                // Logic Fix: If no override exists, we need to know the default calendar type (Work or Off).
                // Simplification: Set flag [HOLIDAY]. Preserve type if override exists, else assume WORK.
                meta.isHoliday = true; 
            } else if (type === 'GIG') {
                // GIG is essentially OFF + GIG Tag
                newType = 'OFF';
                meta.isGig = true;
                if(meta.gigRate === 0) meta.gigRate = 20.00; // Default batch rate
            } else {
                // WORK or OFF
                newType = type;
                // If setting to WORK/OFF explicitly, should we clear Holiday/Gig flags? 
                // Usually yes, batch set means "Make it this".
                // Unless it's HOLIDAY button.
                meta.isHoliday = false;
                meta.isGig = false;
            }
            
            newNotes = buildPlannerNotes(meta.isHoliday, meta.isGig, meta.gigRate);
            
            return apiCall("/planner/override", "POST", {
                date: dateStr,
                day_type: newType,
                notes: newNotes
            });
        });
        
        await Promise.all(promises);
        
        // Reset Batch Mode
        state.planner.isBatchMode = false;
        state.planner.selectedDates.clear();
        dom.planner.batchBar.classList.remove("active");
        dom.planner.btnBatchMode.classList.replace("bg-blue-600", "bg-blue-100");
        dom.planner.btnBatchMode.classList.replace("text-white", "text-blue-800");
        dom.planner.btnBatchMode.innerText = "Selecionar Vários";
        
        loadPlannerData();
    });
});

// Controls Planner Nav
if(dom.planner.btnPrev) dom.planner.btnPrev.addEventListener("click", () => {
    state.planner.currentDate.setMonth(state.planner.currentDate.getMonth() - 1);
    loadPlannerData();
});
if(dom.planner.btnNext) dom.planner.btnNext.addEventListener("click", () => {
    state.planner.currentDate.setMonth(state.planner.currentDate.getMonth() + 1);
    loadPlannerData();
});

// --- AUDITOR LOGIC (V3.0) ---

async function runAuditor() {
    const data = await apiCall("/auditor/pending");
    if (data && data.pending && data.pending.length > 0) {
        state.auditor.pendingDates = data.pending;
        state.auditor.currentIndex = 0;
        state.auditor.isActive = true;
        
        dom.planner.btnOpenAuditor.classList.remove("hidden");
        dom.planner.btnOpenAuditor.onclick = showNextPendency;
        dom.planner.btnOpenAuditor.innerText = `Resolver ${data.pending.length} Pendências`;
        
        showNextPendency();
    } else {
        dom.planner.btnOpenAuditor.classList.add("hidden");
    }
}

function showNextPendency() {
    if (state.auditor.currentIndex >= state.auditor.pendingDates.length) {
        alert("Todas as pendências resolvidas!");
        state.auditor.isActive = false;
        dom.planner.btnOpenAuditor.classList.add("hidden");
        return;
    }
    
    const dateStr = state.auditor.pendingDates[state.auditor.currentIndex];
    const dateObj = new Date(dateStr + "T12:00:00Z");
    document.getElementById("auditor-date-label").innerText = dateObj.toLocaleDateString('pt-BR');
    
    dom.modals.auditorResolve.classList.remove("hidden");
    
    document.getElementById("btn-auditor-worked").onclick = () => {
        dom.modals.auditorResolve.classList.add("hidden");
        openModal("manual_audit", null, dateStr);
    };
    
    document.getElementById("btn-auditor-absent").onclick = () => {
        dom.modals.auditorResolve.classList.add("hidden");
        openModal("justification", null, dateStr);
    };
    
    document.getElementById("btn-auditor-ignore").onclick = () => {
         dom.modals.auditorResolve.classList.add("hidden");
         dom.modals.warningIgnore.classList.remove("hidden");
    };
}

document.getElementById("btn-confirm-ignore").onclick = () => {
    dom.modals.warningIgnore.classList.add("hidden");
    state.auditor.currentIndex++;
    state.auditor.isActive = false; 
};
document.getElementById("btn-cancel-ignore").onclick = () => {
    dom.modals.warningIgnore.classList.add("hidden");
    dom.modals.auditorResolve.classList.remove("hidden");
};

// --- MODAL: DAY OPTIONS (V3.1) ---

function openDayOptions(dateStr, currentType, overrideData) {
    const modal = dom.modals.dayOptions;
    const dateObj = new Date(dateStr + "T12:00:00Z");
    document.getElementById("modal-day-title").innerText = `Opções: ${dateObj.toLocaleDateString('pt-BR')}`;
    
    modal.classList.remove("hidden");
    
    let selectedType = currentType;
    let meta = parsePlannerNotes(overrideData ? overrideData.notes : "");
    
    // Fallback V3.0 types
    if (selectedType === 'HOLIDAY') {
        meta.isHoliday = true;
        selectedType = 'WORK'; // Reset base type
    }
    
    const btns = modal.querySelectorAll(".btn-day-type");
    const gigContainer = document.getElementById("gig-config-container");
    const gigInput = document.getElementById("input-gig-rate");
    const holidayToggle = document.getElementById("toggle-holiday-planner");
    
    holidayToggle.checked = meta.isHoliday;
    if (meta.isGig) {
        selectedType = 'GIG';
        if (meta.gigRate) gigInput.value = meta.gigRate;
    }

    const updateVisuals = () => {
        btns.forEach(b => {
            if (b.dataset.type === selectedType) b.classList.add("border-blue-500", "bg-blue-50", "dark:bg-blue-900");
            else b.classList.remove("border-blue-500", "bg-blue-50", "dark:bg-blue-900");
        });
        if (selectedType === 'GIG') gigContainer.classList.remove("hidden");
        else gigContainer.classList.add("hidden");
    };
    updateVisuals();
    
    btns.forEach(b => b.onclick = () => { selectedType = b.dataset.type; updateVisuals(); });
    
    document.getElementById("btn-save-day-options").onclick = async () => {
        // Logic Transformation for V3.1
        let finalType = selectedType;
        let isGig = selectedType === 'GIG';
        let gigRate = isGig ? (parseFloat(gigInput.value) || 0) : 0;
        let isHoliday = holidayToggle.checked;
        
        // Map GIG back to OFF + Note for DB constraint
        if (finalType === 'GIG') finalType = 'OFF';
        
        const noteStr = buildPlannerNotes(isHoliday, isGig, gigRate);
        
        await apiCall("/planner/override", "POST", {
            date: dateStr,
            day_type: finalType,
            notes: noteStr
        });
        
        modal.classList.add("hidden");
        loadPlannerData(); 
    };
    
    document.getElementById("btn-edit-past-point").onclick = () => {
        modal.classList.add("hidden");
        openModal("manual_audit", null, dateStr); 
    };
    
    document.getElementById("btn-close-day-options").onclick = () => modal.classList.add("hidden");
}

// --- MODAL: JUSTIFICATION ---
function handleJustification(dateStr, justification) {
    apiCall("/auditor/resolve", "POST", { date: dateStr, justification }).then(() => {
        dom.modals.justification.classList.add("hidden");
        state.auditor.currentIndex++;
        showNextPendency();
    });
}
document.getElementById("btn-confirm-justification").onclick = () => {
    const dateStr = state.auditor.pendingDates[state.auditor.currentIndex];
    const val = document.getElementById("input-justification").value;
    handleJustification(dateStr, val);
};
document.getElementById("btn-cancel-justification").onclick = () => dom.modals.justification.classList.add("hidden");


// --- REGISTRO DE PONTO ---

let modalContext = { type: null, date: null };

function openModal(action, existingTime = null, forceDate = null) {
  modalContext.type = action;
  modalContext.date = forceDate || getTodayString();
  
  if (action === "manual_audit") {
      document.getElementById("modal-title").innerText = `Lançar: ${forceDate}`;
      document.getElementById("modal-btn-now").classList.add("hidden"); 
      document.getElementById("modal-or-divider").classList.add("hidden");
  } else if (action === "justification") {
      dom.modals.justification.classList.remove("hidden");
      return;
  } else {
      document.getElementById("modal-title").innerText = `Registrar ${formatActionName(action)}`;
      document.getElementById("modal-btn-now").classList.remove("hidden");
      document.getElementById("modal-or-divider").classList.remove("hidden");
  }

  dom.modals.pointRecord.classList.remove("hidden");
  document.getElementById("modal-input-time").value = existingTime || "";
}

function formatActionName(a) {
    if(a.includes("entrada")) return "Entrada";
    if(a.includes("almoco")) return "Almoço";
    if(a.includes("saida")) return "Saída";
    return "Ponto";
}

document.getElementById("modal-btn-now").onclick = () => registerPoint(modalContext.type, "NOW");
document.getElementById("modal-btn-cancel").onclick = () => dom.modals.pointRecord.classList.add("hidden");

const timeInput = document.getElementById("modal-input-time");
let keyboardBuffer = "";

document.querySelectorAll(".virtual-keyboard-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
        const key = btn.dataset.key;
        if (key === "enter") {
             if(keyboardBuffer.length === 4) {
                 const t = `${keyboardBuffer.substring(0,2)}:${keyboardBuffer.substring(2,4)}`;
                 registerPoint(modalContext.type, t);
             }
        } else if (key === "backspace") {
            keyboardBuffer = keyboardBuffer.slice(0, -1);
        } else {
            if(keyboardBuffer.length < 4) keyboardBuffer += key;
        }
        
        let display = keyboardBuffer;
        if (display.length > 2) display = display.substring(0,2) + ":" + display.substring(2);
        timeInput.value = display;
    });
});

async function registerPoint(type, timeMode) {
    let time = timeMode;
    if (timeMode === "NOW") {
        const now = new Date();
        time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    }

    const payload = {
        type: type === "manual_audit" ? "entrada" : type, 
        time: time,
        date: modalContext.date,
        is_manual: timeMode !== "NOW"
    };
    
    if (modalContext.type === "manual_audit") {
        await apiCall("/point", "POST", payload);
        dom.modals.pointRecord.classList.add("hidden");
        state.auditor.currentIndex++;
        showNextPendency();
    } else {
        await apiCall("/point", "POST", payload);
        dom.modals.pointRecord.classList.add("hidden");
        fetchTodayRecord();
    }
}

// --- SETTINGS LOGIC ---
document.getElementById("settingsForm").onsubmit = async (e) => {
    e.preventDefault();
    const s = {};
    const ids = ["salary_monthly", "multiplicador_hora_extra", "holiday_multiplier", "sunday_rule", "sunday_multiplier", "scale_type", "scale_12x36_anchor_date"];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if(el) s[id] = el.type === "number" ? parseFloat(el.value) : el.value;
    });
    
    const weekMap = [0,0,0,0,0,0,0];
    document.querySelectorAll(".scale-day-cb").forEach(cb => {
        if(cb.checked) weekMap[parseInt(cb.dataset.day)] = 1;
    });
    s.scale_work_days = JSON.stringify(weekMap);

    const res = await apiCall("/me/settings", "PUT", s);
    if(res && res.success) {
        document.getElementById("saveStatus").innerText = "Salvo com sucesso!";
        setTimeout(()=>document.getElementById("saveStatus").innerText="", 2000);
        state.settings = res.settings;
    }
};

function applySettingsToUI() {
    const s = state.settings;
    if(!s) return;
    
    const setVal = (id, v) => { if(document.getElementById(id)) document.getElementById(id).value = v; };
    
    setVal("salary_monthly", s.salary_monthly);
    setVal("multiplicador_hora_extra", s.multiplicador_hora_extra);
    setVal("scale_type", s.scale_type || "WEEKLY");
    
    const scaleType = document.getElementById("scale_type");
    const weeklyDiv = document.getElementById("scale-weekly-options");
    const shiftDiv = document.getElementById("scale-12x36-options");
    
    const updateScaleUI = () => {
        if(scaleType.value === "WEEKLY") {
            weeklyDiv.classList.remove("hidden");
            shiftDiv.classList.add("hidden");
        } else {
            weeklyDiv.classList.add("hidden");
            shiftDiv.classList.remove("hidden");
        }
    };
    scaleType.onchange = updateScaleUI;
    updateScaleUI();
}

// --- BOOT ---
window.addEventListener("load", () => {
    const hash = location.hash.replace("#/", "") || "dashboard";
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    
    if(token) {
        state.authToken = token;
        showPage(hash === "login" ? "dashboard" : hash); 
        initializeApp();
    } else {
        showPage("login");
    }
    
    document.getElementById("btn-logout").onclick = logout;
    dom.loginForm.onsubmit = handleLogin;
    
    if(document.getElementById("btn-container-entrada")) document.getElementById("btn-container-entrada").onclick = () => { if(!document.getElementById("btn-container-entrada").classList.contains("disabled")) openModal("entrada"); };
    if(document.getElementById("btn-container-saida")) document.getElementById("btn-container-saida").onclick = () => { if(!document.getElementById("btn-container-saida").classList.contains("disabled")) openModal("saida"); };
    if(document.getElementById("btn-container-almoco")) document.getElementById("btn-container-almoco").onclick = () => { if(!document.getElementById("btn-container-almoco").classList.contains("disabled")) openModal("almoco_saida"); };
    
    if(dom.farmBar.toggle) dom.farmBar.toggle.onclick = () => {
        dom.farmBar.details.classList.toggle("hidden");
        dom.farmBar.toggle.classList.toggle("expanded");
    };
});