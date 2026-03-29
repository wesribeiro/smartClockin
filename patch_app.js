const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/app.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Updating dom.inputs in cacheSelectors
const inputsStr = `  dom.inputs = {
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
  dom.btnDias = document.querySelectorAll(".btn-dia");`;

content = content.replace(/dom\.inputs = \{[\s\S]*?horas_extras_padrao_dia"\),\s*\};/m, inputsStr);

// 2. Updating populateSettingsForm logic
// We need to handle day buttons, convert % to 1.X, and HH:MM
const populateStr = `
function minutesToHHMM(mins) {
  if (mins === null || isNaN(mins)) return "";
  const h = Math.floor(mins / 60).toString().padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return \`\${h}:\${m}\`;
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
}`;

content = content.replace(/\/\/ Popula o form de settings[\s\S]*?function updateHeaderDate\(\)\s*{/, populateStr + "\n\nfunction updateHeaderDate() {");

// 3. handleSaveSettings - validation and extraction
const saveStr = `// (ATUALIZADO V35) Salva as configurações com VALIDAÇÃO
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
    dom.saveStatusEl.textContent = \`Erro: \${error.message}\`;
    dom.saveStatusEl.classList.add("text-red-500");
  }
}
`;

content = content.replace(/\/\/ \(ATUALIZADO V35\) Salva as configurações com VALIDAÇÃO[\s\S]*?function handleToggleCLT\(\)\s*{/, saveStr + "\n// --- Funções de UI ---\n\nfunction handleToggleCLT() {");

content = content.replace(/dom\.settingsForm\.addEventListener\("submit", handleSaveSettings\);/,
  `dom.settingsForm.addEventListener("submit", handleSaveSettings);
  
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
  }`
);


fs.writeFileSync(filePath, content, 'utf8');
console.log('App.js patched - Settings logic updated');
