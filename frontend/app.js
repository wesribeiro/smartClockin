// app.js - Versão 3.1.1 (Fix UX & Logic Flow)

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
    currentDate: new Date(),
    config: null,
    overrides: [],
    isBatchMode: false,
    selectedDates: new Set(),
  },

  // Estado do Auditor
  auditor: {
    pendingDates: [],
    currentIndex: 0,
    isActive: false
  },

  // Controles de UI
  clockInterval: null,
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
  // Farm Bar
  farmBar: {
    totalValue: document.getElementById("farm-total-valor"),
    totalHours: document.getElementById("farm-total-horas"),
    barTotal: document.getElementById("bar-farm-total"),
    barJornada: document.getElementById("bar-farm-jornada"),
    barHe: document.getElementById("bar-farm-he"),
    toggle: document.getElementById("farm-bar-toggle"),
    details: document.getElementById("farm-bar-details"),
    holidayCard: document.getElementById("holiday-card"),
    // Labels
    labelTotal: document.getElementById("label-farm-total"),
    targetTotal: document.getElementById("target-farm-total"),
    labelJornada: document.getElementById("label-farm-jornada"),
    targetJornada: document.getElementById("target-farm-jornada"),
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
    // Batch Elements
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
  },
  // Feedback Input Modal
  modalFeedback: document.getElementById("modal-feedback-prediction"),
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

function timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
}

function minutesToTime(totalMinutes) {
    let h = Math.floor(totalMinutes / 60);
    let m = totalMinutes % 60;
    if (h >= 24) h = h - 24;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function getTodayString() {
  return new Date().toISOString().split("T")[0];
}

// Helper para parsear notas do planner
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
    
    const success = await initializeApp();
    if (success) showPage("dashboard");
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
  console.log("Inicializando App V3.1.1...");
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

  // 4. Executar Auditor
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
  Object.values(dom.pages).forEach(el => {
      if(el) el.classList.add("hidden");
  });

  if (pageId === "login") {
    if(dom.mainContent) dom.mainContent.classList.add("hidden");
    const nav = document.getElementById("app-nav");
    if(nav) nav.classList.add("hidden");
    if(dom.pages.login) dom.pages.login.classList.remove("hidden");
  } else {
    if(dom.mainContent) dom.mainContent.classList.remove("hidden");
    const nav = document.getElementById("app-nav");
    if(nav) nav.classList.remove("hidden");
    if(dom.pages[pageId]) dom.pages[pageId].classList.remove("hidden");
    
    const header = document.getElementById("app-header");
    if(header) header.classList.remove("hidden");
    
    if (pageId === "planner") loadPlannerData();
  }

  // Update Nav Active State
  document.querySelectorAll(".nav-link").forEach(link => {
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

// --- DASHBOARD & LOGIC ---

async function fetchTodayRecord() {
  const data = await apiCall(`/point/today`);
  if (data) {
    state.todayRecord = data;
    renderDashboard();
  }
}

function renderDashboard() {
  const events = state.todayRecord.events || [];
  
  // Seletores de Botões
  const btnEntrada = document.getElementById("btn-container-entrada");
  const btnAlmoco = document.getElementById("btn-container-almoco");
  const btnPausa = document.getElementById("btn-container-pausa");
  const btnSaida = document.getElementById("btn-container-saida");

  // Reset Visual
  document.querySelectorAll(".font-mono.font-bold").forEach(el => {
      // Não resetar se for span do modal
      if(!el.id.includes("modal")) el.innerText = "--:--"; 
  });
  document.querySelectorAll(".edit-icon").forEach(el => el.classList.add("hidden"));
  
  // Reset States
  btnEntrada.classList.remove("disabled");
  btnAlmoco.classList.add("disabled");
  btnPausa.classList.add("disabled");
  btnSaida.classList.add("disabled");

  // --- Processar Eventos ---
  
  const evEntrada = events.find(e => e.type === 'entrada');
  const evAlmocoSaida = events.find(e => e.type === 'almoco_saida');
  const evAlmocoRetorno = events.find(e => e.type === 'almoco_retorno');
  const evPausaStart = events.find(e => e.type === 'pausa_start'); // Assumindo pausa única por enquanto
  const evPausaEnd = events.find(e => e.type === 'pausa_end');
  const evSaida = events.find(e => e.type === 'saida');

  // 1. Entrada
  if (evEntrada) {
      document.querySelector("#btn-container-entrada .font-mono").innerText = evEntrada.time;
      document.getElementById("btn-edit-entrada").classList.remove("hidden");
      
      btnEntrada.classList.add("disabled");
      btnAlmoco.classList.remove("disabled");
      btnPausa.classList.remove("disabled");
      btnSaida.classList.remove("disabled");
  }

  // 2. Almoço (Inteligente)
  if (evAlmocoSaida) {
      document.getElementById("time-almoco_saida").innerText = evAlmocoSaida.time;
      document.getElementById("btn-edit-almoco_saida").classList.remove("hidden");
  }
  if (evAlmocoRetorno) {
      document.getElementById("time-almoco_retorno").innerText = evAlmocoRetorno.time;
      document.getElementById("btn-edit-almoco_retorno").classList.remove("hidden");
      btnAlmoco.classList.add("disabled"); // Já completou ciclo
  } else if (evAlmocoSaida) {
      // Saiu mas não voltou: Botão ativa "Volta"
      btnAlmoco.classList.remove("disabled");
      // O clique será definido abaixo
  }

  // 3. Pausa (Inteligente)
  if (evPausaStart) {
      document.getElementById("time-pausa_start").innerText = evPausaStart.time;
  }
  if (evPausaEnd) {
      document.getElementById("time-pausa_end").innerText = evPausaEnd.time;
      btnPausa.classList.add("disabled"); // Já completou ciclo
  } else if (evPausaStart) {
      btnPausa.classList.remove("disabled");
  }

  // 4. Saída
  if (evSaida) {
      document.querySelector("#btn-container-saida .font-mono").innerText = evSaida.time;
      document.getElementById("btn-edit-saida").classList.remove("hidden");
      
      // Bloqueia tudo
      btnEntrada.classList.add("disabled");
      btnAlmoco.classList.add("disabled");
      btnPausa.classList.add("disabled");
      btnSaida.classList.add("disabled");
  }

  // --- Lógica de Clique nos Botões ---

  // Entrada
  btnEntrada.onclick = () => {
      if(!btnEntrada.classList.contains("disabled")) openModal('entrada');
  };

  // Almoço (Toggle)
  btnAlmoco.onclick = () => {
      if(btnAlmoco.classList.contains("disabled")) return;
      if (!evAlmocoSaida) {
          openModal('almoco_saida');
      } else {
          openModal('almoco_retorno');
      }
  };

  // Pausa (Toggle)
  btnPausa.onclick = () => {
      if(btnPausa.classList.contains("disabled")) return;
      if (!evPausaStart) {
          openModal('pausa_start');
      } else {
          openModal('pausa_end');
      }
  };

  // Saída
  btnSaida.onclick = () => {
      if(!btnSaida.classList.contains("disabled")) openModal('saida');
  };

  // Preenchimento de Agregados (Sugestões)
  if (state.todayRecord.aggregates && state.todayRecord.aggregates.saida_sugerida_minutes) {
      document.getElementById("display-saida-sugerida").innerText = formatTime(state.todayRecord.aggregates.saida_sugerida_minutes);
      document.getElementById("display-faltam").innerText = "Horário Previsto";
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
  if (!state.user || !state.settings) return;

  const events = state.todayRecord.events || [];
  const settings = state.settings;
  const isGig = state.todayRecord.is_gig;
  const gigRate = state.todayRecord.gig_hourly_rate || 0;
  
  // Cálculo de Minutos Trabalhados
  let workedMinutes = 0;
  let entryMinutes = 0;
  
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  const ent = events.find(e => e.type === 'entrada');
  const sai = events.find(e => e.type === 'saida');
  
  if (ent) {
      entryMinutes = timeToMinutes(ent.time);
      let endCalc = sai ? timeToMinutes(sai.time) : currentMinutes;
      
      let discounts = 0;
      const aOut = events.find(e => e.type === 'almoco_saida');
      const aIn = events.find(e => e.type === 'almoco_retorno');
      
      let almocoReal = 0;
      if (aOut) {
          let aEnd = aIn ? timeToMinutes(aIn.time) : (sai ? timeToMinutes(sai.time) : currentMinutes);
          almocoReal = Math.max(0, aEnd - timeToMinutes(aOut.time));
      }
      
      // Se almoço não é pago, desconta o tempo real
      if (almocoReal > 0 && !settings.is_almoco_pago) discounts += almocoReal;
      
      // Pausas também podem ser descontadas se houver regra, por enquanto simplificado
      
      workedMinutes = Math.max(0, (endCalc - entryMinutes) - discounts);
  }

  let totalValue = 0;
  let statusText = "";

  if (state.todayRecord.justification) {
      // Lógica Justificativa
      dom.farmBar.holidayCard.classList.remove("hidden");
      dom.farmBar.holidayCard.querySelector("span:nth-child(2)").innerText = state.todayRecord.justification;
  } else if (isGig) {
      // Lógica Gig
      const rateMin = gigRate / 60;
      totalValue = workedMinutes * rateMin;
      statusText = "Modo Diária";
      dom.farmBar.holidayCard.classList.remove("hidden");
      dom.farmBar.holidayCard.querySelector("span:nth-child(2)").innerText = statusText;
  } else {
      // Lógica Normal (CLT)
      const salary = settings.salary_monthly || 0;
      const baseRateMin = salary / 220 / 60; 
      const jornada = settings.jornada_diaria_minutes || 440;
      
      const normalMins = Math.min(workedMinutes, jornada);
      const extraMins = Math.max(0, workedMinutes - jornada);
      
      const valNormal = normalMins * baseRateMin;
      const valExtra = extraMins * baseRateMin * (settings.multiplicador_hora_extra || 1.5);
      
      totalValue = valNormal + valExtra;
      dom.farmBar.holidayCard.classList.add("hidden");
      
      // Atualizar Labels de Progresso (Spans)
      dom.farmBar.labelJornada.innerText = formatMoney(valNormal);
      dom.farmBar.targetJornada.innerText = `Meta: ${formatMoney((jornada * baseRateMin))}`;
      
      if (extraMins > 0) {
          document.getElementById("farm-he-container").classList.remove("hidden");
          document.getElementById("label-farm-he").innerText = formatMoney(valExtra);
      }
  }

  // Atualizar Totais
  dom.farmBar.totalValue.innerText = formatMoney(totalValue);
  dom.farmBar.totalHours.innerText = formatTime(workedMinutes);
  
  // Atualizar Barras Visuais
  const jornada = settings.jornada_diaria_minutes || 440;
  const meta = isGig ? (workedMinutes + 60) : jornada; // Se Gig, meta é dinâmica só pra barra não estourar
  const pct = meta > 0 ? Math.min(100, (workedMinutes / meta) * 100) : 0;
  
  dom.farmBar.barTotal.style.width = `${pct}%`;
  
  dom.farmBar.labelTotal.innerText = formatMoney(totalValue);
  dom.farmBar.targetTotal.innerText = isGig ? "Sem teto" : `Meta Dia: ${formatMoney(((settings.salary_monthly||0)/220/60)*jornada)}`;
}

// --- PLANNER LOGIC ---

async function loadPlannerData() {
    const year = state.planner.currentDate.getFullYear();
    const month = state.planner.currentDate.getMonth();
    
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
    const startDayOfWeek = firstDay.getDay(); 
    
    const overridesMap = {};
    state.planner.overrides.forEach(o => overridesMap[o.date] = o);
    
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
        const dayOfWeek = new Date(dateStr + "T12:00:00Z").getDay();
        if (dayOfWeek === 0) type = "OFF"; 
        else if (dayOfWeek === 6 && state.settings.dias_trabalho_por_semana === 5) type = "OFF";
        
        let meta = { isHoliday: false, isGig: false };
        
        if (overridesMap[dateStr]) {
            const override = overridesMap[dateStr];
            type = override.day_type;
            meta = parsePlannerNotes(override.notes);
            if (type === 'HOLIDAY') meta.isHoliday = true;
        }
        
        if (type === "WORK") {
            cell.classList.add("status-work");
            if (!meta.isHoliday) workDays++;
        }
        else if (type === "OFF") cell.classList.add("status-off");
        else if (type === "HOLIDAY") cell.classList.add("status-holiday");
        
        if (meta.isGig) {
             cell.classList.remove("status-off");
             cell.classList.add("status-gig");
        }

        if (state.planner.isBatchMode && state.planner.selectedDates.has(dateStr)) {
            cell.classList.add("selected");
        }

        let html = `<span class="day-number">${d}</span>`;
        html += `<span class="day-label">${meta.isGig ? 'DIÁRIA' : (type === 'OFF' ? 'FOLGA' : '')}</span>`;
        
        if (meta.isHoliday) {
            html += `<span class="holiday-indicator"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg></span>`;
            cell.classList.add("is-holiday-bg");
        }

        cell.innerHTML = html;
        cell.onclick = () => handleDayClick(dateStr, type, overridesMap[dateStr]);
        grid.appendChild(cell);
    }
    
    dom.planner.workDaysCount.innerText = workDays;
    const hourly = (state.settings.salary_monthly || 0) / 220;
    dom.planner.estimatedHourly.innerText = formatMoney(hourly);
}

function handleDayClick(dateStr, currentType, overrideData) {
    if (state.planner.isBatchMode) {
        if (state.planner.selectedDates.has(dateStr)) {
            state.planner.selectedDates.delete(dateStr);
        } else {
            state.planner.selectedDates.add(dateStr);
        }
        updateBatchUI();
        const [y, m, d] = dateStr.split("-");
        renderPlanner(parseInt(y), parseInt(m)-1);
    } else {
        openDayOptions(dateStr, currentType, overrideData);
    }
}

// Batch Logic
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

dom.planner.batchButtons.forEach(btn => {
    btn.addEventListener("click", async () => {
        const type = btn.dataset.type;
        if (state.planner.selectedDates.size === 0) return;
        
        const overridesMap = {};
        state.planner.overrides.forEach(o => overridesMap[o.date] = o);
        
        const promises = Array.from(state.planner.selectedDates).map(dateStr => {
            let currentOverride = overridesMap[dateStr];
            let newType = type;
            let newNotes = currentOverride ? currentOverride.notes : "";
            let meta = parsePlannerNotes(newNotes);
            
            if (type === 'HOLIDAY') {
                newType = currentOverride ? currentOverride.day_type : 'WORK'; 
                meta.isHoliday = true; 
            } else if (type === 'GIG') {
                newType = 'OFF';
                meta.isGig = true;
                if(meta.gigRate === 0) meta.gigRate = 20.00;
            } else {
                newType = type;
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
        
        state.planner.isBatchMode = false;
        state.planner.selectedDates.clear();
        dom.planner.batchBar.classList.remove("active");
        dom.planner.btnBatchMode.classList.replace("bg-blue-600", "bg-blue-100");
        dom.planner.btnBatchMode.classList.replace("text-white", "text-blue-800");
        dom.planner.btnBatchMode.innerText = "Selecionar Vários";
        
        loadPlannerData();
    });
});

if(dom.planner.btnPrev) dom.planner.btnPrev.addEventListener("click", () => {
    state.planner.currentDate.setMonth(state.planner.currentDate.getMonth() - 1);
    loadPlannerData();
});
if(dom.planner.btnNext) dom.planner.btnNext.addEventListener("click", () => {
    state.planner.currentDate.setMonth(state.planner.currentDate.getMonth() + 1);
    loadPlannerData();
});

// --- AUDITOR LOGIC ---

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

// --- MODAL: DAY OPTIONS ---

function openDayOptions(dateStr, currentType, overrideData) {
    const modal = dom.modals.dayOptions;
    const dateObj = new Date(dateStr + "T12:00:00Z");
    document.getElementById("modal-day-title").innerText = `Opções: ${dateObj.toLocaleDateString('pt-BR')}`;
    
    modal.classList.remove("hidden");
    
    let selectedType = currentType;
    let meta = parsePlannerNotes(overrideData ? overrideData.notes : "");
    
    if (selectedType === 'HOLIDAY') {
        meta.isHoliday = true;
        selectedType = 'WORK'; 
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
        let finalType = selectedType;
        let isGig = selectedType === 'GIG';
        let gigRate = isGig ? (parseFloat(gigInput.value) || 0) : 0;
        let isHoliday = holidayToggle.checked;
        
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

// --- REGISTRO DE PONTO (MODAL) ---

let modalContext = { type: null, date: null };

function openModal(action, existingTime = null, forceDate = null) {
  modalContext.type = action;
  modalContext.date = forceDate || getTodayString();
  
  // Limpar Feedback anterior
  dom.modalFeedback.classList.add("hidden");
  dom.modalFeedback.innerText = "";

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
    if(a.includes("almoco_saida")) return "Saída p/ Almoço";
    if(a.includes("almoco_retorno")) return "Volta do Almoço";
    if(a.includes("pausa_start")) return "Início de Pausa";
    if(a.includes("pausa_end")) return "Fim de Pausa";
    if(a.includes("saida")) return "Saída";
    return "Ponto";
}

document.getElementById("modal-btn-now").onclick = () => registerPoint(modalContext.type, "NOW");
document.getElementById("modal-btn-cancel").onclick = () => dom.modals.pointRecord.classList.add("hidden");

const timeInput = document.getElementById("modal-input-time");
let keyboardBuffer = "";

// Lógica de Feedback em Tempo Real (Input Manual)
timeInput.addEventListener("input", updateReturnPrediction);

function updateReturnPrediction(e) {
    const val = e.target.value;
    if (val.length !== 5) {
        dom.modalFeedback.classList.add("hidden");
        return;
    }
    
    let duration = 0;
    let label = "";
    
    if (modalContext.type === "almoco_saida") {
        duration = 60; // Padrão
        label = "Volta do Almoço";
    } else if (modalContext.type === "pausa_start") {
        duration = 15;
        label = "Volta da Pausa";
    } else {
        dom.modalFeedback.classList.add("hidden");
        return;
    }
    
    const minutes = timeToMinutes(val);
    const returnTime = minutesToTime(minutes + duration);
    
    dom.modalFeedback.innerText = `${label}: ${returnTime}`;
    dom.modalFeedback.classList.remove("hidden");
}

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
        
        // Disparar evento para atualizar previsão
        timeInput.dispatchEvent(new Event('input'));
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
        updateFarmBar(); // Recalcular após salvar
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
    
    if(dom.farmBar.toggle) dom.farmBar.toggle.onclick = () => {
        dom.farmBar.details.classList.toggle("hidden");
        dom.farmBar.toggle.classList.toggle("expanded");
    };
});