const path = require("path");
const express = require("express");
const db = require("./database.js");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = 3001;
const JWT_SECRET =
  process.env.JWT_SECRET || "seu-segredo-super-secreto-aqui-troque-isso";
const SALT_ROUNDS = 10;

app.use(cors());
app.use(express.json());

// --- Servir arquivos estáticos do Frontend ---
app.use(express.static(path.join(__dirname, "../frontend")));

// --- Middleware de Autenticação JWT ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) {
    console.warn("Tentativa de acesso sem token.");
    return res.sendStatus(401);
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.warn("Token inválido ou expirado:", err.message);
      return res.sendStatus(403);
    }
    req.user = user;
    next();
  });
};

// --- Middleware de Autorização Admin ---
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    console.warn("Tentativa de acesso admin negada para:", req.user?.login);
    res
      .status(403)
      .json({ error: "Acesso negado. Requer privilégios de administrador." });
  }
};

// --- Funções Auxiliares (Helpers) ---

// (NOVO V30) Função helper para pegar a data de "hoje" no fuso do usuário
async function getTodayDateForUser(userId) {
  const settingsSql = "SELECT timezone FROM userSettings WHERE userId = ?";
  const settings = await new Promise((resolve, reject) => {
    db.get(settingsSql, [userId], (err, row) =>
      err ? reject(err) : resolve(row || {})
    );
  });
  const userTimezone = settings.timezone || "America/Sao_Paulo"; // Default

  const todayDate = new Date().toLocaleDateString("en-CA", {
    timeZone: userTimezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return todayDate;
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

/**
 * (REATORADO V42) Lógica principal de cálculo de métricas do dia.
 * Agora separa os adicionais (Feriado, Noturno) dos valores base.
 */
function calculateBackendMetrics(events, settings, isHoliday, isSunday) {
  // --- Estado Inicial ---
  let work_minutes = 0;
  let pause_minutes_total = 0;
  let almoco_minutes_total = 0;
  let night_shift_minutes = 0; // Minutos trabalhados em horário noturno
  let saida_sugerida_minutes = null;
  let atraso_minutes = 0;
  let excesso_almoco_minutes = 0;

  // --- Valores de Moeda (Farm) ---
  let farm_jornada_value = 0; // Valor das horas normais (1.0x)
  let farm_he_value = 0; // Valor das horas extras (1.5x)
  let farm_estourado_value = 0; // Valor das horas extras estouradas (1.5x)
  let farm_adicional_noturno_value = 0; // *Apenas* o adicional (20%)
  let farm_adicional_feriado_value = 0; // *Apenas* o adicional (1.0x)

  // --- Minutos Trabalhados ---
  let effective_worked_minutes = 0;
  let counted_pause_minutes = 0;
  let extra_minutes = 0;
  let estourado_minutes = 0;
  let deficit_minutes = 0;

  // --- Valores por Minuto ---
  let valor_por_minuto_base = 0; // (V42) O valor 1.0x
  let valor_por_minuto_he_total = 0; // (V42) O valor total da HE (ex: 1.5x)
  let valor_por_minuto_adicional_feriado = 0; // (V42) O valor *adicional* (1.0x)

  const s = settings;

  // --- Flags de Configuração ---
  const disableSunday = !!s.disable_sunday_auto_multiplier;
  const isDayWithMultiplier = isHoliday || (isSunday && !disableSunday);
  const isAlmocoPago = !!s.is_almoco_pago;
  const jornada_dia = s.jornada_diaria_minutes || 0;
  const max_he = s.max_he_minutes || 120;

  const NIGHT_SHIFT_START_MINUTES = 22 * 60; // 22:00 (1320)
  const NIGHT_SHIFT_END_MINUTES = 5 * 60; // 05:00 (300)
  const MIDNIGHT_MINUTES = 24 * 60; // (1440)

  // --- 1. Cálculo de Minutos Trabalhados e Noturnos ---
  let lastTime = null;
  let lastType = null;

  const entradaEvent = events.find((e) => e.type === "entrada");
  if (entradaEvent && s.entrada_padrao) {
    const entradaPadraoMin = timeToMinutes(s.entrada_padrao);
    const entradaRealMin = timeToMinutes(entradaEvent.time);
    atraso_minutes = Math.max(0, entradaRealMin - entradaPadraoMin);
  }

  for (const event of events) {
    const currentTime = timeToMinutes(event.time);
    if (lastType && lastTime !== null) {
      const duration = currentTime - lastTime;
      if (duration >= 0) {
        if (
          lastType === "entrada" ||
          lastType === "almoco_retorno" ||
          lastType === "pausa_end"
        ) {
          work_minutes += duration;

          // Cálculo de Adicional Noturno
          const start = lastTime;
          const end = currentTime;
          let overlap = 0;
          // Período 1: Das 22:00 às 00:00
          overlap += Math.max(
            0,
            Math.min(end, MIDNIGHT_MINUTES) -
              Math.max(start, NIGHT_SHIFT_START_MINUTES)
          );
          // Período 2: Das 00:00 às 05:00
          overlap += Math.max(
            0,
            Math.min(end, NIGHT_SHIFT_END_MINUTES) - Math.max(start, 0)
          );
          night_shift_minutes += overlap;
        } else if (lastType === "pausa_start") {
          pause_minutes_total += duration;
        } else if (lastType === "almoco_saida") {
          almoco_minutes_total += duration;
        }
      }
    }
    lastTime = currentTime;
    lastType = event.type;
  }

  // --- 2. Cálculo de Minutos Efetivos (Contando Pausas e Almoço Pago) ---
  const almocoRetornoEvent = events.find((e) => e.type === "almoco_retorno");
  if (almocoRetornoEvent && s.tempo_almoco_minutes > 0) {
    excesso_almoco_minutes = Math.max(
      0,
      almoco_minutes_total - s.tempo_almoco_minutes
    );
  }

  if (s.has_15min_pause) {
    // (V41) Lógica de 15min por dia
    counted_pause_minutes = Math.min(pause_minutes_total, 15);
  }

  effective_worked_minutes = work_minutes + counted_pause_minutes;
  if (isAlmocoPago) {
    effective_worked_minutes += almoco_minutes_total;
  }

  // --- 3. Cálculo da Saída Sugerida ---
  if (entradaEvent) {
    const entradaMinutes = timeToMinutes(entradaEvent.time);
    const totalPauseNotCounted = pause_minutes_total - counted_pause_minutes;

    let almocoConsiderado = 0;
    if (!isAlmocoPago) {
      const almocoCompleto = !!almocoRetornoEvent;
      const almocoIniciado = events.some((e) => e.type === "almoco_saida");

      if (almocoCompleto) {
        almocoConsiderado = almoco_minutes_total; // Usa o tempo real
      } else if (!almocoIniciado) {
        almocoConsiderado = s.tempo_almoco_minutes || 0; // Usa o tempo padrão
      }
    }

    const jornadaTotalEstimada =
      jornada_dia + almocoConsiderado + totalPauseNotCounted;
    saida_sugerida_minutes = entradaMinutes + jornadaTotalEstimada;
  }

  // --- 4. Cálculo dos Valores por Minuto ---
  let valorH = 0,
    valorHE = 0,
    valorHF_Adicional = 0;

  const weekly_minutes = s.jornada_diaria_minutes * s.dias_trabalho_por_semana;
  const weekly_hours = weekly_minutes / 60;
  let monthly_hours;

  if (weekly_hours === 44) monthly_hours = 220;
  else if (weekly_hours === 40) monthly_hours = 200;
  else if (weekly_hours === 36) monthly_hours = 180;
  else if (weekly_hours === 30) monthly_hours = 150;
  else monthly_hours = (weekly_minutes * (52 / 12)) / 60; // Média

  if (s.salary_monthly > 0 && monthly_hours > 0) {
    valorH = s.salary_monthly / monthly_hours; // Valor/Hora Base (1.0x)
    valorHE = valorH * (s.multiplicador_hora_extra || 1.5); // Valor/Hora Extra (1.5x)

    // (V42) Valor ADICIONAL de feriado/domingo (1.0x)
    const multFeriado = s.multiplicador_feriado_domingo || 2.0;
    valorHF_Adicional = valorH * (multFeriado - 1.0); // (2.0 - 1.0 = 1.0)

    valor_por_minuto_base = valorH / 60;
    valor_por_minuto_he_total = valorHE / 60;
    valor_por_minuto_adicional_feriado = valorHF_Adicional / 60;
  }

  // --- 5. Cálculo dos Minutos (Base, HE, Estourado, Déficit) ---
  const base_minutes = Math.min(effective_worked_minutes, jornada_dia);
  const total_minutos_alem_jornada = Math.max(
    0,
    effective_worked_minutes - jornada_dia
  );

  extra_minutes = Math.min(total_minutos_alem_jornada, max_he);
  estourado_minutes = Math.max(0, total_minutos_alem_jornada - max_he);

  const saidaEvent = events.find((e) => e.type === "saida");
  if (!saidaEvent && total_minutos_alem_jornada === 0 && jornada_dia > 0) {
    deficit_minutes = Math.max(0, jornada_dia - effective_worked_minutes);
  }

  // --- 6. (REATORADO V42) Cálculo dos Valores (Farm) ---

  // 6.1. Farm Base (Jornada e HE) - Sempre calculado
  farm_jornada_value = base_minutes * valor_por_minuto_base; // 1.0x

  // (V42) Lógica 3x Corrigida: A HE é 1.5x da hora de feriado (2.0x), então 3.0x.
  if (isDayWithMultiplier) {
    const valor_hora_feriado =
      valor_por_minuto_base * (s.multiplicador_feriado_domingo || 2.0);
    const valor_he_feriado =
      (valor_hora_feriado * (s.multiplicador_hora_extra || 1.5)) / 60;

    farm_he_value = extra_minutes * valor_he_feriado;
    farm_estourado_value = estourado_minutes * valor_he_feriado;
  } else {
    farm_he_value = extra_minutes * valor_por_minuto_he_total; // 1.5x
    farm_estourado_value = estourado_minutes * valor_por_minuto_he_total; // 1.5x
  }

  // 6.2. Farm Adicional Noturno
  if (night_shift_minutes > 0 && valorH > 0) {
    const nightPercent = (s.adicional_noturno_percent || 0) / 100;
    // (V42) O adicional é pago sobre a hora normal (valorH)
    farm_adicional_noturno_value =
      (night_shift_minutes / 60) * valorH * nightPercent;
  }

  // 6.3. Farm Adicional Feriado/Domingo
  if (isDayWithMultiplier) {
    // Paga o adicional (1.0x) sobre *apenas* os minutos da JORNADA
    // O adicional da HE já foi embutido no 3.0x
    farm_adicional_feriado_value =
      base_minutes * valor_por_minuto_adicional_feriado;
  }

  // --- 7. Retorno dos Agregados ---
  return {
    effective_worked_minutes: Math.round(effective_worked_minutes),
    almoco_minutes_total: Math.round(almoco_minutes_total),
    pause_minutes_total: Math.round(pause_minutes_total),
    counted_pause_minutes: Math.round(counted_pause_minutes),
    saida_sugerida_minutes: saida_sugerida_minutes
      ? Math.round(saida_sugerida_minutes)
      : null,
    atraso_minutes: Math.round(atraso_minutes),
    excesso_almoco_minutes: Math.round(excesso_almoco_minutes),
    extra_minutes: Math.round(extra_minutes),
    estourado_minutes: Math.round(estourado_minutes),
    deficit_minutes: Math.round(deficit_minutes),
    night_shift_minutes: Math.round(night_shift_minutes),

    // Valores (Farm)
    farm_jornada_value: parseFloat(farm_jornada_value.toFixed(2)),
    farm_he_value: parseFloat(farm_he_value.toFixed(2)),
    farm_estourado_value: parseFloat(farm_estourado_value.toFixed(2)),
    farm_adicional_noturno_value: parseFloat(
      farm_adicional_noturno_value.toFixed(2)
    ),
    farm_adicional_feriado_value: parseFloat(
      farm_adicional_feriado_value.toFixed(2)
    ),

    // Multiplicadores (para UI)
    is_sunday: isSunday,
    is_day_with_multiplier: isDayWithMultiplier,

    // Valores por Minuto (para UI)
    valor_por_minuto: parseFloat(valor_por_minuto_base.toFixed(4)), // (V42) Renomeado de 'valor_por_minuto'
    valor_por_minuto_extra: parseFloat(valor_por_minuto_he_total.toFixed(4)), // (V42) Renomeado de 'valor_por_minuto_extra'
    valor_por_minuto_adicional_feriado: parseFloat(
      valor_por_minuto_adicional_feriado.toFixed(4)
    ),
  };
}

// --- API Endpoints ---

// (ATUALIZADO V29) Auth Routes - Usa 'login' em vez de 'email'
app.post("/api/auth/login", (req, res) => {
  const { login, password } = req.body;
  if (!login || !password) {
    return res.status(400).json({
      error: "Login e senha são obrigatórios.",
    });
  }

  const sql = "SELECT * FROM users WHERE login = ?";
  db.get(sql, [login], (err, user) => {
    if (err) {
      console.error("Erro DB no login:", err);
      return res.status(500).json({ error: "Erro interno ao buscar usuário." });
    }
    if (!user) {
      console.log(`Login falhou (usuário não encontrado): ${login}`);
      return res.status(401).json({ error: "Credenciais inválidas." });
    }

    if (user.is_first_login && password === "dummy") {
      console.log(`Primeiro login detectado para: ${login}`);
      const tokenPayload = {
        userId: user.userId,
        login: user.login,
        email: user.email,
        role: user.role,
        name: user.name,
        firstLogin: true,
      };
      const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "15m" });
      return res.json({ token, user: tokenPayload });
    }

    if (user.is_first_login && password !== "dummy") {
      console.log(`Tentativa de login com senha no primeiro acesso: ${login}`);
      return res.status(401).json({
        error: "Primeiro acesso: deixe a senha em branco e clique em Entrar.",
      });
    }

    if (!user.password_hash) {
      console.error(`Usuário ${login} sem hash de senha no banco!`);
      return res.status(500).json({ error: "Erro de configuração da conta." });
    }

    bcrypt.compare(password, user.password_hash, (err, result) => {
      if (err) {
        console.error("Erro no bcrypt.compare:", err);
        return res.status(500).json({ error: "Erro interno na autenticação." });
      }
      if (!result) {
        console.log(`Login falhou (senha incorreta): ${login}`);
        return res.status(401).json({ error: "Credenciais inválidas." });
      }

      console.log(`Login bem-sucedido para: ${login}`);
      const tokenPayload = {
        userId: user.userId,
        login: user.login,
        email: user.email,
        role: user.role,
        name: user.name,
        firstLogin: false,
      };
      const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "8h" });
      res.json({ token, user: tokenPayload });
    });
  });
});

// Definir senha (Primeiro Login)
app.put("/api/auth/set-password", authenticateToken, (req, res) => {
  if (!req.user || !req.user.firstLogin) {
    return res.status(403).json({
      error: "Ação não permitida. Token inválido para definir senha.",
    });
  }
  const { newPassword, repeatPassword } = req.body;
  if (!newPassword || newPassword !== repeatPassword) {
    return res
      .status(400)
      .json({ error: "Senhas não conferem ou estão vazias." });
  }
  if (newPassword.length < 6) {
    return res
      .status(400)
      .json({ error: "Senha deve ter no mínimo 6 caracteres." });
  }

  bcrypt.hash(newPassword, SALT_ROUNDS, (err, hash) => {
    if (err) {
      console.error("Erro ao gerar hash (set-password):", err);
      return res
        .status(500)
        .json({ error: "Erro interno ao processar senha." });
    }

    const sql =
      "UPDATE users SET password_hash = ?, is_first_login = 0 WHERE userId = ? AND is_first_login = 1";
    db.run(sql, [hash, req.user.userId], function (err) {
      if (err) {
        console.error("Erro DB (set-password):", err);
        return res.status(500).json({ error: "Erro ao salvar nova senha." });
      }
      if (this.changes === 0) {
        return res
          .status(400)
          .json({ error: "Operação inválida ou já realizada." });
      }
      console.log(`Senha definida para usuário ${req.user.userId}`);
      res.json({
        success: true,
        message: "Senha definida com sucesso. Faça login novamente.",
      });
    });
  });
});

// Alterar Senha (Usuário Logado)
app.put("/api/auth/change-password", authenticateToken, (req, res) => {
  if (!req.user || req.user.firstLogin) {
    return res
      .status(403)
      .json({ error: "Defina sua senha inicial primeiro ou token inválido." });
  }
  const { currentPassword, newPassword, repeatPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword !== repeatPassword) {
    return res.status(400).json({
      error:
        "Todos os campos são obrigatórios e as novas senhas devem conferir.",
    });
  }
  if (newPassword.length < 6) {
    return res
      .status(400)
      .json({ error: "Nova senha deve ter no mínimo 6 caracteres." });
  }

  const sqlSelect = "SELECT password_hash FROM users WHERE userId = ?";
  db.get(sqlSelect, [req.user.userId], (err, user) => {
    if (err || !user) {
      return res
        .status(500)
        .json({ error: "Erro ao buscar dados do usuário." });
    }

    bcrypt.compare(currentPassword, user.password_hash, (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ error: "Erro interno ao verificar senha." });
      }
      if (!result) {
        return res.status(401).json({ error: "Senha atual incorreta." });
      }

      bcrypt.hash(newPassword, SALT_ROUNDS, (err, newHash) => {
        if (err) {
          return res
            .status(500)
            .json({ error: "Erro interno ao processar nova senha." });
        }
        const sqlUpdate = "UPDATE users SET password_hash = ? WHERE userId = ?";
        db.run(sqlUpdate, [newHash, req.user.userId], function (err) {
          if (err) {
            return res
              .status(500)
              .json({ error: "Erro ao salvar nova senha." });
          }
          console.log(`Senha alterada para usuário ${req.user.userId}`);
          res.json({ success: true, message: "Senha alterada com sucesso." });
        });
      });
    });
  });
});

// --- User Routes (Protegidas) ---

// (ATUALIZADO V29) Obter dados do usuário logado + settings (combinado)
app.get("/api/me", authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const sql = `
        SELECT u.userId, u.name, u.login, u.email, u.role, u.is_first_login,
               s.salary_monthly, s.jornada_diaria_minutes, s.entrada_padrao, s.saida_almoco_padrao,
               s.retorno_almoco_padrao, s.saida_padrao, s.tempo_almoco_minutes, s.dias_trabalho_por_semana,
               s.multiplicador_hora_extra, s.multiplicador_feriado_domingo, s.fgts_percent, s.has_15min_pause,
               s.pause_policy, s.tolerancia_entrada_minutes, s.alert_voice_on, s.timezone,
               s.adicional_noturno_percent, s.disable_sunday_auto_multiplier,
               s.is_almoco_pago, s.max_he_minutes
        FROM users u
        LEFT JOIN userSettings s ON u.userId = s.userId
        WHERE u.userId = ?`;

  db.get(sql, [userId], (err, row) => {
    if (err) {
      console.error(`Erro DB (get /api/me) para userId ${userId}:`, err);
      return res
        .status(500)
        .json({ error: "Erro ao buscar dados do usuário." });
    }
    if (!row) {
      return res.status(404).json({ error: "Usuário não encontrado." });
    }

    const user = {
      userId: row.userId,
      name: row.name,
      login: row.login, // (MUDANÇA)
      email: row.email,
      role: row.role,
      is_first_login: row.is_first_login,
    };

    const settings = {};
    const settingKeys = [
      "salary_monthly",
      "jornada_diaria_minutes",
      "entrada_padrao",
      "saida_almoco_padrao",
      "retorno_almoco_padrao",
      "saida_padrao",
      "tempo_almoco_minutes",
      "dias_trabalho_por_semana",
      "multiplicador_hora_extra",
      "multiplicador_feriado_domingo",
      "fgts_percent",
      "has_15min_pause",
      "pause_policy",
      "tolerancia_entrada_minutes",
      "alert_voice_on",
      "timezone",
      "adicional_noturno_percent",
      "disable_sunday_auto_multiplier",
      "is_almoco_pago",
      "max_he_minutes", // (MUDANÇA)
    ];

    settingKeys.forEach((key) => {
      settings[key] = row[key];
    });

    res.json({ user, settings });
  });
});

// (ATUALIZADO V29) Atualizar Configurações do Usuário
app.put("/api/me/settings", authenticateToken, (req, res) => {
  const userId = req.user.userId;

  const allSettingColumns = [
    "salary_monthly",
    "jornada_diaria_minutes",
    "entrada_padrao",
    "saida_almoco_padrao",
    "retorno_almoco_padrao",
    "saida_padrao",
    "tempo_almoco_minutes",
    "dias_trabalho_por_semana",
    "multiplicador_hora_extra",
    "multiplicador_feriado_domingo",
    "fgts_percent",
    "has_15min_pause",
    "pause_policy",
    "tolerancia_entrada_minutes",
    "alert_voice_on",
    "timezone",
    "adicional_noturno_percent",
    "disable_sunday_auto_multiplier",
    "is_almoco_pago",
    "max_he_minutes", // (MUDANÇA)
  ];

  const validFields = Object.keys(req.body).filter((f) =>
    allSettingColumns.includes(f)
  );

  if (validFields.length === 0) {
    return res
      .status(400)
      .json({ error: "Nenhum campo de configuração válido foi enviado." });
  }

  const columns = ["userId", ...validFields];
  const placeholders = columns.map(() => "?").join(", ");
  const values = [userId, ...validFields.map((field) => req.body[field])];

  const sql = `INSERT OR REPLACE INTO userSettings (${columns.join(
    ", "
  )}) VALUES (${placeholders})`;

  db.run(sql, values, function (err) {
    if (err) {
      console.error("Erro DB (put /me/settings):", err);
      return res.status(500).json({ error: "Erro ao salvar configurações." });
    }
    console.log(`Configurações salvas/atualizadas para o usuário ${userId}`);

    // Retorna os dados atualizados para confirmar
    db.get(
      "SELECT * FROM userSettings WHERE userId = ?",
      [userId],
      (errGet, row) => {
        if (errGet || !row) {
          return res
            .status(500)
            .json({ error: "Erro ao reler configurações após salvar." });
        }
        res.json({ success: true, settings: row });
      }
    );
  });
});

// --- Point Record Routes (Protegidas) ---

// (CORRIGIDO) Obter registro de ponto do dia (today) - AGORA USA TIMEZONE
app.get("/api/point/today", authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    const todayDate = await getTodayDateForUser(userId);

    // Query records with the correct date
    const sql = "SELECT * FROM pointRecords WHERE userId = ? AND date = ?";
    db.get(sql, [userId, todayDate], (err, row) => {
      if (err) {
        console.error("Erro DB (get /point/today):", err);
        return res
          .status(500)
          .json({ error: "Erro ao buscar registro do dia." });
      }

      let record;
      if (row) {
        try {
          record = {
            ...row,
            events: JSON.parse(row.events || "[]"),
            aggregates: JSON.parse(row.aggregates || "{}"),
            is_holiday: !!row.is_holiday,
            is_finalized: !!row.is_finalized,
          };
        } catch (parseErr) {
          record = { ...row, events: [], aggregates: {} };
        }
      } else {
        record = {
          recordId: null,
          userId,
          date: todayDate, // Retorna a data correta no fuso do usuário
          events: [],
          aggregates: {},
          is_holiday: false,
          is_finalized: false,
        };
      }
      res.json(record);
    });
  } catch (error) {
    console.error("Erro CRÍTICO em GET /api/point/today:", error);
    res
      .status(500)
      .json({ error: "Erro interno ao buscar fuso horário do usuário." });
  }
});

// (ATUALIZADO V42) Endpoint para resumo do mês (Total HE, Valor HE, Valor Total)
app.get("/api/point/summary/month", authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    const today = await getTodayDateForUser(userId);
    const currentMonth = today.substring(0, 7); // Formato "YYYY-MM"

    const sql = `
        SELECT aggregates 
        FROM pointRecords 
        WHERE userId = ? AND strftime('%Y-%m', date) = ? AND is_finalized = 1
    `;

    db.all(sql, [userId, currentMonth], (err, rows) => {
      if (err) {
        console.error("Erro DB (get /point/summary/month):", err);
        return res.status(500).json({ error: "Erro ao buscar resumo do mês." });
      }

      let total_extra_minutes = 0;
      let total_farm = 0;
      let total_farm_extra = 0; // (NOVO V38)

      rows.forEach((row) => {
        try {
          const aggregates = JSON.parse(row.aggregates || "{}");

          // (CORREÇÃO V38) Soma HE normal + HE estourada
          total_extra_minutes +=
            (aggregates.extra_minutes || 0) +
            (aggregates.estourado_minutes || 0);

          // (V42) Soma o valor total do dia
          total_farm +=
            (aggregates.farm_jornada_value || 0) +
            (aggregates.farm_he_value || 0) +
            (aggregates.farm_estourado_value || 0) +
            (aggregates.farm_adicional_noturno_value || 0) +
            (aggregates.farm_adicional_feriado_value || 0);

          // (V42) Soma apenas o valor da HE (normal + estourada)
          total_farm_extra +=
            (aggregates.farm_he_value || 0) +
            (aggregates.farm_estourado_value || 0);
        } catch (e) {
          console.warn("Erro ao parsear aggregates no resumo do mês:", e);
        }
      });

      res.json({
        total_extra_minutes: Math.round(total_extra_minutes),
        total_farm: parseFloat(total_farm.toFixed(2)),
        total_farm_extra: parseFloat(total_farm_extra.toFixed(2)), // (NOVO V38)
      });
    });
  } catch (error) {
    console.error("Erro CRÍTICO em GET /api/point/summary/month:", error);
    res.status(500).json({ error: "Erro interno ao processar resumo." });
  }
});

// (CORRIGIDO) Adicionar/Editar Ponto (Evento) - AGORA USA TIMEZONE
app.post("/api/point", authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { type, time, is_manual, isEdit, originalTime } = req.body;

  if (!type || !time) {
    return res.status(400).json({ error: "Tipo e Hora são obrigatórios." });
  }

  try {
    const settingsSql = "SELECT * FROM userSettings WHERE userId = ?";
    const settings = await new Promise((resolve, reject) => {
      db.get(settingsSql, [userId], (err, row) =>
        err ? reject(err) : resolve(row || {})
      );
    });

    const date = await getTodayDateForUser(userId);

    const todayObj = new Date(date + "T00:00:00Z");
    const isSunday = todayObj.getUTCDay() === 0;

    const recordSql =
      "SELECT * FROM pointRecords WHERE userId = ? AND date = ?";
    const row = await new Promise((resolve, reject) => {
      db.get(recordSql, [userId, date], (err, row) =>
        err ? reject(err) : resolve(row)
      );
    });

    let currentEvents = [];
    let recordId = row ? row.recordId : null;
    let isHoliday = row ? !!row.is_holiday : false;
    let isFinalized = row ? !!row.is_finalized : false;

    // (NOVO V30) Impede edição se o dia estiver finalizado
    if (isFinalized) {
      return res
        .status(403)
        .json({ error: "O dia já foi finalizado e não pode ser alterado." });
    }

    if (row && row.events) {
      try {
        currentEvents = JSON.parse(row.events);
      } catch {
        currentEvents = [];
      }
    }

    let updatedEvents = [...currentEvents];

    if (isEdit) {
      const index = updatedEvents.findIndex(
        (e) => e.type === type && e.time === originalTime
      );
      if (index > -1) {
        updatedEvents[index].time = time;
        updatedEvents[index].is_manual = true;
      } else {
        // Se não achou o original, apenas adiciona (previne erro)
        updatedEvents.push({ type, time, is_manual: true });
      }
    } else {
      updatedEvents = updatedEvents.filter((e) => e.type !== type);
      updatedEvents.push({ type, time, is_manual: !!is_manual });
    }

    updatedEvents.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

    const newAggregates = calculateBackendMetrics(
      updatedEvents,
      settings,
      isHoliday,
      isSunday
    );

    const eventsJson = JSON.stringify(updatedEvents);
    const aggregatesJson = JSON.stringify(newAggregates);

    const sqlReplace = `
        INSERT OR REPLACE INTO pointRecords 
        (recordId, userId, date, events, aggregates, is_holiday, is_finalized)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    await new Promise((resolve, reject) => {
      db.run(
        sqlReplace,
        [
          recordId,
          userId,
          date, // Data correta
          eventsJson,
          aggregatesJson,
          isHoliday ? 1 : 0,
          isFinalized ? 1 : 0,
        ],
        function (err) {
          if (err) {
            console.error("ERRO AO SALVAR PONTO:", err);
            reject(err);
          } else {
            if (!recordId) recordId = this.lastID;
            console.log(`Ponto salvo com sucesso para ${userId} em ${date}`);
            resolve(this);
          }
        }
      );
    });

    const updatedRecord = {
      recordId,
      userId,
      date,
      events: updatedEvents,
      aggregates: newAggregates,
      is_holiday: isHoliday,
      is_finalized: isFinalized,
    };
    res.status(isEdit ? 200 : 201).json(updatedRecord);
  } catch (error) {
    console.error("Erro CRÍTICO em POST /api/point:", error);
    res
      .status(500)
      .json({ error: "Erro interno ao processar o registro de ponto." });
  }
});

// (CORRIGIDO) Endpoint para marcar/desmarcar feriado - AGORA USA TIMEZONE
app.put("/api/point/holiday", authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { is_holiday } = req.body;

  if (typeof is_holiday !== "boolean") {
    return res
      .status(400)
      .json({ error: "Valor 'is_holiday' (booleano) é obrigatório." });
  }

  try {
    const settingsSql = "SELECT * FROM userSettings WHERE userId = ?";
    const settings = await new Promise((resolve, reject) => {
      db.get(settingsSql, [userId], (err, settingsRow) =>
        err ? reject(err) : resolve(settingsRow || {})
      );
    });

    const date = await getTodayDateForUser(userId);

    const todayObj = new Date(date + "T00:00:00Z");
    const isSunday = todayObj.getUTCDay() === 0;

    const recordSql =
      "SELECT * FROM pointRecords WHERE userId = ? AND date = ?";
    let row = await new Promise((resolve, reject) => {
      db.get(recordSql, [userId, date], (err, row) =>
        err ? reject(err) : resolve(row)
      );
    });

    if (!row) {
      console.log(
        `Nenhum registro para ${date}, criando um novo para marcar feriado.`
      );
      row = {
        recordId: null,
        userId,
        date: date, // Data correta
        events: "[]",
        aggregates: "{}",
        is_holiday: 0,
        is_finalized: 0,
      };
    }

    // (NOVO V30) Impede edição se o dia estiver finalizado
    if (row.is_finalized) {
      // (CORREÇÃO V34) Se o dia está finalizado, apenas retorna o registro atual sem erro
      console.warn(`Tentativa de alterar feriado em dia finalizado: ${date}`);
      try {
        row.events = JSON.parse(row.events || "[]");
        row.aggregates = JSON.parse(row.aggregates || "{}");
      } catch (e) {
        row.events = [];
        row.aggregates = {};
      }
      row.is_holiday = !!row.is_holiday;
      row.is_finalized = !!row.is_finalized;
      return res.json(row);
    }

    const currentEvents = JSON.parse(row.events || "[]");
    const newAggregates = calculateBackendMetrics(
      currentEvents,
      settings,
      is_holiday, // <--- Usa o NOVO valor de feriado
      isSunday
    );
    const aggregatesJson = JSON.stringify(newAggregates);

    const sqlReplace = `
          INSERT OR REPLACE INTO pointRecords 
          (recordId, userId, date, events, aggregates, is_holiday, is_finalized)
          VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

    let recordId = row.recordId;
    await new Promise((resolve, reject) => {
      db.run(
        sqlReplace,
        [
          recordId,
          userId,
          date, // Data correta
          row.events, // Mantém os eventos atuais
          aggregatesJson, // Salva os novos agregados
          is_holiday ? 1 : 0, // Salva o novo status de feriado
          row.is_finalized, // Mantém o status de finalizado
        ],
        function (err) {
          if (err) {
            console.error("ERRO AO SALVAR FERIADO:", err);
            reject(err);
          } else {
            if (!recordId) recordId = this.lastID;
            console.log(`Feriado atualizado para ${userId} em ${date}`);
            resolve(this);
          }
        }
      );
    });

    const updatedRecord = {
      recordId,
      userId,
      date,
      events: currentEvents,
      aggregates: newAggregates,
      is_holiday: is_holiday,
      is_finalized: !!row.is_finalized,
    };
    res.json(updatedRecord);
  } catch (error) {
    console.error("Erro CRÍTICO em PUT /api/point/holiday:", error);
    res.status(500).json({ error: "Erro interno ao atualizar feriado." });
  }
});

// (REMOVIDO V34) Endpoint /recalculate não é mais necessário
// app.put("/api/point/recalculate", ...);

// (NOVO V30) Endpoint para FINALIZAR o dia
app.put("/api/point/finalize", authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    const date = await getTodayDateForUser(userId);
    const sql =
      "UPDATE pointRecords SET is_finalized = 1 WHERE userId = ? AND date = ? AND is_finalized = 0";

    db.run(sql, [userId, date], function (err) {
      if (err) {
        console.error("Erro DB (finalize):", err);
        return res.status(500).json({ error: "Erro ao finalizar o dia." });
      }
      if (this.changes === 0) {
        return res
          .status(400)
          .json({ error: "O dia já estava finalizado ou não existe." });
      }
      console.log(`Dia ${date} FINALIZADO para usuário ${userId}`);
      res.json({ success: true, message: "Dia finalizado com sucesso." });
    });
  } catch (error) {
    console.error("Erro CRÍTICO em PUT /api/point/finalize:", error);
    res.status(500).json({ error: "Erro interno ao processar requisição." });
  }
});

// (NOVO V30) Endpoint para "des-finalizar" o dia
app.put("/api/point/unfinalize", authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    const date = await getTodayDateForUser(userId);
    const sql =
      "UPDATE pointRecords SET is_finalized = 0 WHERE userId = ? AND date = ? AND is_finalized = 1";

    db.run(sql, [userId, date], function (err) {
      if (err) {
        console.error("Erro DB (unfinalize):", err);
        return res.status(500).json({ error: "Erro ao reabrir o dia." });
      }
      if (this.changes === 0) {
        return res.status(400).json({ error: "O dia não estava finalizado." });
      }
      console.log(`Dia ${date} reaberto para usuário ${userId}`);
      res.json({ success: true, message: "Dia reaberto para edição." });
    });
  } catch (error) {
    console.error("Erro CRÍTICO em PUT /api/point/unfinalize:", error);
    res.status(500).json({ error: "Erro interno ao processar requisição." });
  }
});

// (NOVO V30) Endpoint para "limpar" os eventos do dia
app.delete("/api/point/clear", authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    const date = await getTodayDateForUser(userId);

    // Pega settings para recalcular o estado vazio
    const settingsSql = "SELECT * FROM userSettings WHERE userId = ?";
    const settings = await new Promise((resolve, reject) => {
      db.get(settingsSql, [userId], (err, row) =>
        err ? reject(err) : resolve(row || {})
      );
    });

    // (NOVO V30) Precisamos saber se era feriado/domingo antes de limpar
    const recordSql =
      "SELECT is_holiday FROM pointRecords WHERE userId = ? AND date = ?";
    const record = await new Promise((resolve, reject) => {
      db.get(recordSql, [userId, date], (err, row) =>
        err ? reject(err) : resolve(row || { is_holiday: 0 })
      );
    });
    const todayObj = new Date(date + "T00:00:00Z");
    const isSunday = todayObj.getUTCDay() === 0;

    // Calcula agregados vazios
    const newAggregates = calculateBackendMetrics(
      [],
      settings,
      record.is_holiday,
      isSunday
    );
    const aggregatesJson = JSON.stringify(newAggregates);

    const sql =
      "UPDATE pointRecords SET events = '[]', aggregates = ?, is_finalized = 0 WHERE userId = ? AND date = ?";

    db.run(sql, [aggregatesJson, userId, date], function (err) {
      if (err) {
        console.error("Erro DB (clear):", err);
        return res.status(500).json({ error: "Erro ao limpar registros." });
      }
      console.log(`Registros limpos para ${userId} em ${date}`);

      // Retorna o registro "zerado"
      res.json({
        userId,
        date,
        events: [],
        aggregates: newAggregates,
        is_holiday: record.is_holiday, // Mantém o status de feriado
        is_finalized: false,
      });
    });
  } catch (error) {
    console.error("Erro CRÍTICO em DELETE /api/point/clear:", error);
    res.status(500).json({ error: "Erro interno ao processar requisição." });
  }
});

// --- Admin Routes (Protegidas por JWT + isAdmin) ---
app.get("/api/admin/users", authenticateToken, isAdmin, (req, res) => {
  const sql =
    "SELECT userId, name, login, email, role, is_first_login, created_at FROM users ORDER BY name";
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("Erro DB (get /admin/users):", err);
      return res.status(500).json({ error: "Erro ao listar usuários." });
    }
    res.json(rows);
  });
});

// (ATUALIZADO V29) Admin pode criar usuário com 'login' (obrigatório) e 'email' (opcional)
app.post("/api/admin/users", authenticateToken, isAdmin, (req, res) => {
  const { name, login, email, role } = req.body;
  if (!name || !login || !role || !["user", "admin"].includes(role)) {
    return res.status(400).json({
      error: "Nome, login e role (user/admin) são obrigatórios.",
    });
  }
  if (email && !/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({ error: "Formato de email inválido." });
  }

  const sqlInsertUser =
    "INSERT INTO users (name, login, email, role, is_first_login) VALUES (?, ?, ?, ?, 1)";
  db.run(sqlInsertUser, [name, login, email || null, role], function (err) {
    if (err) {
      if (err.message.includes("UNIQUE constraint failed")) {
        if (err.message.includes("users.login")) {
          return res.status(409).json({ error: "Login já cadastrado." });
        }
        if (err.message.includes("users.email")) {
          return res.status(409).json({ error: "Email já cadastrado." });
        }
      }
      console.error("Erro DB (post /admin/users):", err);
      return res.status(500).json({ error: "Erro ao criar usuário." });
    }
    const newUserId = this.lastID;
    // Cria settings padrão para o novo usuário
    const sqlInsertSettings =
      "INSERT OR IGNORE INTO userSettings (userId) VALUES (?)";
    db.run(sqlInsertSettings, [newUserId], (errSettings) => {
      if (errSettings) {
        console.error(
          `Erro ao criar settings para novo usuário ${newUserId}:`,
          errSettings
        );
      }
    });

    console.log(
      `Admin ${req.user.login} criou usuário ${login} (ID: ${newUserId})`
    );
    res
      .status(201)
      .json({ success: true, userId: newUserId, name, login, email, role });
  });
});

// --- Rota Catch-all para SPA (usando Regex) ---
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend", "index.html"));
});

// --- Handler 404 Final ---
app.use((req, res, next) => {
  console.log(`Handler 404 final para: ${req.originalUrl}`);
  res.status(404).json({ error: "Recurso não encontrado." });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Backend rodando em http://localhost:${PORT} e acessível na rede local`
  );
});
