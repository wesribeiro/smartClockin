// --- URL da API ---
const API_URL = ""; // Caminho relativo

// --- Constantes ---
const PAUSA_MINUTES = 15; // Duração da pausa
const TOKEN_STORAGE_KEY = "authToken"; // Chave para localStorage
// (NOVO V30) Valores Padrão CLT (Salário Mínimo 2025)
const CLT_DEFAULTS = {
  salary_monthly: 1518.0,
  dias_trabalho_por_semana: 6,
  multiplicador_hora_extra: 1.5,
  multiplicador_feriado_domingo: 2.0,
  adicional_noturno_percent: 20.0,
  fgts_percent: 8.0,
};

// --- Estado Global ---
const state = {
  settings: {},
  todayRecord: {
    date: new Date().toISOString().split("T")[0],
    events: [], // Ex: { type: 'entrada', time: '07:00' }
    aggregates: {},
    is_holiday: false,
    is_finalized: false,
  },
  // (ATUALIZADO V38) Agora armazena o total de minutos e o farm de HE
  monthlySummary: { total_farm_extra: 0, total_extra_minutes: 0 },
  currentModalData: null, // { type, isEdit, isNow, originalTime }
  user: null, // Guarda dados do usuário logado { userId, name, login, email, role, firstLogin }
  authToken: null, // Guarda o JWT
  adminUserList: [],
  listenersBound: false, // Flag para garantir que os listeners sejam ligados apenas uma vez
  isMobile: window.matchMedia("(max-width: 768px)").matches, // (NOVO) Detecta se é mobile
  virtualInputValue: "", // (NOVO V30) Armazena o valor do teclado virtual
};

// (NOVO V28) Objeto para armazenar seletores do DOM PÓS-LOGIN
const dom = {};

// --- Seletores do DOM (Globais) ---
// Estes existem antes do login
const htmlElement = document.documentElement;
const mainContentContainer = document.getElementById("main-content");
const loginPage = document.getElementById("page-login");
const loginForm = document.getElementById("loginForm");
// (ATUALIZADO V29) Agora é 'login-input' mas o ID do HTML continua 'login-email'
const loginInput = document.getElementById("login-email");
const loginPasswordInput = document.getElementById("login-password");
const loginError = document.getElementById("loginError");
const btnDarkMode = document.getElementById("btn-darkmode");
const iconMoon = document.getElementById("icon-moon");
const iconSun = document.getElementById("icon-sun");
const appNav = document.getElementById("app-nav");

// --- (ATUALIZADO V42) Função para carregar seletores PÓS-LOGIN ---
function cacheSelectors() {
  // Páginas Principais
  dom.pageDashboard = document.getElementById("page-dashboard");
  dom.pageMes = document.getElementById("page-mes");
  dom.pageAlarmes = document.getElementById("page-alarmes");
  dom.pageSettings = document.getElementById("page-settings");
  dom.pageAdmin = document.getElementById("page-admin");
  dom.allMainPages = [
    dom.pageDashboard,
    dom.pageMes,
    dom.pageAlarmes,
    dom.pageSettings,
    dom.pageAdmin,
  ];

  // Header
  dom.headerDate = document.getElementById("header-date");
  dom.userInitial = document.getElementById("user-initial");
  dom.userGreeting = document.getElementById("user-greeting");

  // Navegação
  dom.navLinks = document.querySelectorAll(".nav-link");

  // Botões Settings/Admin/Logout
  dom.btnAdminPanel = document.getElementById("btn-admin-panel");
  dom.btnChangePassword = document.getElementById("btn-change-password");
  dom.btnLogout = document.getElementById("btn-logout");
  dom.btnBackToSettings = document.getElementById("btn-back-to-settings");

  // Admin Panel
  dom.createUserForm = document.getElementById("createUserForm");
  dom.createUserNameInput = document.getElementById("create-user-name");
  // (NOVOS) Campos do formulário Admin
  dom.createUserLoginInput = document.getElementById("create-user-login");
  dom.createUserEmailInput = document.getElementById("create-user-email");
  dom.createUserRoleInput = document.getElementById("create-user-role");
  dom.createUserStatus = document.getElementById("createUserStatus");
  dom.userListContainer = document.getElementById("userListContainer");

  // Seletores do Dashboard
  dom.saveStatusEl = document.getElementById("saveStatus");
  dom.btnShare = document.getElementById("btn-share");
  dom.realtimeClock = document.getElementById("realtime-clock");
  dom.toggleHoliday = document.getElementById("toggle-holiday");
  dom.holidayCard = document.getElementById("holiday-card");
  dom.holidayLabel = document.getElementById("holiday-label");

  // (ATUALIZADO V30) Novos seletores de card e botões
  dom.saidaSugeridaCard = document.getElementById("saida-sugerida-card");
  dom.pointButtonsWrapper = document.getElementById("point-buttons-wrapper");
  dom.btnAlterarHorarios = document.getElementById("btn-alterar-horarios");
  dom.btnLimparTudo = document.getElementById("btn-limpar-tudo");

  dom.displaySaidaSugerida = document.getElementById("display-saida-sugerida");
  dom.displayFaltam = document.getElementById("display-faltam");
  dom.displaySaidaSugeridaHE = document.getElementById(
    "display-saida-sugerida-he"
  );
  dom.displaySaidaSugeridaHETime = document.getElementById(
    "display-saida-sugerida-he-time"
  );
  dom.btnViewReport = document.getElementById("btn-view-report");

  // Farm Bar Expansível
  dom.farmBar = document.getElementById("farm-bar");
  dom.farmBarToggle = document.getElementById("farm-bar-toggle");
  dom.farmBarDetails = document.getElementById("farm-bar-details");
  dom.farmTotalHoras = document.getElementById("farm-total-horas");
  dom.farmTotalValor = document.getElementById("farm-total-valor");
  dom.atrasoInfo = document.getElementById("atraso-info");
  dom.btnInfoCalculo = document.getElementById("btn-info-calculo");

  // (ATUALIZADO V42) Novas Barras de Progresso
  dom.barFarmTotal = document.getElementById("bar-farm-total");
  dom.labelFarmTotal = document.getElementById("label-farm-total");
  dom.targetFarmTotal = document.getElementById("target-farm-total");

  dom.barFarmJornada = document.getElementById("bar-farm-jornada");
  dom.labelFarmJornada = document.getElementById("label-farm-jornada");
  dom.targetFarmJornada = document.getElementById("target-farm-jornada");

  dom.farmHEContainer = document.getElementById("farm-he-container");
  dom.barFarmHE = document.getElementById("bar-farm-he");
  dom.labelFarmHE = document.getElementById("label-farm-he");
  dom.targetFarmHE = document.getElementById("target-farm-he");

  dom.farmNoturnoContainer = document.getElementById("farm-noturno-container");
  dom.barFarmNoturno = document.getElementById("bar-farm-noturno");
  dom.labelFarmNoturno = document.getElementById("label-farm-noturno");

  dom.farmFeriadoContainer = document.getElementById("farm-feriado-container");
  dom.barFarmFeriado = document.getElementById("bar-farm-feriado");
  dom.labelFarmFeriado = document.getElementById("label-farm-feriado");

  // (ATUALIZADO V38) Seletores de HE Mensal (Valor e Tempo)
  dom.displayHEMesValor = document.getElementById("display-horas-extras-valor");
  dom.displayHEMesTempo = document.getElementById("display-horas-extras-mes");

  dom.displayEstourado = document.getElementById("display-estourado");
  dom.displayEstouradoTempo = document.getElementById(
    "display-estourado-tempo"
  );
  dom.displayEstouradoValor = document.getElementById(
    "display-estourado-valor"
  );

  // Botões de Ponto e Edição
  dom.pointButtons = {
    entrada: document.getElementById("btn-entrada"),
    almoco: document.getElementById("btn-almoco"),
    pausa: document.getElementById("btn-pausa"), // (V39)
    saida: document.getElementById("btn-saida"),
  };
  dom.pointButtonContainers = {
    entrada: document.getElementById("btn-container-entrada"),
    almoco: document.getElementById("btn-container-almoco"),
    pausa: document.getElementById("btn-container-pausa"), // (V39)
    saida: document.getElementById("btn-container-saida"),
  };

  dom.atrasoEntradaLabel = document.getElementById("atraso-entrada");
  dom.excessoAlmocoLabel = document.getElementById("excesso-almoco");
  dom.totalAlmocoLabel = document.getElementById("total-almoco"); // (V40)

  // Seletores do Card de Almoço
  dom.almocoRetornoLabels = document.getElementById("almoco-retorno-labels");
  dom.timeSpans = {
    almoco_saida: document.getElementById("time-almoco_saida"),
    almoco_retorno: document.getElementById("time-almoco_retorno"),
    // (NOVOS V39) Seletores do Card de Pausa
    pausa_start: document.getElementById("time-pausa_start"),
    pausa_end: document.getElementById("time-pausa_end"),
  };
  dom.countdownAlmoco = document.getElementById("countdown-almoco");
  dom.horarioRetornoAlmoco = document.getElementById("horario-retorno-almoco");

  // (NOVOS V39) Seletores do Card de Pausa
  dom.pausaStartLabels = document.getElementById("pausa-start-labels");
  dom.pausaRetornoLabels = document.getElementById("pausa-retorno-labels");
  dom.countdownPausa = document.getElementById("countdown-pausa");
  dom.horarioRetornoPausa = document.getElementById("horario-retorno-pausa");
  dom.totalPausaLabel = document.getElementById("total-pausa"); // (V40)
  dom.excessoPausaLabel = document.getElementById("excesso-pausa"); // (V41)

  dom.editButtons = {
    entrada: document.getElementById("btn-edit-entrada"),
    almoco_saida: document.getElementById("btn-edit-almoco_saida"),
    almoco_retorno: document.getElementById("btn-edit-almoco_retorno"),
    // (NOVOS V39)
    pausa_start: document.getElementById("btn-edit-pausa_start"),
    pausa_end: document.getElementById("btn-edit-pausa_end"),
    saida: document.getElementById("btn-edit-saida"),
  };
  dom.suggestedTimeSpans = {
    almoco_saida: document.getElementById("suggested-almoco_saida"),
    almoco_retorno: document.getElementById("suggested-almoco_retorno"),
    saida: document.getElementById("suggested-saida"),
  };

  // Modais
  dom.modalPointRecord = document.getElementById("modal-point-record");
  dom.modalTitle = document.getElementById("modal-title");
  dom.modalBtnNow = document.getElementById("modal-btn-now");
  dom.modalOrDivider = document.getElementById("modal-or-divider");
  dom.modalFormManual = document.getElementById("modal-form-manual");
  dom.modalInputTime = document.getElementById("modal-input-time");
  dom.modalBtnCancel = document.getElementById("modal-btn-cancel");
  dom.modalFinalizeDay = document.getElementById("modal-finalize-day");
  dom.btnFinalizeYes = document.getElementById("btn-finalize-yes");
  dom.btnFinalizeNo = document.getElementById("btn-finalize-no");
  dom.modalDailyReport = document.getElementById("modal-daily-report");
  dom.reportContent = document.getElementById("report-content");
  dom.reportDate = document.getElementById("report-date");
  dom.reportEventsList = document.getElementById("report-events-list");
  dom.reportJornada = document.getElementById("report-jornada");
  dom.reportTotalTrabalhado = document.getElementById(
    "report-total-trabalhado"
  );
  dom.reportTotalAlmoco = document.getElementById("report-total-almoco");
  dom.reportTotalPausas = document.getElementById("report-total-pausas");
  dom.reportHeDeficit = document.getElementById("report-he-deficit");
  dom.reportFarmTotal = document.getElementById("report-farm-total");
  dom.reportEstouradoContainer = document.getElementById(
    "report-estourado-container"
  );
  dom.reportEstourado = document.getElementById("report-estourado");

  dom.btnCloseReport = document.getElementById("btn-close-report");
  dom.btnDownloadPng = document.getElementById("btn-download-png");

  // (ATUALIZADO V42) IDs do Modal de Info
  dom.modalInfoCalculo = document.getElementById("modal-info-calculo");
  dom.btnCloseInfoCalculo = document.getElementById("btn-close-info-calculo");
  dom.infoSettingsSalary = document.getElementById("info-settings-salary");
  dom.infoSettingsJornada = document.getElementById("info-settings-jornada");
  dom.infoSettingsDias = document.getElementById("info-settings-dias");

  dom.infoValorDia = document.getElementById("info-valor-dia");
  dom.infoValorDiaFeriado = document.getElementById("info-valor-dia-feriado");
  dom.infoValorDiaCompleto = document.getElementById("info-valor-dia-completo");
  dom.infoValorDiaCompletoFeriado = document.getElementById(
    "info-valor-dia-completo-feriado"
  );

  dom.infoValorHora = document.getElementById("info-valor-hora");
  dom.infoValorHoraHE = document.getElementById("info-valor-hora-he");
  dom.infoValorHoraNoturno = document.getElementById("info-valor-hora-noturno");
  dom.infoValorHoraFeriado = document.getElementById("info-valor-hora-feriado");
  dom.infoValorHoraHEFeriado = document.getElementById(
    "info-valor-hora-he-feriado"
  ); // (V42)

  // (NOVOS V40) Modal de Retorno
  dom.modalReturnTime = document.getElementById("modal-return-time");
  dom.modalReturnTitle = document.getElementById("modal-return-title");
  dom.modalReturnTimeDisplay = document.getElementById(
    "modal-return-time-display"
  );
  dom.btnCloseModalReturn = document.getElementById("btn-close-modal-return");

  dom.settingsForm = document.getElementById("settingsForm");

  // (NOVO V30) Toggle CLT
  dom.toggleCLT = document.getElementById("toggle-clt");
  dom.valoresWrapper = document.getElementById("valores-wrapper");

      dom.inputs = {
    jornada_horas: document.getElementById("jornada_horas"),
    jornada_minutos: document.getElementById("jornada_minutos"),
    almoco_horas: document.getElementById("almoco_horas"),
    almoco_minutos: document.getElementById("almoco_minutos"),
    salary_monthly: document.getElementById("salary_monthly"),
    divisor_mensal: document.getElementById("divisor_mensal"),
    entrada_padrao: document.getElementById("entrada_padrao"),
    saida_almoco_padrao: document.getElementById("saida_almoco_padrao"),
    retorno_almoco_padrao: document.getElementById("retorno_almoco_padrao"),
    saida_padrao: document.getElementById("saida_padrao"),
    dias_trabalho: document.getElementById("dias_trabalho"),
    multiplicador_hora_extra: document.getElementById("multiplicador_hora_extra"),
    multiplicador_feriado_domingo: document.getElementById("multiplicador_feriado_domingo"),
    fgts_percent: document.getElementById("fgts_percent"),
    max_he_minutes: document.getElementById("max_he_minutes"),
    has_15min_pause: document.getElementById("has_15min_pause"),
    pause_policy: document.getElementById("pause_policy"),
    alert_voice_on: document.getElementById("alert_voice_on"),
    timezone: document.getElementById("timezone"),
    adicional_noturno_percent: document.getElementById("adicional_noturno_percent"),
    domingo_policy: document.getElementById("domingo_policy"),
    is_almoco_pago: document.getElementById("is_almoco_pago"),
    dsr_ativo: document.getElementById("dsr_ativo"),
    horas_extras_padrao_dia: document.getElementById("horas_extras_padrao_dia"),
  };
  dom.btnDias = document.querySelectorAll(".btn-dia");
  dom.btnDias = document.querySelectorAll(".btn-dia");
  dom.modalSetPassword = document.getElementById("modal-set-password");
  dom.setPasswordForm = document.getElementById("setPasswordForm");
  dom.setNewPasswordInput = document.getElementById("set-new-password");
  dom.setRepeatPasswordInput = document.getElementById("set-repeat-password");
  dom.setPasswordStatus = document.getElementById("setPasswordStatus");
  dom.modalChangePassword = document.getElementById("modal-change-password");
  dom.changePasswordForm = document.getElementById("changePasswordForm");
  dom.changeCurrentPasswordInput = document.getElementById(
    "change-current-password"
  );
  dom.changeNewPasswordInput = document.getElementById("change-new-password");
  dom.changeRepeatPasswordInput = document.getElementById(
    "change-repeat-password"
  );
  dom.changePasswordStatus = document.getElementById("changePasswordStatus");
  dom.btnCancelChangePassword = document.getElementById(
    "btn-cancel-change-password"
  );

  // (NOVO V30) Teclado Virtual
  dom.virtualKeyboard = document.getElementById("virtual-keyboard");
  dom.virtualKeyboardBtns = document.querySelectorAll(".virtual-keyboard-btn");
}

// --- Lógica de API ---

async function apiFetch(url, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  if (state.authToken) {
    headers["Authorization"] = `Bearer ${state.authToken}`;
  }

  try {
    const response = await fetch(API_URL + url, { ...options, headers });

    if (response.status === 401 || response.status === 403) {
      console.warn("Token inválido/expirado detectado.");
      handleLogout();
      throw new Error("Autenticação necessária.");
    }

    const contentType = response.headers.get("content-type");
    let data;
    if (contentType && contentType.includes("application/json")) {
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error("Erro ao parsear JSON:", jsonError);
        throw new Error("Resposta inválida do servidor.");
      }
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const errorMessage =
        data?.error || (typeof data === "string" ? data : response.statusText);
      throw new Error(errorMessage || `Erro HTTP: ${response.status}`);
    }
    return data;
  } catch (error) {
    console.error(`Erro na requisição para ${url}:`, error);
    throw error;
  }
}

// Carrega settings e user
async function loadSettings() {
  try {
    const data = await apiFetch("/api/me");
    state.user = data.user;
    state.settings = data.settings || {};
    console.log("Dados do Usuário Carregados:", state.user);
    console.log("Configurações Carregadas:", state.settings);
    updateHeaderUI();
    populateSettingsForm();
  } catch (error) {
    console.error("Erro em loadSettings:", error);
    throw error;
  }
}

// Carrega registro do dia
async function loadTodayRecord() {
  if (!state.user) return;
  try {
    const data = await apiFetch("/api/point/today");
    state.todayRecord = data || {
      date: new Date().toISOString().split("T")[0],
      events: [],
      aggregates: {},
      is_holiday: false,
      is_finalized: false,
    };
    state.todayRecord.events = Array.isArray(data.events) ? data.events : [];
    state.todayRecord.aggregates =
      typeof data.aggregates === "object" && data.aggregates !== null
        ? data.aggregates
        : {};
    state.todayRecord.is_holiday = !!data.is_holiday;
    state.todayRecord.is_finalized = !!data.is_finalized;
    console.log("Registro de Hoje Carregado:", state.todayRecord);
  } catch (error) {
    console.error("Erro em loadTodayRecord:", error);
    state.todayRecord = {
      date: new Date().toISOString().split("T")[0],
      events: [],
      aggregates: {},
      is_holiday: false,
      is_finalized: false,
    };
  }
}

// (ATUALIZADO V38) Carrega resumo mensal (HE, Valor HE, Valor Total)
async function loadMonthlySummary() {
  if (!state.user) return;
  try {
    const data = await apiFetch("/api/point/summary/month");
    // (CORREÇÃO V38) Armazena os valores corretos no estado
    state.monthlySummary = data || {
      total_farm_extra: 0,
      total_extra_minutes: 0,
      total_farm: 0,
    };
    console.log("Resumo Mensal Carregado:", state.monthlySummary);
  } catch (error) {
    console.error("Erro em loadMonthlySummary:", error);
    state.monthlySummary = {
      total_farm_extra: 0,
      total_extra_minutes: 0,
      total_farm: 0,
    };
  }
}

// (INÍCIO DA CORREÇÃO V34)
/**
 * Força o backend a recalcular os agregados do dia.
 * Isso é usado ao carregar o app e ao salvar as configurações
 * para garantir que os valores (ex: meta do dia) estejam
 * sempre sincronizados com as configurações mais recentes.
 */
async function forceDayRecalculation() {
  if (!state.user || (state.todayRecord && state.todayRecord.is_finalized)) {
    // Não recalcula se o dia já estiver finalizado
    console.log("Recálculo pulado (dia finalizado ou usuário nulo).");
    return;
  }

  console.log("Forçando recálculo do dia para sincronizar settings...");
  try {
    // Chama o endpoint 'holiday' com o valor que já está no estado.
    // A API vai recalcular os agregados com as settings mais recentes do DB.
    const updatedRecord = await apiFetch("/api/point/holiday", {
      method: "PUT",
      body: JSON.stringify({ is_holiday: !!state.todayRecord.is_holiday }),
    });

    state.todayRecord = updatedRecord; // Armazena o registro recalculado
    console.log("Recálculo forçado com sucesso.", state.todayRecord);
  } catch (error) {
    console.error("Erro ao forçar recálculo do dia:", error.message);
    // Se falhar, apenas continua com os dados que já tinha
    await loadTodayRecord();
  }
}
// (FIM DA CORREÇÃO V34)

// (ATUALIZADO V35) Salva as configurações com VALIDAÇÃO
async function handleSaveSettings(event) {
  event.preventDefault();
  dom.saveStatusEl.textContent = "Salvando...";
  dom.saveStatusEl.classList.remove("text-red-500", "text-green-500");

  const formData = {};
  const inputs = dom.inputs;
  let hasError = false;

  Object.values(inputs).forEach((input) => {
    if (input && input.classList) input.classList.remove("border-red-500");
  });

  const jornadaH = parseInt(inputs.jornada_horas.value) || 0;
  const jornadaM = parseInt(inputs.jornada_minutos.value) || 0;
  formData.jornada_diaria_minutes = jornadaH * 60 + jornadaM;

  const almocoH = parseInt(inputs.almoco_horas.value) || 0;
  const almocoM = parseInt(inputs.almoco_minutos.value) || 0;
  formData.tempo_almoco_minutes = almocoH * 60 + almocoM;

  // Day array parsing
  const diasArr = [];
  dom.btnDias.forEach(b => {
    if (b.dataset.active === "1") diasArr.push(parseInt(b.dataset.dia, 10));
  });
  formData.dias_trabalho = JSON.stringify(diasArr);

  if (dom.toggleCLT.checked) {
    Object.assign(formData, CLT_DEFAULTS);
    delete formData.dias_trabalho_por_semana;
  } else {
    for (const key of Object.keys(CLT_DEFAULTS)) {
      if (key === "dias_trabalho_por_semana") continue;
      const input = inputs[key];
      let value = parseFloat(input.value);

      if (key === "multiplicador_hora_extra" && !isNaN(value)) value = (value / 100) + 1;
      if (key === "multiplicador_feriado_domingo" && !isNaN(value)) value = (value / 100) + 1;

      let isInvalid = false;
      if (key !== "fgts_percent" && (isNaN(value) || value <= 0)) isInvalid = true;
      else if (key === "fgts_percent" && isNaN(value)) isInvalid = true;

      if (isInvalid) {
        if (input) input.classList.add("border-red-500");
        hasError = true;
      } else {
        formData[key] = value;
      }
    }
  }

  Object.keys(inputs).forEach((key) => {
    if (CLT_DEFAULTS.hasOwnProperty(key)) return;
    if (["jornada_horas", "jornada_minutos", "almoco_horas", "almoco_minutos", "dias_trabalho"].includes(key)) return;

    const input = inputs[key];
    if (!input) return;

    let value;
    if (input.type === "checkbox") {
      value = input.checked ? 1 : 0;
    } else {
      value = input.value;
      if (["max_he_minutes", "horas_extras_padrao_dia"].includes(key)) {
        value = hhmmToMinutes(value);
      } else if (key === "divisor_mensal") {
        const numValue = parseInt(value);
        if (isNaN(numValue) || numValue <= 0) {
          input.classList.add("border-red-500");
          hasError = true;
        } else value = numValue;
      } else if (input.type === "time" && !value) {
        value = null;
      }
    }
    formData[key] = value;
  });

  if (hasError) {
    dom.saveStatusEl.textContent = "Erro: Verifique os campos de valores.";
    dom.saveStatusEl.classList.add("text-red-500");
    return;
  }

  try {
    const result = await apiFetch("/api/me/settings", {
      method: "PUT",
      body: JSON.stringify(formData),
    });
    state.settings = result.settings;

    dom.saveStatusEl.textContent = "Salvo com sucesso!";
    dom.saveStatusEl.classList.add("text-green-500");
    populateSettingsForm();

    await forceDayRecalculation();
    await loadMonthlySummary(); 
    refreshDashboardUI();
    // Also trigger month recalculation silently:
    apiFetch("/api/point/recalculate-month", { method: "POST" }).catch(()=>console.log("Recalc bg"));
    
    setTimeout(() => (dom.saveStatusEl.textContent = ""), 3000);
  } catch (error) {
    console.error("Erro em handleSaveSettings:", error);
    dom.saveStatusEl.textContent = `Erro: ${error.message}`;
    dom.saveStatusEl.classList.add("text-red-500");
  }
}

// --- Funções de UI ---

function handleToggleCLT() {
  const isCLT = dom.toggleCLT.checked;
  const cltInputs = Object.keys(CLT_DEFAULTS);

  cltInputs.forEach((key) => {
    if (key === "dias_trabalho_por_semana") return;
    const input = dom.inputs[key];
    if (!input) return;
    
    if (isCLT) {
      // Diferente de outros, a gente precisa aplicar a porcentagem visual para mult.
      let defaultVal = CLT_DEFAULTS[key];
      if (key === "multiplicador_hora_extra") defaultVal = (defaultVal - 1) * 100;
      if (key === "multiplicador_feriado_domingo") defaultVal = (defaultVal - 1) * 100;

      input.value = defaultVal;
      input.disabled = true;
      input.classList.remove("border-red-500");
    } else {
      input.disabled = false;
    }
  });
}


function minutesToHHMM(mins) {
  if (mins === null || isNaN(mins)) return "";
  const h = Math.floor(mins / 60).toString().padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function hhmmToMinutes(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(":");
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}


function minutesToHHMM(mins) {
  if (mins === null || isNaN(mins)) return "";
  const h = Math.floor(mins / 60).toString().padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function hhmmToMinutes(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(":");
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

// Popula o form de settings
function populateSettingsForm() {
  const s = state.settings;
  const inputs = dom.inputs;
  if (!s || Object.keys(s).length === 0 || !inputs) return;

  // Set day buttons state
  let diasObj = [];
  try {
    diasObj = typeof s.dias_trabalho === "string" ? JSON.parse(s.dias_trabalho) : (s.dias_trabalho || [1,2,3,4,5]);
  } catch(e) {
    diasObj = [1,2,3,4,5];
  }
  dom.btnDias.forEach(btn => {
    const diaNum = parseInt(btn.dataset.dia, 10);
    if (diasObj.includes(diaNum)) {
      btn.classList.add("bg-blue-500", "text-white");
      btn.classList.remove("text-muted", "bg-transparent");
      btn.dataset.active = "1";
    } else {
      btn.classList.remove("bg-blue-500", "text-white");
      btn.classList.add("text-muted", "bg-transparent");
      btn.dataset.active = "0";
    }
  });

  let isCLT = true;
  Object.keys(CLT_DEFAULTS).forEach((key) => {
    if (key === "dias_trabalho_por_semana") return; // skipped
    let defaultVal = CLT_DEFAULTS[key];
    let val = s[key];
    
    // Percent conversions
    if (key === "multiplicador_hora_extra" && val !== null) val = (val - 1) * 100;
    if (key === "multiplicador_feriado_domingo" && val !== null) val = (val - 1) * 100;

    if (key === "multiplicador_hora_extra") defaultVal = (defaultVal - 1) * 100;
    if (key === "multiplicador_feriado_domingo") defaultVal = (defaultVal - 1) * 100;

    if (String(val) !== String(defaultVal) && s[key] !== null) {
      isCLT = false;
    }
  });
  if (s.salary_monthly === null || s.salary_monthly === 0) isCLT = true;

  Object.keys(CLT_DEFAULTS).forEach((key) => {
    if (key === "dias_trabalho_por_semana") return; 
    let defaultVal = CLT_DEFAULTS[key];
    if (key === "multiplicador_hora_extra") defaultVal = (defaultVal - 1) * 100;
    if (key === "multiplicador_feriado_domingo") defaultVal = (defaultVal - 1) * 100;

    if (isCLT) {
      if (dom.inputs[key]) dom.inputs[key].value = defaultVal;
    } else {
      let val = s[key] || "";
      if (key === "multiplicador_hora_extra" && val) val = (s[key] - 1) * 100;
      if (key === "multiplicador_feriado_domingo" && val) val = (s[key] - 1) * 100;
      if (dom.inputs[key]) dom.inputs[key].value = val;
    }
  });

  dom.toggleCLT.checked = isCLT;
  handleToggleCLT(); 

  const totalJornadaMin = s.jornada_diaria_minutes || 440;
  if (inputs.jornada_horas) inputs.jornada_horas.value = Math.floor(totalJornadaMin / 60);
  if (inputs.jornada_minutos) inputs.jornada_minutos.value = totalJornadaMin % 60;

  const totalAlmocoMin = s.tempo_almoco_minutes || 60;
  if (inputs.almoco_horas) inputs.almoco_horas.value = Math.floor(totalAlmocoMin / 60);
  if (inputs.almoco_minutos) inputs.almoco_minutos.value = totalAlmocoMin % 60;

  Object.keys(inputs).forEach((key) => {
    if (CLT_DEFAULTS.hasOwnProperty(key)) return;
    if (key.includes("_horas") || key.includes("_minutos")) return;

    const input = inputs[key];
    if (!input) return;

    if (key === "max_he_minutes" || key === "horas_extras_padrao_dia") {
      input.value = minutesToHHMM(s[key] !== null && s[key] !== undefined ? s[key] : 120);
    } else if (key === "divisor_mensal") {
      input.value = s[key] || 220;
    } else if (key === "dias_trabalho") {
      // handled by buttons
    } else if (input.type === "checkbox") {
      input.checked = !!s[key];
    } else {
      input.value = s[key] !== null && s[key] !== undefined ? s[key] : "";
    }
  });

  if (inputs.timezone) inputs.timezone.value = s.timezone || "America/Sao_Paulo";
}

function updateHeaderDate() {
  const today = new Date();
  const options = { weekday: "long", day: "numeric", month: "long" };
  let formattedDate = today.toLocaleDateString("pt-BR", options);
  formattedDate =
    formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
  if (dom.headerDate) dom.headerDate.textContent = formattedDate;
}

function updateNavUI(currentPath) {
  dom.navLinks.forEach((link) => {
    const isActive = link.getAttribute("href") === currentPath;
    link.classList.toggle("active", isActive);
    link.classList.toggle("text-muted", !isActive);
    link.classList.toggle("text-blue-500", isActive);
    link.classList.toggle("dark:text-amber-400", isActive);
  });
}

function setDarkMode(isDark) {
  if (isDark) {
    htmlElement.classList.add("dark");
    localStorage.setItem("darkmode", "true");
    iconMoon.classList.add("hidden");
    iconSun.classList.remove("hidden");
  } else {
    htmlElement.classList.remove("dark");
    localStorage.setItem("darkmode", "false");
    iconMoon.classList.remove("hidden");
    iconSun.classList.add("hidden");
  }
}

function updateHeaderUI() {
  if (state.user) {
    dom.userGreeting.textContent = `Olá, ${
      state.user.name.split(" ")[0] || "Usuário"
    }`;
    dom.userInitial.textContent = state.user.name
      ? state.user.name.charAt(0).toUpperCase()
      : "?";
  }
}

// --- Lógica de Negócio e UI (O "Motor") ---

function getNowMinutes() {
  const now = new Date();
  // (CORREÇÃO V36) Usa Math.floor para minutos inteiros, + segundos/60 para precisão
  return now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
}

function startDigitalClock() {
  stopDigitalClock();
  state.digitalClockInterval = setInterval(() => {
    if (state.todayRecord.is_finalized) {
      stopDigitalClock();
      return;
    }
    const now = new Date();
    if (dom.realtimeClock) {
      dom.realtimeClock.textContent = now.toLocaleTimeString("pt-BR");
    }
    liveUpdateTotals();
  }, 1000);
}

function stopDigitalClock() {
  if (state.digitalClockInterval) clearInterval(state.digitalClockInterval);
  state.digitalClockInterval = null;
}

function timeToMinutes(timeStr) {
  if (!timeStr || !timeStr.includes(":")) return 0;
  const parts = timeStr.split(":");
  if (parts.length < 2) return 0;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return 0;
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes) {
  if (isNaN(totalMinutes) || totalMinutes === null || totalMinutes < 0)
    return "--:--";
  totalMinutes = Math.floor(totalMinutes);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const formattedHours = String(hours).padStart(2, "0");
  const formattedMinutes = String(minutes).padStart(2, "0");
  return `${formattedHours}:${formattedMinutes}`;
}

// (NOVO V36) Converte minutos para H:MM:SS
function minutesToTimeWithSeconds(totalMinutes) {
  if (isNaN(totalMinutes) || totalMinutes === null) return "--:--:--";

  // Pega o sinal (para tempo negativo)
  const sign = totalMinutes < 0 ? "-" : "";
  totalMinutes = Math.abs(totalMinutes);

  const totalSeconds = Math.floor(totalMinutes * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const formattedHours = String(hours).padStart(2, "0");
  const formattedMinutes = String(minutes).padStart(2, "0");
  const formattedSeconds = String(seconds).padStart(2, "0");

  if (hours > 0) {
    return `${sign}${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
  } else {
    // (CORREÇÃO V37) Garante que minutos/segundos sejam exibidos
    return `${sign}${formattedMinutes}:${formattedSeconds}`;
  }
}

// (INÍCIO DA CORREÇÃO V37 -> V40) - Função movida para o escopo global
function formatCurrency(value) {
  if (isNaN(value) || value === null) value = 0;
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
// (FIM DA CORREÇÃO V37 -> V40)

// (ATUALIZADO V42) Atualiza "Faltam", HE Total e todas as Barras
function liveUpdateTotals() {
  const { events, aggregates, is_finalized } = state.todayRecord;
  const s = state.settings;

  if (!aggregates || Object.keys(aggregates).length === 0 || !s) {
    if (dom.farmTotalHoras) dom.farmTotalHoras.textContent = "--:--";
    return;
  }

  // Se finalizado, apenas seta os valores finais e para.
  if (is_finalized) {
    if (dom.farmTotalHoras) {
      dom.farmTotalHoras.textContent = minutesToTime(
        aggregates.effective_worked_minutes
      );
    }
    if (dom.farmTotalValor) {
      const totalFarm =
        (aggregates.farm_jornada_value || 0) +
        (aggregates.farm_he_value || 0) +
        (aggregates.farm_estourado_value || 0) +
        (aggregates.farm_adicional_noturno_value || 0) +
        (aggregates.farm_adicional_feriado_value || 0);
      dom.farmTotalValor.textContent = formatCurrency(totalFarm);
    }
    // (NOVO V36) Garante que "Faltam" mostre o estado final
    if (dom.displayFaltam) dom.displayFaltam.textContent = "Dia Finalizado.";

    // (NOVO V39) Garante que HE Total mostre o valor final
    if (dom.displayHEMesValor)
      dom.displayHEMesValor.textContent = formatCurrency(
        state.monthlySummary.total_farm_extra
      );
    if (dom.displayHEMesTempo)
      dom.displayHEMesTempo.textContent = minutesToTime(
        state.monthlySummary.total_extra_minutes
      );

    stopDigitalClock();
    return;
  }

  const sortedEvents = [...events].sort(
    (a, b) => timeToMinutes(a.time) - timeToMinutes(b.time)
  );
  const lastEvent = sortedEvents[sortedEvents.length - 1];

  // --- Valores Base (do backend) ---
  const backendMinutes = aggregates.effective_worked_minutes || 0;
  const baseJornadaFarm = aggregates.farm_jornada_value || 0;
  const baseHEFarm = aggregates.farm_he_value || 0;
  const baseEstouradoFarm = aggregates.farm_estourado_value || 0;
  const baseEstouradoMinutes = aggregates.estourado_minutes || 0;
  const baseHEMinutes = aggregates.extra_minutes || 0;
  const baseNoturnoFarm = aggregates.farm_adicional_noturno_value || 0;
  const baseFeriadoFarm = aggregates.farm_adicional_feriado_value || 0;

  // --- Valores em Tempo Real (Live) ---
  let liveMinutes = 0;
  let liveJornadaFarm = 0;
  let liveHEFarm = 0;
  let liveEstouradoFarm = 0;
  let liveHEMinutes = 0;
  let liveEstouradoMinutes = 0;
  let liveFeriadoFarm = 0;
  // Ad. Noturno não é calculado em tempo real por complexidade

  const nowMinutes = getNowMinutes(); // (NOVO V36) Pega o tempo real agora

  const isAlmocoPago = state.settings.is_almoco_pago;
  if (
    lastEvent &&
    (lastEvent.type === "entrada" ||
      lastEvent.type === "almoco_retorno" ||
      lastEvent.type === "pausa_end" ||
      (lastEvent.type === "almoco_saida" && isAlmocoPago))
  ) {
    const lastEventMinutes = timeToMinutes(lastEvent.time);
    if (nowMinutes >= lastEventMinutes) {
      liveMinutes = nowMinutes - lastEventMinutes;

      const jornadaDia = s.jornada_diaria_minutes || 440;
      const maxHE = s.max_he_minutes || 120;
      const limiteTotal = jornadaDia + maxHE;
      const isDayWithMultiplier = aggregates.is_day_with_multiplier;

      const valorMinutoBase = aggregates.valor_por_minuto || 0;
      const valorMinutoHETotal = aggregates.valor_por_minuto_extra || 0;
      const valorMinutoAdicionalFeriado =
        aggregates.valor_por_minuto_adicional_feriado || 0;

      // 1. Divide os minutos live (Jornada, HE, Estourado)
      const minutosJornadaRestantes = Math.max(0, jornadaDia - backendMinutes);
      const minutosJornadaLive = Math.min(liveMinutes, minutosJornadaRestantes);

      const minutosHERestantes = Math.max(
        0,
        limiteTotal - Math.max(jornadaDia, backendMinutes)
      );
      liveHEMinutes = Math.min(
        Math.max(0, liveMinutes - minutosJornadaLive),
        minutosHERestantes
      );

      liveEstouradoMinutes = Math.max(
        0,
        liveMinutes - minutosJornadaLive - liveHEMinutes
      );

      // 2. Calcula o farm (valor) para cada parte
      liveJornadaFarm = minutosJornadaLive * valorMinutoBase;

      // (V42) Lógica 3x Corrigida
      if (isDayWithMultiplier) {
        const valor_hora_feriado =
          valorMinutoBase * (s.multiplicador_feriado_domingo || 2.0);
        const valor_he_feriado =
          (valor_hora_feriado * (s.multiplicador_hora_extra || 1.5)) / 60;

        liveHEFarm = liveHEMinutes * valor_he_feriado;
        liveEstouradoFarm = liveEstouradoMinutes * valor_he_feriado;
      } else {
        liveHEFarm = liveHEMinutes * valorMinutoHETotal;
        liveEstouradoFarm = liveEstouradoMinutes * valorMinutoHETotal;
      }

      // 3. Calcula o adicional de feriado (se aplicável)
      if (isDayWithMultiplier) {
        // O adicional é pago sobre os minutos da jornada (base_minutes + liveJornadaFarm)
        // Os minutos de HE já foram pagos a 3x.
        liveFeriadoFarm = minutosJornadaLive * valorMinutoAdicionalFeriado;
      }
    }
  }

  // --- SOMA TUDO (Base + Live) ---
  const totalJornadaFarm = baseJornadaFarm + liveJornadaFarm;
  const totalHEFarm = baseHEFarm + liveHEFarm;
  const totalEstouradoFarm = baseEstouradoFarm + liveEstouradoFarm;

  const totalHEMinutosDoDia =
    baseHEMinutes + liveHEMinutes + baseEstouradoMinutes + liveEstouradoMinutes;
  const totalHEFarmDoDia = totalHEFarm + totalEstouradoFarm;

  const totalNoturnoFarm = baseNoturnoFarm;
  const totalFeriadoFarm = baseFeriadoFarm + liveFeriadoFarm;

  const totalFarmDoDia =
    totalJornadaFarm + totalHEFarmDoDia + totalNoturnoFarm + totalFeriadoFarm;
  const totalMinutosTrabalhados = backendMinutes + liveMinutes;

  // --- ATUALIZA A UI ---

  // 1. Atualiza Totais da Barra Superior
  if (dom.farmTotalHoras) dom.farmTotalHoras.textContent = minutesToTime(totalMinutosTrabalhados);
  if (dom.farmTotalValor) dom.farmTotalValor.textContent = formatCurrency(totalFarmDoDia);

  // 2. Atualiza Display de Tempo Estourado
  const totalEstouradoMin = baseEstouradoMinutes + liveEstouradoMinutes;
  if (dom.displayEstourado) {
    if (totalEstouradoMin > 0) {
      dom.displayEstourado.classList.remove("hidden");
      if (dom.displayEstouradoTempo) dom.displayEstouradoTempo.textContent = minutesToTime(totalEstouradoMin);
      if (dom.displayEstouradoValor) dom.displayEstouradoValor.textContent = `(${formatCurrency(
        totalEstouradoFarm
      )})`;
    } else {
      dom.displayEstourado.classList.add("hidden");
    }
  }

  // 3. Atualiza "Faltam" em tempo real
  if (dom.displayFaltam) {
    const saidaSugeridaMin = aggregates.saida_sugerida_minutes;
    if (events.length > 0 && saidaSugeridaMin) {
      const remaining = saidaSugeridaMin - nowMinutes;

      if (totalEstouradoMin > 0) {
        dom.displayFaltam.textContent = `Tempo Estourado: ${minutesToTime(
          totalEstouradoMin
        )}`;
      } else if (totalMinutosTrabalhados > (s.jornada_diaria_minutes || 0)) {
        const heAgora =
          totalMinutosTrabalhados - (s.jornada_diaria_minutes || 0);
        dom.displayFaltam.textContent = `Hora Extra: ${minutesToTime(heAgora)}`;
      } else if (remaining > 0) {
        dom.displayFaltam.textContent = `Faltam: ${minutesToTimeWithSeconds(
          remaining
        )}`;
      } else {
        dom.displayFaltam.textContent = `Jornada concluída`;
      }
    }
  }

  // 4. (CORRIGIDO V42) Atualiza HE Total em tempo real
  const heTotalMinutos =
    (state.monthlySummary.total_extra_minutes || 0) + totalHEMinutosDoDia;
  const heTotalValor =
    (state.monthlySummary.total_farm_extra || 0) + totalHEFarmDoDia;

  if (dom.displayHEMesValor) dom.displayHEMesValor.textContent = formatCurrency(heTotalValor);
  if (dom.displayHEMesTempo) dom.displayHEMesTempo.textContent = minutesToTime(heTotalMinutos);

  // 5. Atualiza as Barras de Progresso (V42)
  const metaJornada =
    dom.targetFarmJornada ? parseFloat(
      dom.targetFarmJornada.textContent
        .replace("Meta: R$ ", "")
        .replace(",", ".")
    ) || 0 : 0;
  const metaHE =
    dom.targetFarmHE ? parseFloat(
      dom.targetFarmHE.textContent.replace("Meta HE: R$ ", "").replace(",", ".")
    ) || 0 : 0;
  const metaTotal = metaJornada + metaHE;

  // Barra Total
  const farmTotalJornadaEHE = totalJornadaFarm + totalHEFarmDoDia;
  if (dom.labelFarmTotal) dom.labelFarmTotal.textContent = formatCurrency(farmTotalJornadaEHE);
  if (dom.barFarmTotal) dom.barFarmTotal.style.width = `${Math.min(
    100,
    (farmTotalJornadaEHE / metaTotal) * 100
  )}%`;

  // Barra jornada
  if (dom.labelFarmJornada) dom.labelFarmJornada.textContent = formatCurrency(totalJornadaFarm);
  if (dom.barFarmJornada) dom.barFarmJornada.style.width = `${Math.min(
    100,
    (totalJornadaFarm / metaJornada) * 100
  )}%`;

  // Barra HE
  if (dom.farmHEContainer) {
    if (totalHEFarmDoDia > 0) {
      dom.farmHEContainer.classList.remove("hidden");
      if (dom.labelFarmHE) dom.labelFarmHE.textContent = formatCurrency(totalHEFarmDoDia);
      if (dom.barFarmHE) dom.barFarmHE.style.width = `${Math.min(
        100,
        (totalHEFarmDoDia / metaHE) * 100
      )}%`;
    } else {
      dom.farmHEContainer.classList.add("hidden");
    }
  }

  // Barra Ad. Noturno
  if (dom.farmNoturnoContainer) {
    if (totalNoturnoFarm > 0) {
      dom.farmNoturnoContainer.classList.remove("hidden");
      if (dom.labelFarmNoturno) dom.labelFarmNoturno.textContent = formatCurrency(totalNoturnoFarm);
    } else {
      dom.farmNoturnoContainer.classList.add("hidden");
    }
  }

  // Barra Ad. Feriado
  if (dom.farmFeriadoContainer) {
    if (totalFeriadoFarm > 0) {
      dom.farmFeriadoContainer.classList.remove("hidden");
      if (dom.labelFarmFeriado) dom.labelFarmFeriado.textContent = formatCurrency(totalFeriadoFarm);
    } else {
      dom.farmFeriadoContainer.classList.add("hidden");
    }
  }
}

// (ATUALIZADO V42) Função principal de UI
function refreshDashboardUI() {
  const { aggregates, events, is_holiday, is_finalized } = state.todayRecord;
  const s = state.settings;

  if (
    !aggregates ||
    Object.keys(aggregates).length === 0 ||
    !s ||
    Object.keys(s).length === 0
  ) {
    console.warn("Aggregates ou Settings não disponíveis.");
    if (events.length === 0) {
      if (dom.farmBar) dom.farmBar.classList.add("hidden");
      if (dom.displayFaltam)
        dom.displayFaltam.textContent = "Aguardando entrada...";
      if (dom.displaySaidaSugerida)
        dom.displaySaidaSugerida.textContent = "--:--";
      if (dom.displaySaidaSugeridaHE)
        dom.displaySaidaSugeridaHE.classList.add("hidden");
    }
    updateButtonStates();
    if (dom.toggleHoliday) {
      dom.toggleHoliday.checked = is_holiday;
      dom.toggleHoliday.disabled = is_finalized;
    }
    updateFinalizedUI(is_finalized);
    return;
  }

  updateFinalizedUI(is_finalized);

  // 1. Controla o "Glow" Dourado e Padding do Toggle
  const isDayWithMultiplier = aggregates.is_day_with_multiplier || is_holiday;

  // (CORREÇÃO V42) Adiciona padding e borda
  if (dom.holidayCard) {
    if (isDayWithMultiplier) {
      dom.holidayCard.classList.add("gold-glow-element", "p-3", "rounded-lg");
    } else {
      dom.holidayCard.classList.remove("gold-glow-element", "p-3", "rounded-lg");
    }
  }
  if (dom.holidayLabel) dom.holidayLabel.classList.toggle("gold-glow-text", isDayWithMultiplier);

  // 2. Atualiza a "Farm Bar"
  if (dom.farmBar) dom.farmBar.classList.remove("hidden");

  // 3. Atualiza Metas das Barras (Valores estáticos)
  const jornadaMinutos = s.jornada_diaria_minutes || 0;
  const maxHEMinutos = s.max_he_minutes || 120;

  const valorMinuto = aggregates.valor_por_minuto || 0;
  const valorMinutoExtra = aggregates.valor_por_minuto_extra || 0;

  let metaJornada = valorMinuto * jornadaMinutos;
  let metaHE = valorMinutoExtra * maxHEMinutos;

  // (V42) Se for feriado, a meta da jornada base é multiplicada
  if (isDayWithMultiplier) {
    const valorAdicionalFeriado =
      (aggregates.valor_por_minuto_adicional_feriado || 0) * 60;
    const valorHoraFeriadoBase = valorMinuto * 60 + valorAdicionalFeriado;
    const valorHoraFeriadoHE = valorMinutoExtra * 60 + valorAdicionalFeriado;

    metaJornada = (valorHoraFeriadoBase / 60) * jornadaMinutos;
    metaHE = (valorHoraFeriadoHE / 60) * maxHEMinutos;
  }

  if (dom.targetFarmJornada) dom.targetFarmJornada.textContent = `Meta: ${formatCurrency(metaJornada)}`;
  if (dom.targetFarmHE) dom.targetFarmHE.textContent = `Meta HE: ${formatCurrency(metaHE)}`;
  if (dom.targetFarmTotal) dom.targetFarmTotal.textContent = `Meta Total: ${formatCurrency(
    metaJornada + metaHE
  )}`;

  // (CHAMADA V42) - Chamada inicial do liveUpdateTotals para preencher tudo
  liveUpdateTotals();

  if (dom.atrasoInfo) {
    if (aggregates.atraso_minutes > 0) {
      dom.atrasoInfo.textContent = `Atraso: ${aggregates.atraso_minutes} min`;
      dom.atrasoInfo.classList.remove("hidden");
    } else {
      dom.atrasoInfo.classList.add("hidden");
    }
  }

  // 4. Atualiza Saída Sugerida
  if (dom.displaySaidaSugerida)
    dom.displaySaidaSugerida.textContent = minutesToTime(
      aggregates.saida_sugerida_minutes
    );

  // (REMOVIDO V36) O cálculo de "Faltam" foi movido para liveUpdateTotals
  // Apenas setamos o estado inicial/final aqui.
  if (is_finalized) {
    if (dom.displayFaltam) dom.displayFaltam.textContent = "Dia Finalizado.";
    if (dom.displaySaidaSugeridaHE)
      dom.displaySaidaSugeridaHE.classList.add("hidden");
    if (dom.btnViewReport) dom.btnViewReport.classList.remove("hidden");
    if (dom.btnAlterarHorarios)
      dom.btnAlterarHorarios.classList.remove("hidden"); // (NOVO V30)
  } else if (events.length === 0) {
    if (dom.displayFaltam)
      dom.displayFaltam.textContent = "Aguardando entrada...";
    if (dom.displaySaidaSugeridaHE)
      dom.displaySaidaSugeridaHE.classList.add("hidden");
    if (dom.btnViewReport) dom.btnViewReport.classList.add("hidden");
    if (dom.btnAlterarHorarios) dom.btnAlterarHorarios.classList.add("hidden"); // (NOVO V30)
  } else if (aggregates.saida_sugerida_minutes) {
    // (CORRIGIDO) Lógica da Sugestão de HE
    const maxHE = s.max_he_minutes || 120;
    if (aggregates.extra_minutes >= maxHE) {
      if (dom.displaySaidaSugeridaHETime)
        dom.displaySaidaSugeridaHETime.textContent = "Meta Atingida";
    } else {
      const saidaHE =
        aggregates.saida_sugerida_minutes +
        (maxHE - (aggregates.extra_minutes || 0));
      if (dom.displaySaidaSugeridaHETime)
        dom.displaySaidaSugeridaHETime.textContent = minutesToTime(saidaHE);
    }
    if (dom.displaySaidaSugeridaHE)
      dom.displaySaidaSugeridaHE.classList.remove("hidden");
    if (dom.btnViewReport) dom.btnViewReport.classList.add("hidden");
    if (dom.btnAlterarHorarios) dom.btnAlterarHorarios.classList.add("hidden"); // (NOVO V30)
  }

  // 6. Atualiza horários nos botões e sugestões
  // Reseta todos os botões para o estado padrão
  dom.pointButtonContainers.entrada.querySelector(
    "span.font-mono"
  ).textContent = "--:--";
  dom.editButtons.entrada.classList.add("hidden");
  dom.atrasoEntradaLabel.classList.add("hidden");
  dom.timeSpans.almoco_saida.textContent = "--:--";
  dom.timeSpans.almoco_retorno.textContent = "--:--";
  dom.timeSpans.almoco_retorno.classList.add("hidden");
  dom.editButtons.almoco_saida.classList.add("hidden");
  dom.editButtons.almoco_retorno.classList.add("hidden");
  dom.almocoRetornoLabels.classList.add("hidden");
  dom.excessoAlmocoLabel.classList.add("hidden");
  dom.totalAlmocoLabel.classList.add("hidden"); // (V40)

  // (ATUALIZADO V39) Reseta o card de Pausa
  dom.timeSpans.pausa_start.textContent = "--:--";
  dom.timeSpans.pausa_end.textContent = "--:--";
  dom.timeSpans.pausa_end.classList.add("hidden");
  dom.editButtons.pausa_start.classList.add("hidden");
  dom.editButtons.pausa_end.classList.add("hidden");
  dom.pausaRetornoLabels.classList.add("hidden");
  dom.pausaStartLabels.classList.remove("hidden");
  dom.totalPausaLabel.classList.add("hidden"); // (V40)
  dom.excessoPausaLabel.classList.add("hidden"); // (V41)

  dom.pointButtonContainers.saida.querySelector("span.font-mono").textContent =
    "--:--";
  dom.editButtons.saida.classList.add("hidden");

  Object.values(dom.suggestedTimeSpans).forEach((span) => {
    if (span) span.textContent = "(Sug: --:--)";
  });

  // Preenche os botões com dados
  const entradaEvent = events.find((ev) => ev.type === "entrada");
  const almocoSaidaEvent = events.find((ev) => ev.type === "almoco_saida");
  const almocoRetornoEvent = events.find((ev) => ev.type === "almoco_retorno");
  const saidaEvent = events.find((ev) => ev.type === "saida");
  // (NOVOS V39)
  const pausaStartEvent = events.find((ev) => ev.type === "pausa_start");
  const pausaEndEvent = events.find((ev) => ev.type === "pausa_end");

  if (entradaEvent) {
    dom.pointButtonContainers.entrada.querySelector(
      "span.font-mono"
    ).textContent = entradaEvent.time;
    if (!is_finalized) dom.editButtons.entrada.classList.remove("hidden");
    // (NOVO) Mostra Atraso
    if (aggregates.atraso_minutes > 0) {
      dom.atrasoEntradaLabel.textContent = `Atraso: ${aggregates.atraso_minutes} min`;
      dom.atrasoEntradaLabel.classList.remove("hidden");
      dom.atrasoEntradaLabel.classList.remove(
        "text-white",
        "dark:text-gray-100"
      );
      dom.atrasoEntradaLabel.classList.add("text-red-500");
    }
  }

  // (ATUALIZADO V40) Lógica do Card de Almoço com Total
  if (almocoSaidaEvent) {
    dom.timeSpans.almoco_saida.textContent = almocoSaidaEvent.time;
    dom.almocoRetornoLabels.classList.remove("hidden");
    dom.timeSpans.almoco_retorno.classList.remove("hidden");
    if (!is_finalized) dom.editButtons.almoco_saida.classList.remove("hidden");
  }

  if (almocoRetornoEvent) {
    dom.timeSpans.almoco_retorno.textContent = almocoRetornoEvent.time;
    if (!is_finalized)
      dom.editButtons.almoco_retorno.classList.remove("hidden");

    // (NOVO V40) Mostra tempo total de almoço
    if (aggregates.almoco_minutes_total > 0) {
      dom.totalAlmocoLabel.textContent = `Total: ${Math.round(
        aggregates.almoco_minutes_total
      )} min`;
      dom.totalAlmocoLabel.classList.remove("hidden");
    }

    // Mostra Excesso de Almoço
    if (aggregates.excesso_almoco_minutes > 0) {
      dom.excessoAlmocoLabel.textContent = `Excesso: ${aggregates.excesso_almoco_minutes} min`;
      dom.excessoAlmocoLabel.classList.remove("hidden");
      dom.excessoAlmocoLabel.classList.remove(
        "text-white",
        "dark:text-gray-100"
      );
      dom.excessoAlmocoLabel.classList.add("text-red-500");
    } else if (
      s.tempo_almoco_minutes &&
      aggregates.almoco_minutes_total < s.tempo_almoco_minutes
    ) {
      const deficitAlmoco =
        s.tempo_almoco_minutes - aggregates.almoco_minutes_total;
      dom.excessoAlmocoLabel.textContent = `Faltou: ${deficitAlmoco} min`;
      dom.excessoAlmocoLabel.classList.remove("hidden");
      dom.excessoAlmocoLabel.classList.remove(
        "text-white",
        "dark:text-gray-100"
      );
      dom.excessoAlmocoLabel.classList.add(
        "text-yellow-600",
        "dark:text-yellow-400"
      );
    }
  }

  // (ATUALIZADO V41) Lógica do Card de Pausa com Total e Excesso
  if (pausaStartEvent) {
    dom.timeSpans.pausa_start.textContent = pausaStartEvent.time;
    dom.pausaRetornoLabels.classList.remove("hidden");
    dom.pausaStartLabels.classList.add("hidden");
    dom.timeSpans.pausa_end.classList.remove("hidden");
    if (!is_finalized) dom.editButtons.pausa_start.classList.remove("hidden");
  }

  if (pausaEndEvent) {
    dom.timeSpans.pausa_end.textContent = pausaEndEvent.time;
    if (!is_finalized) dom.editButtons.pausa_end.classList.remove("hidden");

    // (NOVO V40) Mostra tempo total de pausa
    if (aggregates.pause_minutes_total > 0) {
      dom.totalPausaLabel.textContent = `Total: ${Math.round(
        aggregates.pause_minutes_total
      )} min`;
      dom.totalPausaLabel.classList.remove("hidden");
    }

    // (INÍCIO DA CORREÇÃO V41) - Mostra Excesso de Pausa
    const countedPause = aggregates.counted_pause_minutes || 0;
    const totalPausa = aggregates.pause_minutes_total || 0;

    if (totalPausa > countedPause) {
      const excessoPausa = totalPausa - countedPause;
      dom.excessoPausaLabel.textContent = `Excesso: ${Math.round(
        excessoPausa
      )} min`;
      dom.excessoPausaLabel.classList.remove("hidden");
      dom.excessoPausaLabel.classList.add("text-red-500");
    } else {
      dom.excessoPausaLabel.classList.add("hidden");
    }
    // (FIM DA CORREÇÃO V41)
  }

  if (saidaEvent) {
    dom.pointButtonContainers.saida.querySelector(
      "span.font-mono"
    ).textContent = saidaEvent.time;
    if (!is_finalized) dom.editButtons.saida.classList.remove("hidden");
  }

  // Atualiza Sugestões
  if (entradaEvent && s) {
    if (dom.suggestedTimeSpans.almoco_saida)
      dom.suggestedTimeSpans.almoco_saida.textContent = `(Sug: ${
        s.saida_almoco_padrao || "--:--"
      })`;

    const almocoSaidaMin = timeToMinutes(s.saida_almoco_padrao);
    if (
      dom.suggestedTimeSpans.almoco_retorno &&
      almocoSaidaMin > 0 &&
      s.tempo_almoco_minutes > 0
    ) {
      dom.suggestedTimeSpans.almoco_retorno.textContent = `(Sug: ${minutesToTime(
        almocoSaidaMin + s.tempo_almoco_minutes
      )})`;
    }
    if (dom.suggestedTimeSpans.saida)
      dom.suggestedTimeSpans.saida.textContent = `(Sug: ${
        minutesToTime(aggregates.saida_sugerida_minutes) || "--:--"
      })`;
  }

  // 7. Atualiza o estado dos botões
  updateButtonStates();

  // 8. Sincroniza o toggle de feriado
  if (dom.toggleHoliday) {
    dom.toggleHoliday.checked = is_holiday;
    dom.toggleHoliday.disabled = is_finalized;
  }

  // 9. Inicia ou para os contadores
  if (almocoSaidaEvent && !almocoRetornoEvent && !is_finalized) {
    startAlmocoCountdown(almocoSaidaEvent.time);
  } else {
    stopAlmocoCountdown();
  }

  // (ATUALIZADO V39) Lógica do contador de Pausa
  if (pausaStartEvent && !pausaEndEvent && !is_finalized) {
    startPausaCountdown(pausaStartEvent.time);
  } else {
    stopPausaCountdown();
  }
}

// (NOVO V30) Controla a UI para dia finalizado
function updateFinalizedUI(is_finalized) {
  if (is_finalized) {
    dom.pointButtonsWrapper.classList.add("hidden");
    dom.saidaSugeridaCard.classList.remove("hidden");
    dom.btnAlterarHorarios.classList.remove("hidden");
    dom.btnViewReport.classList.remove("hidden");
    dom.btnLimparTudo.classList.add("hidden");
    dom.displayFaltam.textContent = "Dia Finalizado.";
    dom.displaySaidaSugeridaHE.classList.add("hidden");
  } else {
    // Estado Padrão (não finalizado)
    dom.pointButtonsWrapper.classList.remove("hidden");
    dom.saidaSugeridaCard.classList.remove("hidden");
    dom.btnAlterarHorarios.classList.add("hidden");
    dom.btnViewReport.classList.add("hidden");
    // Oculta "limpar" por padrão, só aparece ao clicar em "alterar"
    dom.btnLimparTudo.classList.add("hidden");
  }
}

// (ATUALIZADO V39) Máquina de Estado dos Botões
function updateButtonStates() {
  const { events, is_finalized } = state.todayRecord;
  const sortedEvents = [...events].sort(
    (a, b) => timeToMinutes(a.time) - timeToMinutes(b.time)
  );
  const lastEvent =
    sortedEvents.length > 0 ? sortedEvents[sortedEvents.length - 1] : null;

  // Desabilita todos
  Object.values(dom.pointButtonContainers).forEach((container) =>
    container?.classList.add("disabled")
  );

  // Reseta cor do almoço
  dom.pointButtonContainers.almoco?.classList.remove(
    "bg-blue-500",
    "shadow-blue-500/30"
  );
  dom.pointButtonContainers.almoco?.classList.add(
    "bg-yellow-500",
    "shadow-yellow-500/30"
  );

  // (NOVO V39) Reseta cor da pausa
  dom.pointButtonContainers.pausa?.classList.remove(
    "bg-blue-500",
    "shadow-blue-500/30"
  );
  dom.pointButtonContainers.pausa?.classList.add(
    "bg-gray-800",
    "shadow-gray-800/30"
  );

  if (is_finalized) {
    // Se finalizado, habilita apenas os botões preenchidos (para ver)
    if (events.find((e) => e.type === "entrada"))
      dom.pointButtonContainers.entrada?.classList.remove("disabled");
    if (events.find((e) => e.type === "almoco_saida"))
      dom.pointButtonContainers.almoco?.classList.remove("disabled");
    if (events.find((e) => e.type.startsWith("pausa_")))
      dom.pointButtonContainers.pausa?.classList.remove("disabled");
    if (events.find((e) => e.type === "saida"))
      dom.pointButtonContainers.saida?.classList.remove("disabled");
    return;
  }

  function enableButton(type) {
    const container = dom.pointButtonContainers[type];
    if (container) container.classList.remove("disabled");
  }

  if (!lastEvent) {
    enableButton("entrada");
    return;
  }

  // Lógica principal de habilitação
  switch (lastEvent.type) {
    case "entrada":
    case "almoco_retorno":
    case "pausa_end":
      enableButton("almoco");
      enableButton("saida");
      if (state.settings.has_15min_pause) {
        enableButton("pausa");
      }
      break;
    case "almoco_saida":
      enableButton("almoco");
      dom.pointButtonContainers.almoco?.classList.add(
        "bg-blue-500",
        "shadow-blue-500/30"
      );
      dom.pointButtonContainers.almoco?.classList.remove(
        "bg-yellow-500",
        "shadow-yellow-500/30"
      );
      break;
    case "pausa_start":
      enableButton("pausa");
      // (NOVO V39) Muda cor do botão de pausa para azul
      dom.pointButtonContainers.pausa?.classList.add(
        "bg-blue-500",
        "shadow-blue-500/30"
      );
      dom.pointButtonContainers.pausa?.classList.remove(
        "bg-gray-800",
        "shadow-gray-800/30"
      );
      enableButton("saida");
      break;
    case "saida":
      enableButton("saida");
      break;
  }

  // Regras de desabilitação
  if (events.find((e) => e.type === "entrada"))
    dom.pointButtonContainers["entrada"]?.classList.add("disabled");

  if (events.find((e) => e.type === "saida")) {
    Object.values(dom.pointButtonContainers).forEach((container) => {
      if (container?.id !== "btn-container-saida") {
        container?.classList.add("disabled");
      }
    });
    enableButton("saida");
  }

  if (events.find((e) => e.type === "almoco_retorno")) {
    dom.pointButtonContainers.almoco?.classList.add("disabled");
  }

  // (NOVO V39) Desabilita pausa se já foi usada
  if (events.find((e) => e.type === "pausa_end")) {
    dom.pointButtonContainers.pausa?.classList.add("disabled");
  }
}

// *** (ATUALIZADO) Lógica de Contadores Regressivos ***
function startAlmocoCountdown(startTime) {
  if (state.almocoCountdownInterval)
    clearInterval(state.almocoCountdownInterval);

  const tempoAlmocoMin = state.settings.tempo_almoco_minutes || 60;
  const saidaMin = timeToMinutes(startTime);
  const retornoMin = saidaMin + tempoAlmocoMin;
  const horarioRetornoStr = minutesToTime(retornoMin);

  // (NOVO) Usa os seletores corretos
  const elCountdown = dom.countdownAlmoco;
  const elRetorno = dom.horarioRetornoAlmoco;
  if (!elCountdown || !elRetorno) return;

  elCountdown.classList.remove("hidden");
  elRetorno.classList.remove("hidden");
  elRetorno.textContent = `(Retorno: ${horarioRetornoStr})`;

  state.almocoCountdownInterval = setInterval(() => {
    const agoraMin = timeToMinutes(new Date().toTimeString().substring(0, 5));
    let diffSec = (retornoMin - agoraMin) * 60 - new Date().getSeconds();

    if (diffSec <= 0) {
      diffSec = Math.abs(diffSec);
      const horas = Math.floor(diffSec / 3600);
      diffSec %= 3600;
      const minutos = Math.floor(diffSec / 60);
      const segundos = diffSec % 60;
      elCountdown.textContent = `Estourado: ${String(horas).padStart(
        2,
        "0"
      )}:${String(minutos).padStart(2, "0")}:${String(segundos).padStart(
        2,
        "0"
      )}`;
      elCountdown.classList.add("text-red-500", "font-bold");
      elCountdown.classList.remove("text-default", "dark:text-gray-100");
    } else {
      const horas = Math.floor(diffSec / 3600);
      diffSec %= 3600;
      const minutos = Math.floor(diffSec / 60);
      const segundos = diffSec % 60;

      elCountdown.textContent = `Retorno em: ${String(horas).padStart(
        2,
        "0"
      )}:${String(minutos).padStart(2, "0")}:${String(segundos).padStart(
        2,
        "0"
      )}`;
      elCountdown.classList.remove("text-red-500", "font-bold");
      elCountdown.classList.add("text-default", "dark:text-gray-100");
    }
  }, 1000);
}

function stopAlmocoCountdown() {
  if (state.almocoCountdownInterval)
    clearInterval(state.almocoCountdownInterval);
  state.almocoCountdownInterval = null;
  if (dom.countdownAlmoco) dom.countdownAlmoco.classList.add("hidden");
  if (dom.horarioRetornoAlmoco)
    dom.horarioRetornoAlmoco.classList.add("hidden");
}

function startPausaCountdown(startTime) {
  if (state.pausaCountdownInterval) clearInterval(state.pausaCountdownInterval);

  const saidaMin = timeToMinutes(startTime);
  const retornoMin = saidaMin + PAUSA_MINUTES;
  const horarioRetornoStr = minutesToTime(retornoMin);

  const elCountdown = dom.countdownPausa;
  const elRetorno = dom.horarioRetornoPausa;
  if (!elCountdown || !elRetorno) return;

  elCountdown.classList.remove("hidden");
  elRetorno.classList.remove("hidden");
  elRetorno.textContent = `(Retorno: ${horarioRetornoStr})`;

  state.pausaCountdownInterval = setInterval(() => {
    const agoraMin = timeToMinutes(new Date().toTimeString().substring(0, 5));
    let diffSec = (retornoMin - agoraMin) * 60 - new Date().getSeconds();

    if (diffSec <= 0) {
      diffSec = Math.abs(diffSec);
      const horas = Math.floor(diffSec / 3600);
      diffSec %= 3600;
      const minutos = Math.floor(diffSec / 60);
      const segundos = diffSec % 60;
      elCountdown.textContent = `Estourado: ${String(horas).padStart(
        2,
        "0"
      )}:${String(minutos).padStart(2, "0")}:${String(segundos).padStart(
        2,
        "0"
      )}`;
      elCountdown.classList.add("text-red-500", "font-bold");
      elCountdown.classList.remove("text-default", "dark:text-gray-100");
    } else {
      const horas = Math.floor(diffSec / 3600);
      diffSec %= 3600;
      const minutos = Math.floor(diffSec / 60);
      const segundos = diffSec % 60;
      elCountdown.textContent = `Retorno em: ${String(horas).padStart(
        2,
        "0"
      )}:${String(minutos).padStart(2, "0")}:${String(segundos).padStart(
        2,
        "0"
      )}`;
      elCountdown.classList.remove("text-red-500", "font-bold");
      elCountdown.classList.add("text-default", "dark:text-gray-100");
    }
  }, 1000);
}

function stopPausaCountdown() {
  if (state.pausaCountdownInterval) clearInterval(state.pausaCountdownInterval);
  state.pausaCountdownInterval = null;
  if (dom.countdownPausa) dom.countdownPausa.classList.add("hidden");
  if (dom.horarioRetornoPausa) dom.horarioRetornoPausa.classList.add("hidden");
}

// --- Lógica do Modal ---

// (NOVO) Lógica de clique unificada para o almoço
function handleAlmocoClick() {
  const { events } = state.todayRecord;
  const almocoSaidaEvent = events.find((e) => e.type === "almoco_saida");

  if (!almocoSaidaEvent) {
    // Se não saiu para o almoço, registra a SAÍDA
    openModal("almoco_saida");
  } else {
    // Se já saiu, registra o RETORNO
    openModal("almoco_retorno");
  }
}

// (NOVO V39) Lógica de clique unificada para a Pausa
function handlePausaClick() {
  const { events } = state.todayRecord;
  const pausaStartEvent = events.find((e) => e.type === "pausa_start");

  if (!pausaStartEvent) {
    // Se não saiu para a pausa, registra a SAÍDA
    openModal("pausa_start");
  } else {
    // Se já saiu, registra o RETORNO
    openModal("pausa_end");
  }
}

// (ATUALIZADO V40) Lógica do Novo Modal de Retorno
function openReturnTimeModal(title, returnTime) {
  dom.modalReturnTitle.textContent = title;
  dom.modalReturnTimeDisplay.textContent = returnTime;
  dom.modalReturnTime.classList.remove("hidden");
}

// (ATUALIZADO V39) Lógica do Modal de Registro
function openModal(action, existingTime = null) {
  let isEditMode = action.startsWith("edit_");
  let eventType;
  let originalTime = null;

  if (isEditMode) {
    eventType = action.substring(5);
    originalTime = existingTime;
    state.currentModalData = {
      type: eventType,
      isEdit: true,
      originalTime: originalTime,
    };
  } else {
    // (REMOVIDO V39) Lógica antiga do 'pausa_toggle'
    eventType = action;
    state.currentModalData = { type: eventType, isEdit: false };
  }

  const now = new Date();
  const timeNow = now.toTimeString().substring(0, 5);

  let title = eventType.replace(/_/g, " ");
  title = title.charAt(0).toUpperCase() + title.slice(1);

  // (NOVO V39) Ajusta título da pausa
  if (eventType === "pausa_start") title = "Saída p/ Pausa (15min)";
  if (eventType === "pausa_end") title = "Retorno da Pausa";

  if (isEditMode) {
    dom.modalTitle.textContent = `Editar ${title}`;
    dom.modalInputTime.value = existingTime;
    dom.modalBtnNow.classList.add("hidden");
    dom.modalOrDivider.classList.add("hidden");
    if (state.isMobile) {
      state.virtualInputValue = existingTime.replace(":", "");
      dom.modalInputTime.value = existingTime;
    }
  } else {
    dom.modalTitle.textContent = `Registrar ${title}`;
    dom.modalInputTime.value = timeNow;
    dom.modalBtnNow.textContent = `Agora (${timeNow})`;
    dom.modalBtnNow.classList.remove("hidden");
    dom.modalOrDivider.classList.remove("hidden");
    if (state.isMobile) {
      state.virtualInputValue = ""; // Reseta o valor do teclado
      dom.modalInputTime.value = "--:--"; // Mostra o placeholder
    }
  }

  dom.modalPointRecord.classList.remove("hidden");
}

function closeModal(modalElement) {
  if (modalElement) {
    modalElement.classList.add("hidden");
  }
}

function openFinalizeModal(eventData) {
  state.currentModalData = eventData;
  dom.modalFinalizeDay.classList.remove("hidden");
}

// (ATUALIZADO V34) handleFinalizeDay agora atualiza o resumo mensal
async function handleFinalizeDay(finalize) {
  const eventData = state.currentModalData;
  closeModal(dom.modalFinalizeDay);

  if (!eventData || !eventData.type) {
    console.error("Erro: Dados do evento de saída inválidos.", eventData);
    state.currentModalData = null;
    return;
  }

  try {
    console.log("Enviando evento de SAIDA para API...");
    const payload = {
      type: eventData.type,
      time: eventData.time,
      is_manual: eventData.isManual,
      isEdit: false,
      originalTime: null,
    };
    const updatedRecordAfterSave = await apiFetch("/api/point", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    state.todayRecord = updatedRecordAfterSave || state.todayRecord;
    console.log("Registro com SAIDA salvo:", state.todayRecord);
  } catch (error) {
    console.error("Erro ao salvar o ponto de SAIDA:", error);
    alert(`Erro ao salvar ponto de saída: ${error.message}.`);
    state.currentModalData = null;
    refreshDashboardUI();
    return;
  }

  if (finalize) {
    try {
      // (NOVO V30) Avisa o servidor que o dia foi finalizado
      await apiFetch("/api/point/finalize", { method: "PUT" });
      state.todayRecord.is_finalized = true;

      // (INÍCIO DA CORREÇÃO V34)
      // Força o recarregamento do resumo mensal do banco
      await loadMonthlySummary();
      // (FIM DA CORREÇÃO V34)

      stopDigitalClock();
      console.log("Timer parado devido à finalização.");

      refreshDashboardUI(); // Atualiza a UI com o resumo mensal
      populateDailyReport();
      dom.modalDailyReport.classList.remove("hidden");
    } catch (error) {
      console.error("Erro ao FINALIZAR o dia:", error);
      alert(
        `Erro ao finalizar o dia: ${error.message}. O dia não foi marcado como 'finalizado'.`
      );
      state.todayRecord.is_finalized = false; // Garante que o estado local está correto
      refreshDashboardUI();
    }
  }

  state.currentModalData = null;
}

// (ATUALIZADO V42) Preenche o modal de relatório
function populateDailyReport() {
  const { aggregates, events } = state.todayRecord;
  const s = state.settings;
  if (!aggregates || !s) return;

  const dateParts = state.todayRecord.date.split("-");
  const reportJsDate = new Date(
    Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2])
  );
  dom.reportDate.textContent = reportJsDate.toLocaleDateString("pt-BR", {
    dateStyle: "full",
    timeZone: "UTC",
  });

  dom.reportEventsList.innerHTML = "";
  const sortedEvents = [...events].sort(
    (a, b) => timeToMinutes(a.time) - timeToMinutes(b.time)
  );
  sortedEvents.forEach((event) => {
    const li = document.createElement("li");
    let typeName = event.type.replace(/_/g, " ");
    typeName = typeName.charAt(0).toUpperCase() + typeName.slice(1);
    li.textContent = `${typeName}: ${event.time}`;
    dom.reportEventsList.appendChild(li);
  });

  if (aggregates.atraso_minutes > 0) {
    const li = document.createElement("li");
    li.textContent = `Atraso: ${aggregates.atraso_minutes} min`;
    li.className = "text-red-500 font-medium";
    dom.reportEventsList.appendChild(li);
  }

  dom.reportJornada.textContent = `${s.jornada_diaria_minutes || 0} min`;
  dom.reportTotalTrabalhado.textContent = `${Math.round(
    aggregates.effective_worked_minutes || 0
  )} min`;
  dom.reportTotalAlmoco.textContent = `${Math.round(
    aggregates.almoco_minutes_total || 0
  )} min`;
  dom.reportTotalPausas.textContent = `${Math.round(
    aggregates.pause_minutes_total || 0
  )} min (Contado: ${Math.round(aggregates.counted_pause_minutes || 0)} min)`;

  const totalHE =
    (aggregates.extra_minutes || 0) + (aggregates.estourado_minutes || 0);

  if (totalHE > 0) {
    dom.reportHeDeficit.textContent = `+${Math.round(totalHE)} min (HE)`;
    dom.reportHeDeficit.className = "font-bold text-green-500";
  } else if (aggregates.deficit_minutes > 0) {
    dom.reportHeDeficit.textContent = `-${Math.round(
      aggregates.deficit_minutes
    )} min (Déficit)`;
    dom.reportHeDeficit.className = "font-bold text-red-500";
  } else {
    dom.reportHeDeficit.textContent = `0 min`;
    dom.reportHeDeficit.className = "font-bold text-default";
  }

  // (REMOVIDO V42) - A lógica de estourado agora está inclusa no totalHE
  dom.reportEstouradoContainer.classList.add("hidden");

  const totalFarm =
    (aggregates.farm_jornada_value || 0) +
    (aggregates.farm_he_value || 0) +
    (aggregates.farm_estourado_value || 0) +
    (aggregates.farm_adicional_noturno_value || 0) +
    (aggregates.farm_adicional_feriado_value || 0);
  dom.reportFarmTotal.textContent = formatCurrency(totalFarm);
}

// (ATUALIZADO V40) Agora chama o novo modal de retorno
async function recordPoint(time) {
  if (!state.currentModalData) {
    console.error("Tentativa de registrar ponto sem dados do modal.");
    closeModal(dom.modalPointRecord);
    return;
  }

  const modalDataCopy = { ...state.currentModalData };
  const { type, isEdit, isNow, originalTime } = modalDataCopy;
  const isManual = !isNow;

  console.log(
    `Chamando API para: ${type} @ ${time}, Manual: ${isManual}, Edit: ${isEdit}, Original: ${originalTime}`
  );

  // (NOVO V30) Validação do formato HH:MM
  if (!/^[0-2][0-9]:[0-5][0-9]$/.test(time)) {
    alert("Formato de hora inválido. Use HH:MM.");
    return;
  }

  if (type === "saida" && !isEdit) {
    closeModal(dom.modalPointRecord);
    openFinalizeModal({ type, time, isManual });
    return;
  }

  try {
    const payload = { type, time, is_manual: isManual, isEdit, originalTime };
    const updatedRecord = await apiFetch("/api/point", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    state.todayRecord = updatedRecord || state.todayRecord;
    console.log("Registro atualizado recebido do backend:", state.todayRecord);

    // (INÍCIO DA CORREÇÃO V40) - Substitui alert() por modal
    if (!isEdit) {
      if (type === "pausa_start") {
        const returnTime = minutesToTime(timeToMinutes(time) + PAUSA_MINUTES);
        openReturnTimeModal("Pausa de 15min iniciada", returnTime);
      } else if (type === "almoco_saida") {
        const tempoAlmoco = state.settings.tempo_almoco_minutes || 60;
        const returnTime = minutesToTime(timeToMinutes(time) + tempoAlmoco);
        openReturnTimeModal("Saída p/ Almoço registrada", returnTime);
      }
    }
    // (FIM DA CORREÇÃO V40)
  } catch (error) {
    console.error("Erro ao registrar ponto via API:", error);
    alert(`Erro ao salvar ponto: ${error.message}`);
    await loadTodayRecord();
  } finally {
    closeModal(dom.modalPointRecord);
    state.currentModalData = null;
    refreshDashboardUI();
  }
}

// (ATUALIZADO V42) Lida com padding do toggle
async function handleToggleHoliday() {
  if (!dom.toggleHoliday) return;
  const newHolidayState = dom.toggleHoliday.checked;

  try {
    const updatedRecord = await apiFetch("/api/point/holiday", {
      method: "PUT",
      body: JSON.stringify({ is_holiday: newHolidayState }),
    });

    state.todayRecord = updatedRecord;
    console.log("Estado de feriado atualizado pelo backend.");
  } catch (error) {
    console.error("Erro ao atualizar feriado:", error.message);
    alert(`Erro ao salvar feriado: ${error.message}`);
    state.todayRecord.is_holiday = !newHolidayState;
    dom.toggleHoliday.checked = !newHolidayState;
  } finally {
    refreshDashboardUI();
  }
}

// --- Lógica de Autenticação ---
function storeToken(token) {
  state.authToken = token;
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}
// (ATUALIZADO V29) Limpa o state global
function clearToken() {
  state.authToken = null;
  state.user = null;
  localStorage.removeItem(TOKEN_STORAGE_KEY);

  // Reseta o estado
  state.settings = {};
  state.todayRecord = {
    date: new Date().toISOString().split("T")[0],
    events: [],
    aggregates: {},
    is_holiday: false,
    is_finalized: false,
  };
  state.monthlySummary = {
    total_farm_extra: 0,
    total_extra_minutes: 0,
    total_farm: 0,
  }; // (V38)
}
// (ATUALIZADO V29) Login usa 'loginInput' e limpa o state
async function handleLogin(event) {
  event.preventDefault();
  loginError.textContent = "";

  // (CORREÇÃO V29) Lê os valores ANTES de limpar o token
  const login = loginInput.value.trim(); // (MUDANÇA)
  const password = loginPasswordInput.value;

  // (CORREÇÃO V29) Limpa o estado antigo antes de logar
  clearToken();
  // (REMOVIDO) showLoginPage() daqui para não limpar os campos

  const passwordToSend = password || "dummy";
  const isAttemptFirstLogin = !password;

  try {
    const response = await fetch(API_URL + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, password: passwordToSend }), // (MUDANÇA)
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `Erro ${response.status}`);

    storeToken(data.token);
    state.user = data.user;

    if (state.user.firstLogin) {
      openSetPasswordModal();
    } else if (isAttemptFirstLogin && !state.user.firstLogin) {
      clearToken();
      loginError.textContent = "Senha é obrigatória.";
    } else {
      showMainContent();
      const success = await initializeApp();
      if (success) {
        router();
      }
    }
  } catch (error) {
    console.error("Erro no login:", error);
    loginError.textContent =
      error.message.includes("Credenciais inválidas") ||
      error.message.includes("required")
        ? "Login ou Senha inválidos."
        : "Erro ao tentar fazer login.";
    clearToken();
  }
}
function handleLogout() {
  clearToken();
  showLoginPage();
  stopDigitalClock();
  stopAlmocoCountdown();
  stopPausaCountdown();
  window.location.hash = "";
}

// --- Lógica Modais de Senha ---
function openSetPasswordModal() {
  dom.setPasswordStatus.textContent = "";
  dom.setNewPasswordInput.value = "";
  dom.setRepeatPasswordInput.value = "";
  loginPage.classList.add("hidden");
  mainContentContainer.classList.add("hidden");
  dom.modalSetPassword.classList.remove("hidden");
}
async function handleSetPassword(event) {
  event.preventDefault();
  dom.setPasswordStatus.textContent = "";
  dom.setPasswordStatus.classList.remove("text-red-500", "text-green-500");
  const newPassword = dom.setNewPasswordInput.value;
  const repeatPassword = dom.setRepeatPasswordInput.value;

  if (newPassword !== repeatPassword) {
    dom.setPasswordStatus.textContent = "As senhas não conferem.";
    dom.setPasswordStatus.classList.add("text-red-500");
    return;
  }
  if (newPassword.length < 6) {
    dom.setPasswordStatus.textContent =
      "Senha muito curta (mínimo 6 caracteres).";
    dom.setPasswordStatus.classList.add("text-red-500");
    return;
  }

  try {
    await apiFetch("/api/auth/set-password", {
      method: "PUT",
      body: JSON.stringify({ newPassword, repeatPassword }),
    });
    closeModal(dom.modalSetPassword);
    alert("Senha definida! Faça o login novamente com sua nova senha.");
    handleLogout();
  } catch (error) {
    dom.setPasswordStatus.textContent = `Erro: ${error.message}`;
    dom.setPasswordStatus.classList.add("text-red-500");
  }
}
function openChangePasswordModal() {
  dom.changePasswordStatus.textContent = "";
  dom.changeCurrentPasswordInput.value = "";
  dom.changeNewPasswordInput.value = "";
  dom.changeRepeatPasswordInput.value = "";
  dom.modalChangePassword.classList.remove("hidden");
}
async function handleChangePassword(event) {
  event.preventDefault();
  dom.changePasswordStatus.textContent = "";
  dom.changePasswordStatus.classList.remove("text-red-500", "text-green-500");
  const currentPassword = dom.changeCurrentPasswordInput.value;
  const newPassword = dom.changeNewPasswordInput.value;
  const repeatPassword = dom.changeRepeatPasswordInput.value;

  if (newPassword !== repeatPassword) {
    dom.changePasswordStatus.textContent = "As novas senhas não conferem.";
    dom.changePasswordStatus.classList.add("text-red-500");
    return;
  }
  if (newPassword.length < 6) {
    dom.changePasswordStatus.textContent = "Nova senha muito curta (mín. 6).";
    dom.changePasswordStatus.classList.add("text-red-500");
    return;
  }
  if (!currentPassword) {
    dom.changePasswordStatus.textContent = "Senha atual é obrigatória.";
    dom.changePasswordStatus.classList.add("text-red-500");
    return;
  }

  try {
    await apiFetch("/api/auth/change-password", {
      method: "PUT",
      body: JSON.stringify({ currentPassword, newPassword, repeatPassword }),
    });
    closeModal(dom.modalChangePassword);
    alert("Senha alterada com sucesso!");
  } catch (error) {
    dom.changePasswordStatus.textContent = `Erro: ${error.message}`;
    dom.changePasswordStatus.classList.add("text-red-500");
  }
}

// --- Lógica do Admin Panel ---
async function loadUsers() {
  dom.userListContainer.innerHTML =
    '<p class="text-muted">Carregando usuários...</p>';
  try {
    const users = await apiFetch("/api/admin/users");
    state.adminUserList = users || [];
    renderAdminUserList();
  } catch (error) {
    dom.userListContainer.innerHTML = `<p class="text-red-500">Erro ao carregar usuários: ${error.message}</p>`;
  }
}
function renderAdminUserList() {
  dom.userListContainer.innerHTML = "";
  if (state.adminUserList.length === 0) {
    dom.userListContainer.innerHTML =
      '<p class="text-muted">Nenhum outro usuário encontrado.</p>';
    return;
  }

  const list = document.createElement("ul");
  list.className = "divide-y divide-gray-200 dark:divide-gray-700";

  state.adminUserList.forEach((user) => {
    if (state.user && user.userId === state.user.userId) return;
    const li = document.createElement("li");
    li.className = "py-3 flex justify-between items-center";
    const firstLoginBadge = user.is_first_login
      ? '<span class="ml-2 text-xs bg-yellow-200 text-yellow-800 px-1.5 py-0.5 rounded-full">1º Login</span>'
      : "";
    li.innerHTML = `
             <div>
                 <p class="font-medium text-default">${
                   user.name || "Sem nome"
                 }${firstLoginBadge}</p>
                 <p class="text-xs text-muted">${user.login} (${user.role})</p>
             </div>
             <button class="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded disabled:opacity-50" onclick="viewUserRecords(${
               user.userId
             })" ${
      user.is_first_login
        ? 'disabled title="Usuário ainda não definiu senha"'
        : ""
    }>Ver Registros</button>
         `;
    list.appendChild(li);
  });
  dom.userListContainer.appendChild(list);
}
function viewUserRecords(userId) {
  alert(`Funcionalidade "Ver Registros" para usuário ${userId} em breve.`);
}
// (ATUALIZADO V29) Cria usuário com 'login'
async function handleCreateUser(event) {
  event.preventDefault();
  dom.createUserStatus.textContent = "";
  dom.createUserStatus.classList.remove("text-red-500", "text-green-500");

  const name = dom.createUserNameInput.value;
  const login = dom.createUserLoginInput.value;
  const email = dom.createUserEmailInput.value;
  const role = dom.createUserRoleInput.value;

  if (!name || !login) {
    dom.createUserStatus.textContent = "Nome e Login são obrigatórios.";
    dom.createUserStatus.classList.add("text-red-500");
    return;
  }
  if (email && !/\S+@\S+\.\S+/.test(email)) {
    dom.createUserStatus.textContent = "Email inválido.";
    dom.createUserStatus.classList.add("text-red-500");
    return;
  }

  try {
    await apiFetch("/api/admin/users", {
      method: "POST",
      body: JSON.stringify({ name, login, email, role }),
    });
    dom.createUserStatus.textContent =
      "Usuário criado! Peça para ele fazer o primeiro login.";
    dom.createUserStatus.classList.add("text-green-500");
    dom.createUserForm.reset();
    loadUsers();
    setTimeout(() => (dom.createUserStatus.textContent = ""), 5000);
  } catch (error) {
    dom.createUserStatus.textContent = `Erro: ${error.message}`;
    dom.createUserStatus.classList.add("text-red-500");
  }
}

// --- Funções de Controle de UI ---
function showLoginPage() {
  mainContentContainer.classList.add("hidden");
  if (appNav) appNav.classList.add("hidden");
  loginPage.classList.remove("hidden");
  loginInput.value = "";
  loginPasswordInput.value = "";
  loginError.textContent = "";
}
function showMainContent() {
  loginPage.classList.add("hidden");
  mainContentContainer.classList.remove("hidden");
  if (appNav) appNav.classList.remove("hidden");
}

// (ATUALIZADO V34)
async function initializeApp() {
  if (!state.authToken) return handleLogout(); // Safety check
  try {
    cacheSelectors();
    await loadSettings();
    await loadTodayRecord();
    await loadMonthlySummary();

    // (INÍCIO DA CORREÇÃO V34)
    // Força o recálculo do dia APÓS carregar os dados,
    // garantindo que a meta (ex: R$ 70,75) esteja correta.
    await forceDayRecalculation();
    // (FIM DA CORREÇÃO V34)

    bindAppEventListeners();
    return true; // Sucesso
  } catch (error) {
    console.error("Falha ao inicializar app:", error);
    return false; // Falha
  }
}

// --- Roteador ---
function router() {
  // (CORREÇÃO) Garante que os seletores DOM estão cacheados antes de tentar usá-los
  if (!dom.pageDashboard) {
    cacheSelectors();
  }

  if (!state.user && !state.authToken) {
    if (localStorage.getItem(TOKEN_STORAGE_KEY)) clearToken();
    showLoginPage();
    // Garante que as páginas internas fiquem ocultas
    if (dom.allMainPages) {
      dom.allMainPages.forEach((page) => page?.classList.add("hidden"));
    }
    return;
  }
  showMainContent();

  const path = window.location.hash || "#/";
  updateNavUI(path);
  dom.allMainPages.forEach((page) => page?.classList.add("hidden"));

  if (state.user?.role === "admin") {
    dom.btnAdminPanel.classList.remove("hidden");
  } else {
    dom.btnAdminPanel.classList.add("hidden");
  }

  if (path === "#/" || path === "") {
    if (dom.pageDashboard) dom.pageDashboard.classList.remove("hidden");
    refreshDashboardUI();
    updateHeaderDate();
    if (!state.digitalClockInterval && !state.todayRecord.is_finalized) {
      startDigitalClock();
    }
  } else {
    stopDigitalClock();
    stopAlmocoCountdown();
    stopPausaCountdown();

    if (path === "#/mes" && dom.pageMes) {
      dom.pageMes.classList.remove("hidden");
      initMesPage();
    } else if (path === "#/alarmes" && dom.pageAlarmes) {
      dom.pageAlarmes.classList.remove("hidden");
    } else if (path === "#/settings" && dom.pageSettings) {
      dom.pageSettings.classList.remove("hidden");
      populateSettingsForm();
    } else if (
      path === "#/admin" &&
      dom.pageAdmin &&
      state.user?.role === "admin"
    ) {
      dom.pageAdmin.classList.remove("hidden");
      loadUsers();
    } else {
      window.location.hash = "#/";
      if (dom.pageDashboard) dom.pageDashboard.classList.remove("hidden");
      refreshDashboardUI();
      updateHeaderDate();
      if (!state.digitalClockInterval && !state.todayRecord.is_finalized) {
        startDigitalClock();
      }
    }
  }
}

// *** (ATUALIZADO V42) Liga todos os listeners ***
function bindAppEventListeners() {
  if (state.listenersBound) return;
  console.log("Ligando listeners da aplicação...");

  window.addEventListener("hashchange", router);
  dom.settingsForm.addEventListener("submit", handleSaveSettings);
  
  if (dom.btnDias) {
    dom.btnDias.forEach(btn => {
      btn.addEventListener("click", () => {
        const isActive = btn.dataset.active === "1";
        if (isActive) {
          btn.dataset.active = "0";
          btn.classList.remove("bg-blue-500", "text-white");
          btn.classList.add("text-muted", "bg-transparent");
        } else {
          btn.dataset.active = "1";
          btn.classList.add("bg-blue-500", "text-white");
          btn.classList.remove("text-muted", "bg-transparent");
        }
      });
    });
  }
  
  if (dom.btnDias) {
    dom.btnDias.forEach(btn => {
      btn.addEventListener("click", () => {
        const isActive = btn.dataset.active === "1";
        if (isActive) {
          btn.dataset.active = "0";
          btn.classList.remove("bg-blue-500", "text-white");
          btn.classList.add("text-muted", "bg-transparent");
        } else {
          btn.dataset.active = "1";
          btn.classList.add("bg-blue-500", "text-white");
          btn.classList.remove("text-muted", "bg-transparent");
        }
      });
    });
  }
  dom.btnShare.addEventListener("click", () =>
    alert("Compartilhamento (RF6) em breve.")
  );
  dom.toggleHoliday.addEventListener("change", handleToggleHoliday);
  dom.setPasswordForm.addEventListener("submit", handleSetPassword);
  dom.changePasswordForm.addEventListener("submit", handleChangePassword);
  dom.btnCancelChangePassword.addEventListener("click", () =>
    closeModal(dom.modalChangePassword)
  );
  dom.btnChangePassword.addEventListener("click", openChangePasswordModal);
  dom.btnLogout.addEventListener("click", handleLogout);
  dom.btnAdminPanel.addEventListener(
    "click",
    () => (window.location.hash = "#/admin")
  );
  dom.btnBackToSettings.addEventListener(
    "click",
    () => (window.location.hash = "#/settings")
  );
  dom.createUserForm.addEventListener("submit", handleCreateUser);

  // Listeners dos Modais
  dom.modalBtnCancel.addEventListener("click", () =>
    closeModal(dom.modalPointRecord)
  );
  dom.btnCloseModalReturn.addEventListener("click", () =>
    // (V40)
    closeModal(dom.modalReturnTime)
  );

  dom.modalBtnNow.addEventListener("click", () => {
    if (state.currentModalData) state.currentModalData.isNow = true;
    const now = new Date().toTimeString().substring(0, 5);
    recordPoint(now);
  });

  // (ATUALIZADO V30) Submit manual agora usa a lógica do teclado virtual
  dom.modalFormManual.addEventListener("submit", (e) => {
    e.preventDefault();
    if (state.currentModalData) state.currentModalData.isNow = false;

    let time;
    if (state.isMobile) {
      // No mobile, o valor vem do estado interno do teclado
      // (CORREÇÃO) O valor no estado JÁ ESTÁ HH:MM (vS. HHMM)
      time = state.virtualInputValue;
    } else {
      // No desktop, vem direto do input
      time = dom.modalInputTime.value;
    }

    if (!time) {
      alert("Horário manual não pode estar vazio.");
      return;
    }
    // (CORREÇÃO) A validação agora é a mesma para mobile e desktop
    if (!/^[0-2][0-9]:[0-5][0-9]$/.test(time)) {
      alert("Formato de hora inválido. Use HH:MM.");
      return;
    }
    recordPoint(time);
  });

  dom.btnFinalizeYes.addEventListener("click", () => handleFinalizeDay(true));
  dom.btnFinalizeNo.addEventListener("click", () => handleFinalizeDay(false));
  dom.btnCloseReport.addEventListener("click", () =>
    closeModal(dom.modalDailyReport)
  );
  dom.btnViewReport.addEventListener("click", () => {
    populateDailyReport();
    dom.modalDailyReport.classList.remove("hidden");
  });

  // (NOVOS Listeners V30)
  dom.btnAlterarHorarios.addEventListener("click", async () => {
    try {
      await apiFetch("/api/point/unfinalize", { method: "PUT" });
      state.todayRecord.is_finalized = false;
      dom.btnLimparTudo.classList.remove("hidden"); // Mostra o botão de limpar

      // (ATUALIZAÇÃO V31) Subtrai os valores do dia do total mensal
      // (CORREÇÃO V34) Só subtrai se os aggregates existirem
      const aggregates = state.todayRecord.aggregates || {};
      if (aggregates.extra_minutes) {
        // (CORREÇÃO V38) Subtrai HE normal + estourada
        state.monthlySummary.total_extra_minutes -=
          (aggregates.extra_minutes || 0) + (aggregates.estourado_minutes || 0);
      }
      // (ATUALIZADO V42) Subtrai valor da HE e Estourado
      if (aggregates.farm_he_value || aggregates.farm_estourado_value) {
        state.monthlySummary.total_farm_extra -=
          (aggregates.farm_he_value || 0) +
          (aggregates.farm_estourado_value || 0);
      }

      refreshDashboardUI(); // Re-desenha a UI no modo "editável"
      startDigitalClock(); // Reinicia o relógio
    } catch (error) {
      alert(`Erro ao reabrir o dia: ${error.message}`);
    }
  });

  dom.btnLimparTudo.addEventListener("click", async () => {
    if (
      confirm(
        "Tem certeza que deseja APAGAR TODOS os registros de hoje? Esta ação não pode ser desfeita."
      )
    ) {
      try {
        const clearedRecord = await apiFetch("/api/point/clear", {
          method: "DELETE",
        });
        state.todayRecord = clearedRecord; // Carrega o registro zerado
        refreshDashboardUI(); // Re-desenha a UI vazia
      } catch (error) {
        alert(`Erro ao limpar registros: ${error.message}`);
      }
    }
  });

  // (NOVO V30) Listener do Toggle CLT
  dom.toggleCLT.addEventListener("change", handleToggleCLT);

  // (CORRIGIDO V30) Listeners do Teclado Virtual
  if (state.isMobile) {
    // Impede o teclado nativo de abrir no mobile
    dom.modalInputTime.addEventListener("focus", (e) => {
      e.target.blur();
    });

    dom.virtualKeyboardBtns.forEach((button) => {
      button.addEventListener("click", () => {
        const key = button.dataset.key;
        let digits = state.virtualInputValue; // Não remove mais o ":"

        if (key === "backspace") {
          // (CORREÇÃO) Se estiver formatado, remove o formato
          if (digits.includes(":")) {
            digits = digits.replace(":", "");
          }
          digits = digits.slice(0, -1);
        } else if (key === "enter") {
          // (CORREÇÃO) Formata o valor antes de submeter
          if (digits.length === 4) {
            state.virtualInputValue = `${digits.slice(0, 2)}:${digits.slice(
              2
            )}`;
            dom.modalInputTime.value = state.virtualInputValue; // Define o valor final
            dom.modalFormManual.dispatchEvent(new Event("submit"));
          } else {
            // Pisca o input para indicar erro
            dom.modalInputTime.classList.add("border-red-500", "animate-pulse");
            setTimeout(
              () =>
                dom.modalInputTime.classList.remove(
                  "border-red-500",
                  "animate-pulse"
                ),
              500
            );
          }
          return; // Para a execução aqui
        } else if (digits.length < 4) {
          // (CORREÇÃO) Se estiver formatado, remove o formato
          if (digits.includes(":")) {
            digits = digits.replace(":", "");
          }
          digits += key;
        }

        // Atualiza o valor interno
        state.virtualInputValue = digits;

        // (CORREÇÃO) Atualiza o VALOR, não o placeholder
        let displayValue = "--:--";
        if (digits.length === 1) displayValue = `${digits}_:__`;
        else if (digits.length === 2) displayValue = `${digits}:__`;
        else if (digits.length === 3)
          displayValue = `${digits.slice(0, 2)}:${digits.slice(2)}_`;
        else if (digits.length === 4)
          displayValue = `${digits.slice(0, 2)}:${digits.slice(2)}`;

        dom.modalInputTime.value = displayValue;
      });
    });
  }

  dom.btnDownloadPng.addEventListener("click", () => {
    html2canvas(dom.reportContent).then((canvas) => {
      const link = document.createElement("a");
      link.download = `relatorio_ponto_${state.todayRecord.date}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    });
  });

  dom.farmBarToggle.addEventListener("click", () => {
    dom.farmBarDetails.classList.toggle("hidden");
    dom.farmBarToggle.classList.toggle("expanded");
  });

  // (ATUALIZADO V42) Listener do Modal de Info (Dinâmico e Completo)
  dom.btnInfoCalculo.addEventListener("click", () => {
    const s = state.settings;
    const agg = state.todayRecord.aggregates;

    // 1. Popula os valores dos Ajustes (Settings)
    dom.infoSettingsSalary.textContent = formatCurrency(s.salary_monthly || 0);
    dom.infoSettingsJornada.textContent = `${
      s.jornada_diaria_minutes || 0
    } min`;
    dom.infoSettingsDias.textContent = s.dias_trabalho_por_semana || 0;

    // 2. Popula os valores Calculados (Aggregates)
    if (agg && Object.keys(agg).length > 0) {
      const valorHora = (agg.valor_por_minuto || 0) * 60;
      const valorHoraExtra = (agg.valor_por_minuto_extra || 0) * 60;
      const valorAdicionalFeriado =
        (agg.valor_por_minuto_adicional_feriado || 0) * 60;

      const valorHoraFeriado = valorHora + valorAdicionalFeriado; // Hora base (1.0x) + Adicional (1.0x) = 2.0x
      const valorHoraHEFeriado = valorHoraExtra + valorAdicionalFeriado; // (V42) - H-Extra (1.5x) + Adicional (1.0x) = 2.5x -> (CORREÇÃO LÓGICA 3X)
      const valorHoraHEFeriado_corrigido =
        valorHoraFeriado * (s.multiplicador_hora_extra || 1.5); // (2.0x * 1.5x = 3.0x)

      const valorHoraNoturno =
        valorHora * (1 + (s.adicional_noturno_percent || 0) / 100);

      const valorDiaBase = valorHora * (s.jornada_diaria_minutes / 60);
      const valorDiaFeriado =
        valorHoraFeriado * (s.jornada_diaria_minutes / 60);

      const valorDiaCompleto =
        valorDiaBase + valorHoraExtra * (s.max_he_minutes / 60);
      const valorDiaCompletoFeriado =
        valorDiaFeriado +
        valorHoraHEFeriado_corrigido * (s.max_he_minutes / 60);

      dom.infoValorDia.textContent = formatCurrency(valorDiaBase);
      dom.infoValorDiaFeriado.textContent = formatCurrency(valorDiaFeriado);
      dom.infoValorDiaCompleto.textContent = formatCurrency(valorDiaCompleto);
      dom.infoValorDiaCompletoFeriado.textContent = formatCurrency(
        valorDiaCompletoFeriado
      );

      dom.infoValorHora.textContent = formatCurrency(valorHora);
      dom.infoValorHoraHE.textContent = formatCurrency(valorHoraExtra);
      dom.infoValorHoraNoturno.textContent = formatCurrency(valorHoraNoturno);
      dom.infoValorHoraFeriado.textContent = formatCurrency(valorHoraFeriado);
      dom.infoValorHoraHEFeriado.textContent = formatCurrency(
        valorHoraHEFeriado_corrigido
      );
    } else {
      // Reseta se não houver dados
      const fields = [
        dom.infoValorDia,
        dom.infoValorDiaFeriado,
        dom.infoValorDiaCompleto,
        dom.infoValorDiaCompletoFeriado,
        dom.infoValorHora,
        dom.infoValorHoraHE,
        dom.infoValorHoraNoturno,
        dom.infoValorHoraFeriado,
        dom.infoValorHoraHEFeriado,
      ];
      fields.forEach((f) => {
        if (f) f.textContent = "Calculando...";
      });
    }

    dom.modalInfoCalculo.classList.remove("hidden");
  });
  dom.btnCloseInfoCalculo.addEventListener("click", () =>
    closeModal(dom.modalInfoCalculo)
  );

  // (ATUALIZADO V39) Listeners dos Botões de Ponto
  dom.pointButtonContainers.entrada?.addEventListener("click", () =>
    openModal("entrada")
  );
  dom.pointButtonContainers.almoco?.addEventListener("click", () =>
    handleAlmocoClick()
  );
  dom.pointButtonContainers.pausa?.addEventListener("click", () =>
    handlePausaClick()
  );
  dom.pointButtonContainers.saida?.addEventListener("click", () =>
    openModal("saida")
  );

  // (ATUALIZADO V39) Listeners dos Botões de Edição
  Object.keys(dom.editButtons).forEach((key) => {
    const button = dom.editButtons[key];
    if (button) {
      button.addEventListener("click", (e) => {
        e.stopPropagation(); // Impede que o clique dispare o listener do container
        let eventTypeToEdit = key;
        let eventInstance;

        // (CORREÇÃO V39) Pega o evento correto para pausa
        if (key === "pausa_start" || key === "pausa_end") {
          eventInstance = state.todayRecord.events.find(
            (ev) => ev.type === eventTypeToEdit
          );
        } else {
          eventInstance = state.todayRecord.events.find(
            (ev) => ev.type === eventTypeToEdit
          );
        }

        if (eventInstance) {
          openModal("edit_" + eventTypeToEdit, eventInstance.time);
        }
      });
    }
  });

  state.listenersBound = true; // Marca como ligados
}


// =============================================================================
// MÓDULO: TELA MÊS — Painel Mensal
// Projetado para futura migração Firebase (funções puras, sem efeitos colaterais).
// =============================================================================

// --- Estado da Tela Mês ---
const mesState = {
  currentYearMonth: null,   // "YYYY-MM"
  records: [],              // DayRecord[] do mês
  settings: null,           // snapshot das settings
  // Modal do dia
  activeDate: null,         // "YYYY-MM-DD"
  activeInput: null,        // input com foco atual no modal
  mesVirtualValue: "",      // dígitos digitados no teclado virtual do modal
};

// --- Seletores DOM da Tela Mês ---
const mesDom = {};

function cacheMesSelectors() {
  mesDom.pageMes = document.getElementById("page-mes");
  mesDom.titulo = document.getElementById("mes-titulo");
  mesDom.btnPrev = document.getElementById("mes-btn-prev");
  mesDom.btnNext = document.getElementById("mes-btn-next");

  mesDom.valorAtual = document.getElementById("mes-valor-atual");
  mesDom.valorProjetado = document.getElementById("mes-valor-projetado");
  mesDom.valorIdeal = document.getElementById("mes-valor-ideal");
  mesDom.perdaFinanceira = document.getElementById("mes-perda-financeira");
  mesDom.cardMesAtual = document.getElementById("card-mes-atual");
  mesDom.cardMesProjetado = document.getElementById("card-mes-projetado");
  mesDom.cardMesIdeal = document.getElementById("card-mes-ideal");
  mesDom.modalMesInfo = document.getElementById("modal-mes-info");
  mesDom.modalMesInfoTitle = document.getElementById("modal-mes-info-title");
  mesDom.modalMesInfoContent = document.getElementById("modal-mes-info-content");
  mesDom.modalMesInfoClose = document.getElementById("modal-mes-info-close");
  mesDom.modalMesInfoOk = document.getElementById("modal-mes-info-ok");
  mesDom.modalDayFolga = document.getElementById("modal-day-folga");
  mesDom.tempoPerdido = document.getElementById("mes-tempo-perdido");
  mesDom.tempoCompensado = document.getElementById("mes-tempo-compensado");

  mesDom.barIdeal = document.getElementById("mes-bar-ideal");
  mesDom.labelIdeal = document.getElementById("mes-label-ideal");
  mesDom.barReal = document.getElementById("mes-bar-real");
  mesDom.labelReal = document.getElementById("mes-label-real");
  mesDom.barProjetado = document.getElementById("mes-bar-projetado");
  mesDom.labelProjetado = document.getElementById("mes-label-projetado");

  mesDom.calendario = document.getElementById("mes-calendario");

  mesDom.heRealizado = document.getElementById("mes-he-realizado");
  mesDom.heEsperado = document.getElementById("mes-he-esperado");
  mesDom.diasPerfeitos = document.getElementById("mes-dias-perfeitos");
  mesDom.diasPerda = document.getElementById("mes-dias-perda");
  mesDom.insights = document.getElementById("mes-insights");

  // Modal do dia
  mesDom.modalDay = document.getElementById("modal-day-details");
  mesDom.modalDayTitulo = document.getElementById("modal-day-titulo");
  mesDom.modalDaySubtitulo = document.getElementById("modal-day-subtitulo");
  mesDom.modalDayClose = document.getElementById("modal-day-close");
  mesDom.modalDayCancel = document.getElementById("modal-day-cancel");
  mesDom.modalDaySave = document.getElementById("modal-day-save");
  mesDom.modalDayFeriado = document.getElementById("modal-day-feriado");
  mesDom.modalDayFolga = document.getElementById("modal-day-folga");
  mesDom.modalDayEntrada = document.getElementById("modal-day-entrada");
  mesDom.modalDayAlmocoSaida = document.getElementById("modal-day-almoco-saida");
  mesDom.modalDayAlmocoRetorno = document.getElementById("modal-day-almoco-retorno");
  mesDom.modalDaySaida = document.getElementById("modal-day-saida");
  mesDom.modalDayTrabalhado = document.getElementById("modal-day-trabalhado");
  mesDom.modalDayHE = document.getElementById("modal-day-he");
  mesDom.modalDayFarm = document.getElementById("modal-day-farm");
    mesDom.modalDayAtrasoInfo = document.getElementById("modal-day-atraso-info");
  mesDom.modalDayAtrasoTxt = document.getElementById("modal-day-atraso-txt");
  mesDom.modalDayDomingo = document.getElementById("modal-day-domingo");
  mesDom.modalDayDomingoContainer = document.getElementById("modal-day-domingo-container");

  mesDom.mesVK = document.getElementById("mes-virtual-keyboard");
  mesDom.mesVKBtns = document.querySelectorAll(".mes-vk-btn");

  // Modal alerta interno
  mesDom.alertModal = document.getElementById("modal-mes-alert");
  mesDom.alertIcon = document.getElementById("modal-mes-alert-icon");
  mesDom.alertTitle = document.getElementById("modal-mes-alert-title");
  mesDom.alertMsg = document.getElementById("modal-mes-alert-msg");
  mesDom.alertOk = document.getElementById("modal-mes-alert-ok");
  mesDom.alertCancel = document.getElementById("modal-mes-alert-cancel");

  // Mapa de inputs do modal (event type → input element)
  mesDom.timeInputs = {
    entrada: mesDom.modalDayEntrada,
    almoco_saida: mesDom.modalDayAlmocoSaida,
    almoco_retorno: mesDom.modalDayAlmocoRetorno,
    saida: mesDom.modalDaySaida,
  };
}

// --- Helper: Alerta Interno (substitui alert/confirm nativos) ---
function mesAlert(msg, title = "Atenção", icon = "⚠️") {
  return new Promise((resolve) => {
    if (!mesDom.alertModal) { alert(msg); resolve(true); return; }
    mesDom.alertIcon.textContent = icon;
    mesDom.alertTitle.textContent = title;
    mesDom.alertMsg.textContent = msg;
    mesDom.alertCancel.classList.add("hidden");
    mesDom.alertOk.className = "w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg";
    mesDom.alertModal.classList.remove("hidden");
    const onOk = () => { mesDom.alertModal.classList.add("hidden"); mesDom.alertOk.removeEventListener("click", onOk); resolve(true); };
    mesDom.alertOk.addEventListener("click", onOk);
  });
}

function mesConfirm(msg, title = "Confirmar", icon = "❓") {
  return new Promise((resolve) => {
    if (!mesDom.alertModal) { resolve(confirm(msg)); return; }
    mesDom.alertIcon.textContent = icon;
    mesDom.alertTitle.textContent = title;
    mesDom.alertMsg.textContent = msg;
    mesDom.alertCancel.classList.remove("hidden");
    mesDom.alertOk.className = "w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg";
    mesDom.alertOk.textContent = "Confirmar";
    mesDom.alertModal.classList.remove("hidden");
    const onOk = () => { mesDom.alertModal.classList.add("hidden"); cleanup(); resolve(true); };
    const onCancel = () => { mesDom.alertModal.classList.add("hidden"); cleanup(); resolve(false); };
    const cleanup = () => { mesDom.alertOk.removeEventListener("click", onOk); mesDom.alertCancel.removeEventListener("click", onCancel); mesDom.alertOk.textContent = "OK"; };
    mesDom.alertOk.addEventListener("click", onOk);
    mesDom.alertCancel.addEventListener("click", onCancel);
  });
}

// --- Funções de Serviço (isoladas para futura migração Firebase) ---
async function mesGetMonthRecords(yearMonth) {
  // Firebase: db.collection("pointRecords").where("userId", "==", uid).where("yearMonth", "==", yearMonth).get()
  const data = await apiFetch(`/api/point/month?month=${yearMonth}`);
  return data.records || [];
}

async function mesSaveEvents(date, events, isHoliday, isFolga, isFinalized) {
  // Firebase: db.collection("pointRecords").doc(uid + "_" + date).set({...})
  return apiFetch(`/api/point/${date}/events`, {
    method: "PUT",
    body: JSON.stringify({ events, is_holiday: isHoliday, is_folga: isFolga, is_finalized: isFinalized }),
  });
}

async function mesSaveHoliday(date, isHoliday) {
  // Firebase: db.collection("pointRecords").doc(uid + "_" + date).update({is_holiday: isHoliday})
  return apiFetch(`/api/point/${date}/holiday`, {
    method: "PUT",
    body: JSON.stringify({ is_holiday: isHoliday }),
  });
}

// --- Funções de Cálculo Puro (sem efeitos colaterais = prontas para Firebase) ---

/**
 * Calcula métricas de um DayRecord já com aggregates.
 * Retorna status visual do dia.
 */
function mesDayStatus(record, settings) {
  const today = new Date().toISOString().split("T")[0];
  const dateStr = record.date;

  if (!dateStr) return "vazio";

  const dateObj = new Date(dateStr + "T00:00:00Z");
  const dow = dateObj.getUTCDay();
  const isSunday = dow === 0;
  const diasSemana = settings.dias_trabalho_por_semana || 6;
  const isSaturday = dow === 6;

  // Dia futuro
  if (dateStr > today) return "futuro";

  // Feriado marcado
  if (record.is_holiday) return "feriado";

  // Folga marcada manualmente ou pelo sistema
  const isDiaDeDescansoInfo = isSunday || (isSaturday && diasSemana <= 5);
  if (record.is_folga || (isDiaDeDescansoInfo && (!record.events || record.events.length === 0))) {
    return "folga";
  }

  // Sem registro
  if (!record.events || record.events.length === 0) return "sem_registro";

  const agg = record.aggregates || {};
  const jornada = settings.jornada_diaria_minutes || 440;
  const heEsperado = settings.horas_extras_padrao_dia || 0;
  const trabalhado = agg.effective_worked_minutes || 0;
  const he = (agg.extra_minutes || 0) + (agg.estourado_minutes || 0);
  const deficit = agg.deficit_minutes || 0;

  // Perda: trabalhou menos que a jornada
  if (deficit > 0) return "perda";

  // Perfeito: fez a jornada + HE esperada
  if (heEsperado > 0 && he >= heEsperado) return "perfeito";

  // Normal: fez a jornada mas sem HE (ou HE abaixo do esperado)
  if (trabalhado >= jornada) return "normal";

  return "perda";
}

/**
 * Conta domingos e feriados em um período do mês.
 * Usados como base para o cálculo do DSR.
 */
function contarDomingosFeriados(yearMonth, records, ateHoje = false) {
  const [year, month] = yearMonth.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const hoje = new Date().toISOString().split("T")[0];
  const recordMap = {};
  records.forEach(r => { recordMap[r.date] = r; });

  let count = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${yearMonth}-${String(d).padStart(2, "0")}`;
    if (ateHoje && dateStr > hoje) break;
    const rec = recordMap[dateStr];
    const dow = new Date(year, month - 1, d).getDay();
    const isSunday = dow === 0;
    const isFeriado = rec && rec.is_holiday;
    // Domingo só conta se não foi marcado como trabalhado
    const domingoTrabalhado = isSunday && rec && (rec.is_domingo_trabalhado || (rec.events && rec.events.length > 0 && !rec.is_folga));
    if ((isSunday && !domingoTrabalhado) || isFeriado) count++;
  }
  return count;
}

/**
 * Calcula o valor ideal do mês (máximo possível com DSR).
 * Usa divisor_mensal configurado pelo usuário (MODELO RH).
 */
function mesCalculateIdeal(yearMonth, settings, records = []) {
  const s = settings;
  const salary = s.salary_monthly || 0;
  const jornadaMin = s.jornada_diaria_minutes || 440;
  const metaHEMinDia = s.horas_extras_padrao_dia || 0;  // em minutos
  const dsrAtivo = s.dsr_ativo !== undefined ? !!s.dsr_ativo : true;
  const multHE = s.multiplicador_hora_extra || 1.5;
  const divisorMensal = s.divisor_mensal || 220;

  // Calcular dias úteis do mês
  const dias_trabalho = s.dias_trabalho ? JSON.parse(s.dias_trabalho) : null;
  const diasSemana = dias_trabalho ? dias_trabalho.length : (s.dias_trabalho_por_semana || 6);
  const [year, month] = yearMonth.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();

  let diasUteis = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    const isSunday = dow === 0;
    const isSaturday = dow === 6;
    if (isSunday) continue;
    if (isSaturday && diasSemana <= 5) continue;
    diasUteis++;
  }

  // Valor/hora base e HE (MODELO RH: usa divisor_mensal)
  const valorHora = divisorMensal > 0 ? salary / divisorMensal : 0;
  const valorHoraHE = valorHora * multHE;
  const valorMinutoHE = valorHoraHE / 60;

  // HE ideal total do mês
  const valorHEIdeal = metaHEMinDia * diasUteis * valorMinutoHE;

  // DSR sobre HE ideal (todos os domingos/feriados do mês)
  const domingosFeriadosMes = contarDomingosFeriados(yearMonth, records);
  const dsrIdeal = dsrAtivo && diasUteis > 0
    ? (valorHEIdeal / diasUteis) * domingosFeriadosMes
    : 0;

  const total = salary + valorHEIdeal + dsrIdeal;

  return {
    total,
    salary,
    valorHEIdeal,
    dsrIdeal,
    diasUteis,
    daysInMonth,
    valorHora,
    valorMinutoHE,
    domingosFeriadosMes,
  };
}

/**
 * Calcula métricas reais e projeção (MODELO RH).
 * ATUAL = salário + HE acumulada + DSR
 * PROJETADO = salário + HE feita + HE futura (meta) + DSR
 * PERDA = HE não feita × valorMinutoHE
 * PERDIDO = minutos além do horário de saída gastos compensando atraso (mesmo dia)
 * COMPENSADO = soma(compensado) / soma(atraso)
 */
function mesCalculateMetrics(records, yearMonth, settings) {
  const hoje = new Date().toISOString().split("T")[0];
  const ideal = mesCalculateIdeal(yearMonth, settings, records);
  const { valorMinutoHE, diasUteis, salary, domingosFeriadosMes } = ideal;
  const dsrAtivo = settings.dsr_ativo !== undefined ? !!settings.dsr_ativo : true;
  const metaHEMinDia = settings.horas_extras_padrao_dia || 0;

  // --- Somatórios dos dias passados com registro ---
  let totalHEMinutos = 0;           // HE realizada
  let totalAtrasoMinutos = 0;       // Atraso acumulado
  let totalCompensadoMinutos = 0;   // Compensado acumulado (mesmo dia)
  let totalVidaPessoalMinutos = 0;  // Minutos além da saída (mesmo que HE, mas sob a ótica de perda de tempo pessoal)
  let diasTrabalhados = 0;          // Dias com registro
  let diasPerfeitos = 0;
  let diasPerda = 0;
  let domingosFeriadosPassados = 0; // Para DSR Atual

  domingosFeriadosPassados = contarDomingosFeriados(yearMonth, records, true);

  records.forEach(r => {
    if (r.date > hoje || !r.events || r.events.length === 0) return;
    const agg = r.aggregates || {};
    const heMin = (agg.extra_minutes || 0) + (agg.estourado_minutes || 0);
    totalHEMinutos += heMin;
    totalAtrasoMinutos += agg.atraso_minutes || 0;
    totalCompensadoMinutos += agg.compensado_minutes || 0;
    
    // Perda de vida pessoal: minutos reais além da saida padrão (compensado + HE)
    if (agg.saida_real_minutes && settings.saida_padrao) {
      const saidaPadraoMin = timeToMinutes(settings.saida_padrao);
      const perdidoNoDia = Math.max(0, agg.saida_real_minutes - saidaPadraoMin);
      totalVidaPessoalMinutos += perdidoNoDia;
    }

    diasTrabalhados++;

    const status = mesDayStatus(r, settings);
    if (status === "perfeito") diasPerfeitos++;
    if (status === "perda") diasPerda++;
  });

  // --- HE acumulada em valor ---
  const valorHEAcumulado = totalHEMinutos * valorMinutoHE;

  // --- DSR Atual ---
  const dsrAtual = dsrAtivo && diasTrabalhados > 0
    ? (valorHEAcumulado / diasTrabalhados) * domingosFeriadosPassados
    : 0;

  // --- CARD: ATUAL = salário + HE acumulada + DSR ---
  const valorAtual = salary + valorHEAcumulado + dsrAtual;

  // --- CARD: PROJETADO ---
  const [year, month] = yearMonth.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  let diasRestantes = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${yearMonth}-${String(d).padStart(2, "0")}`;
    if (dateStr <= hoje) continue;
    
    // Simplificação: se é dia de trabalho, conta como restante
    const dow = new Date(year, month-1, d).getDay();
    const dias_trabalho = settings.dias_trabalho ? JSON.parse(settings.dias_trabalho) : [1,2,3,4,5,6];
    if (dias_trabalho.includes(dow)) diasRestantes++;
  }

  const heProjetadaMin = totalHEMinutos + (diasRestantes * metaHEMinDia);
  const valorHEProjetado = heProjetadaMin * valorMinutoHE;
  const dsrProjetado = dsrAtivo && diasUteis > 0
    ? (valorHEProjetado / diasUteis) * domingosFeriadosMes
    : 0;
  const valorProjetado = salary + valorHEProjetado + dsrProjetado;

  // --- CARD: IDEAL ---
  const valorIdeal = ideal.total;

  // --- CARD: PERDA = HE Meta NÃO realizada até hoje ---
  const heEsperadaAteHoje = diasTrabalhados * metaHEMinDia;
  const heDiferenca = Math.max(0, heEsperadaAteHoje - totalHEMinutos);
  const perdaFinanceira = heDiferenca * valorMinutoHE;

  // --- CARD: HE Esperada total do mês ---
  const heEsperado = metaHEMinDia * diasUteis;

  return {
    valorAtual,
    valorProjetado,
    valorIdeal,
    perdaFinanceira,
    totalHEMinutos,
    heEsperado,
    totalAtrasoMinutos,
    totalCompensadoMinutos,
    totalVidaPessoalMinutos,
    diasPerfeitos,
    diasPerda,
    diasUteis,
    diasTrabalhados,
    diasRestantes,
    domingosFeriadosPassados,
    domingosFeriadosMes,
  };
}

// Atualiza a UI com os dados calculados
function updateMesMetricsUI(metrics) {
  if (!mesDom.valorAtual) return;

  const toBRL = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const toTime = (mins) => {
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return `${h}h ${m}m`;
  };

  mesDom.valorAtual.textContent = toBRL(metrics.valorAtual);
  mesDom.valorProjetado.textContent = toBRL(metrics.valorProjetado);
  mesDom.valorIdeal.textContent = toBRL(metrics.valorIdeal);
  
  mesDom.perdaFinanceira.textContent = toBRL(metrics.perdaFinanceira);
  mesDom.tempoPerdido.textContent = toTime(metrics.totalVidaPessoalMinutos);
  mesDom.tempoCompensado.textContent = `${metrics.totalCompensadoMinutos} / ${metrics.totalAtrasoMinutos}`;

  // Barras
  const percReal = (metrics.valorAtual / metrics.valorIdeal) * 100;
  const percProj = (metrics.valorProjetado / metrics.valorIdeal) * 100;

  mesDom.barReal.style.width = `${Math.min(100, percReal)}%`;
  mesDom.labelReal.textContent = toBRL(metrics.valorAtual);

  mesDom.barProjetado.style.width = `${Math.min(100, percProj)}%`;
  mesDom.labelProjetado.textContent = toBRL(metrics.valorProjetado);

  mesDom.barIdeal.style.width = `100%`;
  mesDom.labelIdeal.textContent = toBRL(metrics.valorIdeal);

  // Análise
  mesDom.heRealizado.textContent = toTime(metrics.totalHEMinutos);
  mesDom.heEsperado.textContent = toTime(metrics.heEsperado);
  mesDom.diasPerfeitos.textContent = metrics.diasPerfeitos;
  mesDom.diasPerda.textContent = metrics.diasPerda;

  // Insights
  let html = "";
  if (metrics.valorProjetado < metrics.valorIdeal) {
    const diff = metrics.valorIdeal - metrics.valorProjetado;
    html += `<div class="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg text-amber-700 dark:text-amber-300 text-xs shadow-sm">
      <strong>Meta em risco:</strong> Projetado está ${toBRL(diff)} abaixo do ideal.
    </div>`;
  }
  if (metrics.totalAtrasoMinutos > metrics.totalCompensadoMinutos) {
    const falta = metrics.totalAtrasoMinutos - metrics.totalCompensadoMinutos;
    html += `<div class="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-red-700 dark:text-red-300 text-xs shadow-sm">
      <strong>Atrasos pendentes:</strong> Você ainda deve ${falta} min de compensação do horário de saída.
    </div>`;
  }
  mesDom.insights.innerHTML = html;
}

// --- Renderização do Calendário ---
function renderMesCalendar(yearMonth, records, settings) {
  if (!mesDom.calendario) return;
  mesDom.calendario.innerHTML = "";

  const [year, month] = yearMonth.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDow = new Date(year, month - 1, 1).getDay(); // 0=Dom

  // Mapa date → record
  const recordMap = {};
  records.forEach(r => { recordMap[r.date] = r; });

  // Células vazias antes do dia 1
  for (let i = 0; i < firstDow; i++) {
    const blank = document.createElement("div");
    mesDom.calendario.appendChild(blank);
  }

  const today = new Date().toISOString().split("T")[0];

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${yearMonth}-${String(d).padStart(2, "0")}`;
    const record = recordMap[dateStr] || { date: dateStr, events: [], aggregates: {}, is_holiday: false, is_finalized: false };
    const status = mesDayStatus(record, settings);

    const cell = document.createElement("div");
    cell.setAttribute("data-date", dateStr);
    cell.className = "relative flex flex-col items-center justify-between rounded-lg p-1 cursor-pointer select-none transition-all hover:scale-105 active:scale-95";
    cell.style.minHeight = "48px";

    // Estilo por status
    const styles = {
      perfeito: "bg-green-100 dark:bg-green-900/30 border border-green-400",
      normal: "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300",
      perda: "bg-red-100 dark:bg-red-900/30 border border-red-400",
      sem_registro: "bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600",
      feriado: "bg-amber-100 dark:bg-amber-900/30 border border-amber-400",
      folga: "bg-blue-50 dark:bg-blue-900/20 border border-blue-200",
      futuro: "bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 opacity-50",
      vazio: "opacity-0 pointer-events-none",
    };

    const dotColors = {
      perfeito: "bg-green-500",
      normal: "bg-yellow-400",
      perda: "bg-red-500",
      sem_registro: "bg-gray-400",
      feriado: "bg-amber-500",
      folga: "bg-blue-400",
      futuro: "bg-gray-300",
      vazio: "hidden",
    };

    cell.className += " " + (styles[status] || styles.futuro);

    // Destaque para hoje
    if (dateStr === today) {
      cell.className += " ring-2 ring-blue-500 ring-offset-1";
    }

    const dow = new Date(year, month - 1, d).getDay();
    const numColor = dow === 0 ? "text-red-500" : "text-default";

    cell.innerHTML = `
      <span class="text-xs font-bold ${numColor}">${d}</span>
      <span class="inline-block w-2 h-2 rounded-full mt-0.5 ${dotColors[status] || "bg-gray-300"}"></span>
    `;

    if (status !== "futuro" && status !== "vazio") {
      cell.addEventListener("click", () => openDayModal(dateStr, record));
    }

    mesDom.calendario.appendChild(cell);
  }
}

// --- Atualização da UI principal da tela Mês ---
function refreshMesUI(metrics, yearMonth) {
  if (!mesDom.valorAtual) return;

  const [year, month] = yearMonth.split("-").map(Number);
  const names = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  mesDom.titulo.textContent = `${names[month-1]} ${year}`;

  const toBRL = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const toTime = (mins) => {
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  // Cards Principais
  mesDom.valorAtual.textContent = toBRL(metrics.valorAtual);
  mesDom.valorProjetado.textContent = toBRL(metrics.valorProjetado);
  mesDom.valorIdeal.textContent = toBRL(metrics.valorIdeal);
  
  // Indicadores (RH)
  mesDom.perdaFinanceira.textContent = toBRL(metrics.perdaFinanceira);
  mesDom.tempoPerdido.textContent = toTime(metrics.totalVidaPessoalMinutos);
  
  // Compensado: X min compensados / Y min de atraso
  const totalAtraso = metrics.totalAtrasoMinutos || 0;
  const totalComp = metrics.totalCompensadoMinutos || 0;
  mesDom.tempoCompensado.textContent = `${totalComp} / ${totalAtraso}`;

  // Barras de progresso
  const pReal = metrics.valorIdeal > 0 ? (metrics.valorAtual / metrics.valorIdeal) * 100 : 0;
  const pProj = metrics.valorIdeal > 0 ? (metrics.valorProjetado / metrics.valorIdeal) * 100 : 0;

  mesDom.barReal.style.width = `${Math.max(0, Math.min(100, pReal))}%`;
  mesDom.labelReal.textContent = toBRL(metrics.valorAtual);

  mesDom.barProjetado.style.width = `${Math.max(0, Math.min(100, pProj))}%`;
  mesDom.labelProjetado.textContent = toBRL(metrics.valorProjetado);

  mesDom.barIdeal.style.width = "100%";
  mesDom.labelIdeal.textContent = toBRL(metrics.valorIdeal);

  // Análise
  mesDom.heRealizado.textContent = toTime(metrics.totalHEMinutos);
  mesDom.heEsperado.textContent = toTime(metrics.heEsperado);
  mesDom.diasPerfeitos.textContent = metrics.diasPerfeitos;
  mesDom.diasPerda.textContent = metrics.diasPerda;

  // Insights
  const insights = [];
  if (metrics.valorProjetado < metrics.valorIdeal) {
    const diff = metrics.valorIdeal - metrics.valorProjetado;
    insights.push({ icon: "💸", color: "text-red-500", msg: `Projetado está ${toBRL(diff)} abaixo do ideal.` });
  }
  if (totalAtraso > totalComp) {
    const falta = totalAtraso - totalComp;
    insights.push({ icon: "⏰", color: "text-orange-500", msg: `Faltam compensar ${falta} min de atrasos.` });
  }
  if (metrics.diasPerfeitos > 5) {
    insights.push({ icon: "🌟", color: "text-green-500", msg: `Parabéns! Você já teve ${metrics.diasPerfeitos} dias perfeitos.` });
  }

  mesDom.insights.innerHTML = insights.length > 0
    ? insights.map(i =>
        `<div class="flex items-start gap-2 text-sm bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
           <span class="text-xl flex-shrink-0">${i.icon}</span>
           <span class="${i.color} font-medium">${i.msg}</span>
         </div>`
      ).join("")
    : '<p class="text-muted text-sm border-t border-gray-100 dark:border-gray-800 pt-3">Nenhum insight relevante para este mês.</p>';
}

// --- Carregamento da Tela Mês ---
async function loadMonthPage(yearMonth) {
  if (!mesDom.titulo) cacheMesSelectors();

  mesState.currentYearMonth = yearMonth;
  mesState.settings = { ...state.settings };

  // Título de loading
  const [year, month] = yearMonth.split("-").map(Number);
  const names = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  if (mesDom.titulo) mesDom.titulo.textContent = `${names[month-1]} ${year}`;
  if (mesDom.calendario) mesDom.calendario.innerHTML = '<div class="col-span-7 text-center text-muted py-4 text-sm">Carregando...</div>';

  try {
    // (MODELO RH) Recalcula todos os registros do mês com as settings atuais
    // antes de renderizar, garantindo que dados históricos estejam corretos.
    await apiFetch(`/api/point/recalculate-month`, {
      method: "POST",
      body: JSON.stringify({ yearMonth }),
    }).catch(err => console.warn("Recálculo do mês falhou silenciosamente:", err));

    mesState.records = await mesGetMonthRecords(yearMonth);
    const metrics = mesCalculateMetrics(mesState.records, yearMonth, mesState.settings);
    refreshMesUI(metrics, yearMonth);
    renderMesCalendar(yearMonth, mesState.records, mesState.settings);
  } catch (err) {
    console.error("Erro ao carregar tela Mês:", err);
    if (mesDom.calendario) mesDom.calendario.innerHTML = '<div class="col-span-7 text-center text-red-500 py-4 text-sm">Erro ao carregar dados.</div>';
  }
}

// --- Modal do Dia ---
function openDayModal(dateStr, record) {
  if (!mesDom.modalDay) cacheMesSelectors();

  mesState.activeDate = dateStr;
  mesState.activeInput = null;
  mesState.mesVirtualValue = "";

  // Formatar título
  const dateObj = new Date(dateStr + "T00:00:00");
  const diasSemana = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
  const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  mesDom.modalDayTitulo.textContent = `${diasSemana[dateObj.getDay()]}, ${dateObj.getDate()} de ${meses[dateObj.getMonth()]}`;

  // Subtítulo: período
  const hoje = new Date().toISOString().split("T")[0];
  const isPast = dateStr < hoje;
  const isToday = dateStr === hoje;
  mesDom.modalDaySubtitulo.textContent = isToday ? "Hoje" : isPast ? "Dia passado" : "Dia futuro";

  // Preencher toggles
  mesDom.modalDayFeriado.checked = !!record.is_holiday;

  // Folga: dias sem registro e sem feriado que são dias de folga
  const s = mesState.settings;
  const dow = dateObj.getUTCDay();
  const isSunday = dow === 0;
  const isSaturday = dow === 6;
  const diasSem = s.dias_trabalho_por_semana || 6;
  const isDiaFolgaInfo = isSunday || (isSaturday && diasSem <= 5);
  mesDom.modalDayFolga.checked = !!record.is_folga || (!record.is_holiday && isDiaFolgaInfo && (!record.events || record.events.length === 0));

  // Preencher inputs de horário
  const eventMap = {};
  (record.events || []).forEach(e => { eventMap[e.type] = e.time; });

  mesDom.modalDayEntrada.value = eventMap["entrada"] || "";
  mesDom.modalDayAlmocoSaida.value = eventMap["almoco_saida"] || "";
  mesDom.modalDayAlmocoRetorno.value = eventMap["almoco_retorno"] || "";
  mesDom.modalDaySaida.value = eventMap["saida"] || "";

  // Indicadores
  const agg = record.aggregates || {};
  const dayFarm = (agg.farm_jornada_value||0)+(agg.farm_he_value||0)+(agg.farm_estourado_value||0)+(agg.farm_adicional_noturno_value||0)+(agg.farm_adicional_feriado_value||0);
  mesDom.modalDayTrabalhado.textContent = minutesToTime(agg.effective_worked_minutes || 0);
  mesDom.modalDayHE.textContent = minutesToTime((agg.extra_minutes||0)+(agg.estourado_minutes||0));
  mesDom.modalDayFarm.textContent = formatCurrency(dayFarm);

  if (record.events && record.events.length > 0) {
    let compensationHtml = [];

    if (agg.atraso_minutes > 0) {
      compensationHtml.push(`<span class="text-orange-500 font-medium">Atraso na Entrada: ${agg.atraso_minutes} min</span>`);
    }

    const saidaPadraoStr = settings.saida_padrao;
    const saidaPadraoMin = timeToMinutes(saidaPadraoStr || "");
    const saidaEvent = record.events.find(e => e.type === "saida");

    if (saidaPadraoMin > 0 && saidaEvent) {
      const saidaRealMin = timeToMinutes(saidaEvent.time);
      const alemDoIdeal = Math.max(0, saidaRealMin - saidaPadraoMin);
      
      if (alemDoIdeal > 0) {
        compensationHtml.push(`<span class="block mt-1">Saída Ideal: ${saidaPadraoStr}. Você saiu às ${saidaEvent.time} <strong>(+${alemDoIdeal} min além do ideal)</strong>.</span>`);
        
        // Quanto desse tempo foi usado estritamente para curar o atraso?
        // (Limitado ao tamanho do atraso ou ao tamanho do déficit evitado)
        if (agg.atraso_minutes > 0) {
          const deficitAtual = agg.deficit_minutes || 0;
          // Se o atraso foi 30, e o déficit atual é 0, compensou 30.
          // Se o atraso foi 30, e o déficit atual é 10, compensou 20.
          const compensado = Math.max(0, agg.atraso_minutes - deficitAtual);
          if (compensado > 0) {
             compensationHtml.push(`<span class="block text-indigo-500 mt-1">Tempo gasto compensando atrasos: ${compensado} min.</span>`);
          }
        }
      } else if (saidaRealMin < saidaPadraoMin) {
        // Saiu mais cedo que o Ideal
        const antesDoIdeal = saidaPadraoMin - saidaRealMin;
        compensationHtml.push(`<span class="block mt-1">Saída Ideal: ${saidaPadraoStr}. Você saiu às ${saidaEvent.time} <strong>(${antesDoIdeal} min mais cedo)</strong>.</span>`);
      }
    }

    if (compensationHtml.length > 0) {
      mesDom.modalDayAtrasoInfo.classList.remove("hidden");
      mesDom.modalDayAtrasoTxt.innerHTML = compensationHtml.join("");
    } else {
      mesDom.modalDayAtrasoInfo.classList.add("hidden");
    }
  } else {
    mesDom.modalDayAtrasoInfo.classList.add("hidden");
  }

  mesDom.modalDay.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeDayModal() {
  if (mesDom.modalDay) mesDom.modalDay.classList.add("hidden");
  document.body.style.overflow = "";
  mesState.activeDate = null;
  mesState.activeInput = null;
  mesState.mesVirtualValue = "";
}

async function saveDayModal() {
  const dateStr = mesState.activeDate;
  if (!dateStr) { closeDayModal(); return; }

  // Coleta os horários dos inputs
  const inputs = mesDom.timeInputs;
  const eventTypes = ["entrada", "almoco_saida", "almoco_retorno", "saida"];
  const events = [];

  for (const t of eventTypes) {
    const val = inputs[t] ? inputs[t].value.trim() : "";
    if (!val) continue;
    if (!/^[0-2][0-9]:[0-5][0-9]$/.test(val)) {
      await mesAlert(`Horário "${val}" inválido para "${t.replace("_"," ")}". Use HH:MM.`, "Horário Inválido", "❌");
      return;
    }
    events.push({ type: t, time: val, is_manual: true });
  }

  const isHoliday = mesDom.modalDayFeriado.checked;
  const isFolga = mesDom.modalDayFolga.checked;
  const isFinalized = true; // Salva como finalizado se tem saída

  try {
    mesDom.modalDaySave.disabled = true;
    mesDom.modalDaySave.textContent = "Salvando...";

    const updated = await mesSaveEvents(dateStr, events, isHoliday, isFolga, events.some(e => e.type === "saida"));

    // Atualiza o record no estado local
    const idx = mesState.records.findIndex(r => r.date === dateStr);
    if (idx >= 0) {
      mesState.records[idx] = updated;
    } else {
      mesState.records.push(updated);
      mesState.records.sort((a, b) => a.date.localeCompare(b.date));
    }

    closeDayModal();

    // Re-renderiza o mês
    const metrics = mesCalculateMetrics(mesState.records, mesState.currentYearMonth, mesState.settings);
    refreshMesUI(metrics, mesState.currentYearMonth);
    renderMesCalendar(mesState.currentYearMonth, mesState.records, mesState.settings);

  } catch (err) {
    await mesAlert(`Erro ao salvar: ${err.message}`, "Erro", "❌");
  } finally {
    mesDom.modalDaySave.disabled = false;
    mesDom.modalDaySave.textContent = "Salvar";
  }
}

// --- Teclado Virtual da Tela Mês ---
function bindMesVirtualKeyboard() {
  if (!state.isMobile || !mesDom.mesVKBtns) return;

  // Ao focar em um input, ativa o teclado
  Object.entries(mesDom.timeInputs).forEach(([type, input]) => {
    if (!input) return;
    input.addEventListener("focus", (e) => {
      e.target.blur(); // Nunca abre teclado nativo
      mesState.activeInput = input;
      mesState.mesVirtualValue = input.value.replace(":", "").replace(/-|_/g, "");
      // Highlight visual
      Object.values(mesDom.timeInputs).forEach(i => i && i.classList.remove("ring-2", "ring-blue-500"));
      input.classList.add("ring-2", "ring-blue-500");
    });
  });

  mesDom.mesVKBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.key;
      const input = mesState.activeInput;
      if (!input) {
        // Se nenhum ativo, ativa o primeiro vazio
        const firstEmpty = Object.values(mesDom.timeInputs).find(i => i && !i.value);
        mesState.activeInput = firstEmpty || mesDom.modalDayEntrada;
        mesState.mesVirtualValue = "";
        return;
      }

      let digits = mesState.mesVirtualValue;

      if (key === "backspace") {
        digits = digits.slice(0, -1);
      } else if (key === "clear") {
        digits = "";
        input.value = "";
        mesState.mesVirtualValue = "";
        return;
      } else if (digits.length < 4) {
        digits += key;
      }

      mesState.mesVirtualValue = digits;

      // Display formatado
      let display = "";
      if (digits.length === 0) display = "";
      else if (digits.length === 1) display = `${digits}_:__`;
      else if (digits.length === 2) display = `${digits}:__`;
      else if (digits.length === 3) display = `${digits.slice(0,2)}:${digits.slice(2)}_`;
      else if (digits.length === 4) {
        display = `${digits.slice(0,2)}:${digits.slice(2)}`;
        // Avança para o próximo campo automaticamente
        setTimeout(() => {
          const inputs = Object.values(mesDom.timeInputs).filter(Boolean);
          const idx = inputs.indexOf(input);
          if (idx < inputs.length - 1) {
            mesState.activeInput = inputs[idx + 1];
            mesState.mesVirtualValue = inputs[idx + 1].value.replace(":", "").replace(/-|_/g, "");
            Object.values(mesDom.timeInputs).forEach(i => i && i.classList.remove("ring-2", "ring-blue-500"));
            inputs[idx + 1].classList.add("ring-2", "ring-blue-500");
          }
        }, 150);
      }

      input.value = display;
    });
  });
}

// --- Listeners da Tela Mês ---
function bindMesEventListeners() {
  if (!mesDom.btnPrev) cacheMesSelectors();

  // Navegação de mês
  mesDom.btnPrev.addEventListener("click", () => {
    const [y, m] = mesState.currentYearMonth.split("-").map(Number);
    const prev = m === 1 ? `${y-1}-12` : `${y}-${String(m-1).padStart(2,"0")}`;
    loadMonthPage(prev);
  });

  mesDom.btnNext.addEventListener("click", () => {
    const [y, m] = mesState.currentYearMonth.split("-").map(Number);
    const next = m === 12 ? `${y+1}-01` : `${y}-${String(m+1).padStart(2,"0")}`;
    loadMonthPage(next);
  });

  if (mesDom.cardMesAtual) mesDom.cardMesAtual.addEventListener("click", () => showMesInfoModal("atual"));
  if (mesDom.cardMesProjetado) mesDom.cardMesProjetado.addEventListener("click", () => showMesInfoModal("projetado"));
  if (mesDom.cardMesIdeal) mesDom.cardMesIdeal.addEventListener("click", () => showMesInfoModal("ideal"));
  [mesDom.modalMesInfoClose, mesDom.modalMesInfoOk].forEach(b => {
    if(b) b.addEventListener("click", () => mesDom.modalMesInfo?.classList.add("hidden"));
  });

  // Modal do dia
  mesDom.modalDayClose.addEventListener("click", closeDayModal);
  mesDom.modalDayCancel.addEventListener("click", closeDayModal);
  mesDom.modalDaySave.addEventListener("click", saveDayModal);

  // Toggle Feriado: recalcula ao mudar
  mesDom.modalDayFeriado.addEventListener("change", async () => {
    const dateStr = mesState.activeDate;
    if (!dateStr) return;
    const isHoliday = mesDom.modalDayFeriado.checked;
    try {
      await mesSaveHoliday(dateStr, isHoliday);
    } catch(e) {
      console.warn("Erro ao salvar feriado:", e);
    }
  });

  // Fechar modal clicando no backdrop
  mesDom.modalDay.addEventListener("click", (e) => {
    if (e.target === mesDom.modalDay) closeDayModal();
  });

  // Teclado virtual do modal
  if (state.isMobile) {
    bindMesVirtualKeyboard();
  } else {
    // Desktop: inputs normais com tipo text
    Object.values(mesDom.timeInputs).forEach(input => {
      if (!input) return;
      input.removeAttribute("inputmode");
      input.setAttribute("type", "time");
    });
  }

  // Modal alerta interno
  if (mesDom.alertOk) {
    mesDom.alertOk.addEventListener("click", () => mesDom.alertModal?.classList.add("hidden"));
  }
}

// Flag para evitar double-bind
let mesListenersBound = false;

function initMesPage() {
  if (!mesListenersBound) {
    cacheMesSelectors();
    bindMesEventListeners();
    mesListenersBound = true;
  }
  const today = new Date();
  const ym = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}`;
  loadMonthPage(ym);
}

function showMesInfoModal(type) {
  if (!mesDom.modalMesInfo) return;
  const m = mesCalculateMetrics(mesState.records, mesState.currentYearMonth, mesState.settings);
  const s = mesState.settings;

  let html = "";
  if (type === "atual") {
    mesDom.modalMesInfoTitle.textContent = "Cálculo do Valor Atual (Real)";
    html = `
      <p class="mb-3">O <strong>Valor Atual</strong> é a exata soma dos dias Úteis que você <i>já preencheu</i> e suas respectivas Folgas.</p>
      
      <div class="space-y-2 mt-4">
        <div class="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-1">
          <span>Dias Logados e Folgas:</span>
          <strong>Rendendo na soma Atual</strong>
        </div>
        <div class="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-1">
          <span class="text-red-500">Dias Passados Vazios (${m.diasPassadosSemLog}):</span>
          <strong>R$ 0,00</strong>
        </div>
      </div>
      <div class="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mt-4">
        <div class="flex justify-between font-bold text-lg text-blue-600 dark:text-blue-400">
          <span>TOTAL ACUMULADO:</span>
          <span>${formatCurrency(m.valorAtual)}</span>
        </div>
        <p class="text-xs text-blue-500 dark:text-blue-400 mt-2 text-center">Os dias vazios aguardam justificativa (falta) ou o seu preenchimento.</p>
      </div>
    `;
  } else if (type === "projetado") {
    mesDom.modalMesInfoTitle.textContent = "Cálculo do Projetado";
    html = `
      <p class="mb-3">Previsão baseada no seu Histórico <strong>Real + Esperança de Cumprimento de Metas</strong> no restante do mês.</p>
      
      <div class="space-y-2 mt-4 text-xs">
        <div class="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-1">
          <span class="text-yellow-600">Dias Passados Vazios (${m.diasPassadosSemLog}):</span>
          <span>Assumem o Ideal Completo (${formatCurrency(m.valorDiaCompletoIdeal)})</span>
        </div>
        <div class="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-1">
          <span>Futuros Úteis Restantes (${m.diasFuturos}):</span>
          <span>Assumem o Ideal Completo (${formatCurrency(m.valorDiaCompletoIdeal)})</span>
        </div>
      </div>
      
      <div class="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg mt-4">
        <div class="flex justify-between font-bold text-lg text-green-600 dark:text-green-400">
          <span>PROJETADO MÊS:</span>
          <span>${formatCurrency(m.valorProjetado)}</span>
        </div>
        <p class="text-xs text-green-600 dark:text-green-500 mt-2 text-center">Se você entregar menos / mais do que a Meta nos próximos dias, essa projeção reage ativamente.</p>
      </div>
    `;
  } else if (type === "ideal") {
    mesDom.modalMesInfoTitle.textContent = "Cálculo do Ideal";
    html = `
      <p class="mb-3">A sua Meta Mensal Base, considerando seu salário integral mais a sua Meta de Horas Extras.</p>
      
      <div class="space-y-2 mt-4">
        <div class="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-1">
          <span>Salário Base:</span>
          <strong>${formatCurrency(s.salary_monthly || 0)}</strong>
        </div>
        <div class="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-1">
          <span>Total de Dias Úteis do Mês:</span>
          <strong>${m.diasUteis}</strong>
        </div>
        <div class="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-1">
          <span>Meta HE (${s.horas_extras_padrao_dia || 0} min/dia útil):</span>
          <strong class="text-green-500">+ ${formatCurrency(m.valorIdeal - (s.salary_monthly || 0))}</strong>
        </div>
      </div>
      
      <div class="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg mt-4">
        <div class="flex justify-between font-bold text-lg text-purple-600 dark:text-purple-400">
          <span>ALVO IDEAL:</span>
          <span>${formatCurrency(m.valorIdeal)}</span>
        </div>
      </div>
    `;
  }
  
  mesDom.modalMesInfoContent.innerHTML = html;
  mesDom.modalMesInfo.classList.remove("hidden");
}

// --- Inicialização ---
async function init() {
  loginForm.addEventListener("submit", handleLogin);
  btnDarkMode.addEventListener("click", () =>
    setDarkMode(!htmlElement.classList.contains("dark"))
  );

  const prefersDark = localStorage.getItem("darkmode") === "true";
  setDarkMode(prefersDark);
  updateHeaderDate();

  const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (storedToken) {
    state.authToken = storedToken;
    showMainContent();
    const success = await initializeApp();
    if (success) {
      // (CORREÇÃO DE SEGURANÇA)
      // Força o modal de senha se for o primeiro login,
      // e NÃO chama o router(). Isso impede o bypass com refresh.
      if (state.user.firstLogin) {
        console.log(
          "Token de primeiro login detectado. Forçando definição de senha."
        );
        openSetPasswordModal();
      } else {
        // Apenas chama o router se NÃO for o primeiro login
        router();
      }
    } else {
      // Se a inicialização falhar (ex: token expirado no /api/me)
      showLoginPage();
    }
  } else {
    showLoginPage();
  }
}

// Inicia o aplicativo
init();
