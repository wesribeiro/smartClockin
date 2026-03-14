const path = require("path");
const express = require("express");
const db = require("./database.js");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = 3001;
const JWT_SECRET = process.env.JWT_SECRET || "seu-segredo-super-secreto-aqui-troque-isso";
const SALT_ROUNDS = 10;
const START_DATE_AUDIT = "2026-01-01"; // Marco Zero do Auditor

app.use(cors());
app.use(express.json());

// --- Servir arquivos estáticos do Frontend ---
app.use(express.static(path.join(__dirname, "../frontend")));

// --- Middleware de Autenticação JWT ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) {
    return res.sendStatus(401);
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
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
    res.status(403).json({ error: "Acesso restrito a administradores." });
  }
};

// --- Rotas de Autenticação ---

// Login
app.post("/api/auth/login", (req, res) => {
  const { login, password } = req.body;

  if (!login || !password) {
    return res.status(400).json({ error: "Login e senha são obrigatórios." });
  }

  const sql = "SELECT * FROM users WHERE login = ?";
  db.get(sql, [login], (err, user) => {
    if (err) {
      console.error("Erro no DB (login):", err.message);
      return res.status(500).json({ error: "Erro interno do servidor." });
    }
    if (!user) {
      return res.status(401).json({ error: "Credenciais inválidas." });
    }

    bcrypt.compare(password, user.password_hash, (errHash, result) => {
      if (errHash) {
        return res.status(500).json({ error: "Erro ao verificar senha." });
      }

      if (result || (user.is_first_login && password === "dummy")) {
        const token = jwt.sign(
          {
            userId: user.userId,
            login: user.login,
            name: user.name,
            role: user.role,
            firstLogin: !!user.is_first_login,
          },
          JWT_SECRET,
          { expiresIn: "24h" }
        );

        res.json({
          message: "Login realizado com sucesso.",
          token,
          user: {
            userId: user.userId,
            name: user.name,
            login: user.login,
            email: user.email,
            role: user.role,
            firstLogin: !!user.is_first_login,
          },
        });
      } else {
        res.status(401).json({ error: "Credenciais inválidas." });
      }
    });
  });
});

// Definir Senha
app.put("/api/auth/set-password", authenticateToken, (req, res) => {
  const { newPassword, repeatPassword } = req.body;
  const userId = req.user.userId;

  if (!req.user.firstLogin) {
    return res.status(403).json({ error: "Você já definiu sua senha." });
  }
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: "A senha deve ter no mínimo 6 caracteres." });
  }
  if (newPassword !== repeatPassword) {
    return res.status(400).json({ error: "As senhas não conferem." });
  }

  bcrypt.hash(newPassword, SALT_ROUNDS, (err, hash) => {
    if (err) return res.status(500).json({ error: "Erro ao criptografar." });

    const sql = "UPDATE users SET password_hash = ?, is_first_login = 0 WHERE userId = ?";
    db.run(sql, [hash, userId], function (errDb) {
      if (errDb) return res.status(500).json({ error: "Erro ao atualizar DB." });
      res.json({ success: true, message: "Senha definida com sucesso." });
    });
  });
});

// Alterar Senha
app.put("/api/auth/change-password", authenticateToken, (req, res) => {
  const { currentPassword, newPassword, repeatPassword } = req.body;
  const userId = req.user.userId;

  if (!currentPassword || !newPassword || !repeatPassword) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios." });
  }
  if (newPassword !== repeatPassword) {
    return res.status(400).json({ error: "As novas senhas não conferem." });
  }

  db.get("SELECT password_hash FROM users WHERE userId = ?", [userId], (err, user) => {
    if (err || !user) return res.status(500).json({ error: "Erro usuário." });

    bcrypt.compare(currentPassword, user.password_hash, (errCmp, result) => {
      if (!result) return res.status(401).json({ error: "Senha atual incorreta." });

      bcrypt.hash(newPassword, SALT_ROUNDS, (errHash, hash) => {
        if (errHash) return res.status(500).json({ error: "Erro criptografia." });
        db.run("UPDATE users SET password_hash = ? WHERE userId = ?", [hash, userId], (errUp) => {
          if (errUp) return res.status(500).json({ error: "Erro atualização." });
          res.json({ success: true, message: "Senha alterada." });
        });
      });
    });
  });
});

// --- Rotas de Usuário / Configurações ---

app.get("/api/me", authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const sqlUser = "SELECT userId, name, login, email, role, is_first_login FROM users WHERE userId = ?";
  const sqlSettings = "SELECT * FROM userSettings WHERE userId = ?";

  db.get(sqlUser, [userId], (err, user) => {
    if (err) return res.status(500).json({ error: "Erro DB User" });
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

    db.get(sqlSettings, [userId], (errS, settings) => {
      if (errS) return res.status(500).json({ error: "Erro DB Settings" });
      res.json({
        user: {
          userId: user.userId,
          name: user.name,
          login: user.login,
          email: user.email,
          role: user.role,
          firstLogin: !!user.is_first_login,
        },
        settings: settings || {},
      });
    });
  });
});

app.put("/api/me/settings", authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const s = req.body;
  const allowedFields = [
    "salary_monthly", "jornada_diaria_minutes", "entrada_padrao", "saida_almoco_padrao",
    "retorno_almoco_padrao", "saida_padrao", "tempo_almoco_minutes", "dias_trabalho_por_semana",
    "multiplicador_hora_extra", "multiplicador_feriado_domingo", "fgts_percent", "has_15min_pause",
    "pause_policy", "tolerancia_entrada_minutes", "alert_voice_on", "timezone",
    "adicional_noturno_percent", "disable_sunday_auto_multiplier", "is_almoco_pago", "max_he_minutes",
    "scale_type", "scale_work_days", "scale_12x36_anchor_date", "sunday_rule", "sunday_multiplier", "holiday_multiplier"
  ];

  let updates = [];
  let params = [];
  allowedFields.forEach((field) => {
    if (s[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(s[field]);
    }
  });

  if (updates.length === 0) return res.status(400).json({ error: "Nenhum dado para atualizar." });
  params.push(userId);
  const sql = `UPDATE userSettings SET ${updates.join(", ")} WHERE userId = ?`;

  db.run(sql, params, function (err) {
    if (err) return res.status(500).json({ error: "Erro ao atualizar configurações." });
    db.get("SELECT * FROM userSettings WHERE userId = ?", [userId], (errGet, newSettings) => {
      res.json({ success: true, settings: newSettings });
    });
  });
});

// --- ROTAS DO PLANNER (V3.1 - Batch & Holiday Flag) ---

// Busca dados do mês
app.get("/api/planner/:year/:month", authenticateToken, (req, res) => {
  const { year, month } = req.params; // month 0-11
  const userId = req.user.userId;
  const monthKey = `${year}-${String(parseInt(month) + 1).padStart(2, '0')}`;
  const monthPrefix = `${monthKey}%`;

  // (UPDATE V3.1) Seleciona também is_holiday e gig_hourly_rate
  const sqlOverrides = "SELECT overrideId, date, day_type, is_holiday, notes, gig_hourly_rate FROM planner_overrides WHERE userId = ? AND date LIKE ?";
  const sqlMonthConfig = "SELECT * FROM month_configs WHERE userId = ? AND month_key = ?";

  db.all(sqlOverrides, [userId, monthPrefix], (err, overrides) => {
    if (err) return res.status(500).json({ error: "Erro ao buscar overrides." });
    
    db.get(sqlMonthConfig, [userId, monthKey], (errM, config) => {
      if (errM) return res.status(500).json({ error: "Erro ao buscar config do mês." });
      
      res.json({
        overrides: overrides || [],
        config: config || null
      });
    });
  });
});

// Salva um override individual (Atualizado V3.1 para is_holiday)
app.post("/api/planner/override", authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const { date, day_type, notes, is_holiday, gig_hourly_rate } = req.body;

  if (!date || !day_type) return res.status(400).json({ error: "Data e Tipo são obrigatórios." });

  const holidayVal = is_holiday ? 1 : 0;
  const gigRateVal = gig_hourly_rate || 0;

  const sql = `
    INSERT INTO planner_overrides (userId, date, day_type, is_holiday, notes, gig_hourly_rate, created_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(userId, date) DO UPDATE SET
      day_type = excluded.day_type,
      is_holiday = excluded.is_holiday,
      notes = excluded.notes,
      gig_hourly_rate = excluded.gig_hourly_rate,
      created_at = CURRENT_TIMESTAMP
  `;

  db.run(sql, [userId, date, day_type, holidayVal, notes, gigRateVal], function (err) {
    if (err) return res.status(500).json({ error: "Erro ao salvar override." });
    res.json({ success: true });
  });
});

// (NOVO V3.1) Salva múltiplos overrides (Batch Mode)
app.post("/api/planner/batch", authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const { dates, day_type, is_holiday, gig_hourly_rate } = req.body;

  if (!dates || !Array.isArray(dates) || dates.length === 0) {
    return res.status(400).json({ error: "Lista de datas inválida." });
  }
  if (!day_type) return res.status(400).json({ error: "Tipo de dia obrigatório." });

  const holidayVal = is_holiday ? 1 : 0;
  const gigRateVal = gig_hourly_rate || 0;

  // Executa em série (SQLite lida bem com isso, melhor que Promise.all paralelo para evitar travamento de arquivo)
  db.serialize(() => {
    db.run("BEGIN TRANSACTION");
    
    const stmt = db.prepare(`
      INSERT INTO planner_overrides (userId, date, day_type, is_holiday, gig_hourly_rate, created_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(userId, date) DO UPDATE SET
        day_type = excluded.day_type,
        is_holiday = excluded.is_holiday,
        gig_hourly_rate = excluded.gig_hourly_rate,
        created_at = CURRENT_TIMESTAMP
    `);

    for (const date of dates) {
      stmt.run(userId, date, day_type, holidayVal, gigRateVal);
    }

    stmt.finalize();
    
    db.run("COMMIT", (err) => {
      if (err) {
        console.error("Erro Batch Commit:", err);
        return res.status(500).json({ error: "Erro ao salvar lote." });
      }
      res.json({ success: true, count: dates.length });
    });
  });
});

app.post("/api/planner/config", authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const { year, month, planned_work_days, base_hourly_rate } = req.body;
    const monthKey = `${year}-${String(parseInt(month)+1).padStart(2,'0')}`;
  
    const sql = `
      INSERT INTO month_configs (userId, month_key, planned_work_days, base_hourly_rate, created_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(userId, month_key) DO UPDATE SET
        planned_work_days = excluded.planned_work_days,
        base_hourly_rate = excluded.base_hourly_rate,
        created_at = CURRENT_TIMESTAMP
    `;
  
    db.run(sql, [userId, monthKey, planned_work_days, base_hourly_rate], function(err) {
      if (err) return res.status(500).json({ error: "Erro ao salvar config do mês." });
      res.json({ success: true });
    });
});

// --- ROTAS DO AUDITOR (V3.1 Update) ---

app.get("/api/auditor/pending", authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const todayStr = new Date().toISOString().split("T")[0];

  const sqlSettings = "SELECT * FROM userSettings WHERE userId = ?";
  // (UPDATE) Busca overrides atualizados
  const sqlOverrides = "SELECT * FROM planner_overrides WHERE userId = ? AND date >= ? AND date < ?";
  const sqlRecords = "SELECT date, justification FROM pointRecords WHERE userId = ? AND date >= ? AND date < ?";

  db.get(sqlSettings, [userId], (errS, settings) => {
    if (errS || !settings) return res.status(500).json({ error: "Erro configs." });

    db.all(sqlOverrides, [userId, START_DATE_AUDIT, todayStr], (errO, overrides) => {
      if (errO) return res.status(500).json({ error: "Erro overrides." });

      db.all(sqlRecords, [userId, START_DATE_AUDIT, todayStr], (errR, records) => {
        if (errR) return res.status(500).json({ error: "Erro records." });

        const pendingDates = calculatePendingDates(settings, overrides, records, START_DATE_AUDIT, todayStr);
        res.json({ pending: pendingDates });
      });
    });
  });
});

app.post("/api/auditor/resolve", authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const { date, justification } = req.body; 

  if (!date || !justification) return res.status(400).json({ error: "Dados incompletos." });

  db.get("SELECT * FROM userSettings WHERE userId = ?", [userId], (errS, settings) => {
     if(errS) return res.status(500).json({error: "Erro settings"});

     const mockRecordData = { justification }; 
     const calcs = calculateDailyTotals([], settings, date, null, null, mockRecordData);
     const aggsStr = JSON.stringify(calcs);

     const sql = `
        INSERT INTO pointRecords (userId, date, events, aggregates, justification, is_finalized)
        VALUES (?, ?, '[]', ?, ?, 1)
        ON CONFLICT(userId, date) DO UPDATE SET
            justification = excluded.justification,
            aggregates = excluded.aggregates,
            is_finalized = 1
     `;

     db.run(sql, [userId, date, aggsStr, justification], function(err) {
        if (err) return res.status(500).json({ error: "Erro ao justificar." });
        res.json({ success: true, date, justification, aggregates: calcs });
     });
  });
});

// --- Rotas de Ponto ---

app.post("/api/point", authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const { type, time, date, is_manual, isEdit, originalTime, is_gig, gig_hourly_rate } = req.body;

  if (!type || !time) return res.status(400).json({ error: "Tipo e Hora são obrigatórios." });

  const recordDate = date || new Date().toISOString().split("T")[0];
  const monthKey = recordDate.substring(0, 7);

  db.get("SELECT * FROM pointRecords WHERE userId = ? AND date = ?", [userId, recordDate], (err, record) => {
      if (err) return res.status(500).json({ error: "Erro DB Point" });

      let events = [];
      let currentJustification = null;
      let currentIsGig = is_gig !== undefined ? (is_gig ? 1 : 0) : 0;
      let currentGigRate = gig_hourly_rate !== undefined ? gig_hourly_rate : 0;

      if (record) {
        if(is_gig === undefined) currentIsGig = record.is_gig;
        if(gig_hourly_rate === undefined) currentGigRate = record.gig_hourly_rate;
        currentJustification = record.justification; 
        
        if (type !== 'justification') currentJustification = null;

        if (record.is_finalized && !isEdit) return res.status(400).json({ error: "Dia já finalizado." });
        events = JSON.parse(record.events || "[]");
      }

      if (isEdit) {
        if (originalTime) {
          const idx = events.findIndex((e) => e.type === type && e.time === originalTime);
          if (idx !== -1) events[idx] = { type, time, is_manual: true };
        } else {
          const idx = events.findIndex((e) => e.type === type);
          if (idx !== -1) events[idx] = { type, time, is_manual: true };
          else events.push({ type, time, is_manual: true });
        }
      } else {
        events.push({ type, time, is_manual: !!is_manual });
      }
      events.sort((a, b) => a.time.localeCompare(b.time));

      db.get("SELECT * FROM userSettings WHERE userId = ?", [userId], (errS, settings) => {
        if(errS) return res.status(500).json({error: "Erro settings"});
        
        db.get("SELECT * FROM month_configs WHERE userId = ? AND month_key = ?", [userId, monthKey], (errM, monthConfig) => {
           
            // (UPDATE V3.1) Busca override com is_holiday
            db.get("SELECT day_type, is_holiday, gig_hourly_rate FROM planner_overrides WHERE userId = ? AND date = ?", [userId, recordDate], (errO, override) => {
                
                // Se o override tiver taxa de gig especifica, usa ela, senão usa a do record ou a do parametro
                if (override && override.day_type === 'GIG' && override.gig_hourly_rate > 0) {
                    currentGigRate = override.gig_hourly_rate;
                }

                const recordData = {
                    is_gig: currentIsGig,
                    gig_hourly_rate: currentGigRate,
                    justification: currentJustification
                };

                const calcs = calculateDailyTotals(events, settings, recordDate, override, monthConfig, recordData);
                const eventsStr = JSON.stringify(events);
                const aggsStr = JSON.stringify(calcs);

                const sqlUpsert = `
                    INSERT INTO pointRecords (userId, date, events, aggregates, is_gig, gig_hourly_rate, justification, is_finalized, is_holiday)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)
                    ON CONFLICT(userId, date) DO UPDATE SET
                        events = excluded.events,
                        aggregates = excluded.aggregates,
                        is_gig = excluded.is_gig,
                        gig_hourly_rate = excluded.gig_hourly_rate,
                        justification = excluded.justification,
                        updated_at = CURRENT_TIMESTAMP
                `;

                db.run(sqlUpsert, [userId, recordDate, eventsStr, aggsStr, currentIsGig, currentGigRate, currentJustification], function(errUp) {
                    if (errUp) return res.status(500).json({ error: "Erro ao salvar ponto." });
                    res.json({
                        success: true,
                        date: recordDate,
                        events,
                        aggregates: calcs,
                        is_gig: !!currentIsGig,
                        is_finalized: record ? record.is_finalized : 0
                    });
                });
            });
        });
      });
  });
});

app.get("/api/point/today", authenticateToken, (req, res) => {
  const userId = req.user.userId;
  let date = req.query.date;
  if (!date) date = new Date().toISOString().split("T")[0];

  db.get("SELECT * FROM pointRecords WHERE userId = ? AND date = ?", [userId, date], (err, record) => {
    if (err) return res.status(500).json({ error: "Erro DB" });
    if (!record) {
      return res.json({
        date,
        events: [],
        aggregates: {},
        is_gig: false,
        justification: null,
        is_finalized: false,
      });
    }
    res.json({
      date: record.date,
      events: JSON.parse(record.events),
      aggregates: JSON.parse(record.aggregates),
      is_gig: !!record.is_gig,
      justification: record.justification,
      is_finalized: !!record.is_finalized,
    });
  });
});

app.put("/api/point/finalize", authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const date = req.body.date || new Date().toISOString().split("T")[0];
  db.run("UPDATE pointRecords SET is_finalized = 1 WHERE userId = ? AND date = ?", [userId, date], function(err){
      if(err) return res.status(500).json({error: "Erro finalize"});
      res.json({success: true});
  });
});

app.put("/api/point/unfinalize", authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const date = req.body.date || new Date().toISOString().split("T")[0];
    db.run("UPDATE pointRecords SET is_finalized = 0 WHERE userId = ? AND date = ?", [userId, date], function(err){
        if(err) return res.status(500).json({error: "Erro unfinalize"});
        res.json({success: true});
    });
});

app.delete("/api/point/clear", authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const date = req.body.date || new Date().toISOString().split("T")[0];
    db.run("DELETE FROM pointRecords WHERE userId = ? AND date = ?", [userId, date], function(err){
        if(err) return res.status(500).json({error: "Erro clear"});
        res.json({success: true, date, events:[], aggregates:{}});
    });
});

app.get("/api/point/summary/month", authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const monthPrefix = `${year}-${month}%`;
  
    const sql = `
          SELECT 
              SUM(json_extract(aggregates, '$.farm_he_value')) as total_he,
              SUM(json_extract(aggregates, '$.farm_estourado_value')) as total_estourado,
              SUM(json_extract(aggregates, '$.farm_gig_value')) as total_gig,
              SUM(json_extract(aggregates, '$.deduction_value')) as total_deduction,
              SUM(json_extract(aggregates, '$.extra_minutes')) as total_extra_min
          FROM pointRecords 
          WHERE userId = ? AND date LIKE ? AND is_finalized = 1
      `;
  
    db.get(sql, [userId, monthPrefix], (err, row) => {
      if (err) return res.status(500).json({ error: "Erro Summary" });
      const totalHE = (row.total_he || 0) + (row.total_estourado || 0);
      const totalGig = row.total_gig || 0;
      const totalDeduction = row.total_deduction || 0;
      
      const totalFarmExtra = (totalHE + totalGig) - totalDeduction;

      res.json({
        total_farm_extra: totalFarmExtra,
        total_extra_minutes: row.total_extra_min || 0,
        breakdown: {
            he: totalHE,
            gig: totalGig,
            deduction: totalDeduction
        }
      });
    });
});

// --- Rotas Admin ---
app.get("/api/admin/users", authenticateToken, isAdmin, (req, res) => {
    db.all("SELECT userId, name, login, email, role, is_first_login FROM users", [], (err, rows) => {
        if(err) return res.status(500).json({error: "Erro DB"});
        res.json(rows);
    });
});
app.post("/api/admin/users", authenticateToken, isAdmin, (req, res) => {
    const { name, login, email, role } = req.body;
    bcrypt.hash("dummy", SALT_ROUNDS, (errHash, hash) => {
        if(errHash) return res.status(500).json({error: "Erro hash"});
        const sql = "INSERT INTO users (name, login, email, password_hash, role, is_first_login) VALUES (?, ?, ?, ?, ?, 1)";
        db.run(sql, [name, login, email, hash, role||'user'], function(err){
            if(err) return res.status(500).json({error: "Erro create user"});
            const newId = this.lastID;
            db.run("INSERT INTO userSettings (userId) VALUES (?)", [newId]);
            res.status(201).json({success: true, userId: newId});
        });
    });
});

app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend", "index.html"));
});

// --- LÓGICA DE CÁLCULO V3.1 (Atualizada para Flag is_holiday) ---

function calculateDailyTotals(events, settings, dateStr, overrideRow, monthConfig, recordData = {}) {
    const { is_gig, gig_hourly_rate, justification } = recordData;
    
    // 1. Falta
    if (justification === 'Falta') {
        const salario = settings.salary_monthly || 0;
        const deduction = salario / 30;
        return {
            effective_worked_minutes: 0,
            farm_jornada_value: 0,
            farm_he_value: 0,
            farm_estourado_value: 0,
            farm_gig_value: 0,
            deduction_value: parseFloat(deduction.toFixed(2)),
            extra_minutes: 0,
            estourado_minutes: 0,
            status_desc: "Falta Injustificada"
        };
    }
    
    if (justification) {
        return {
            effective_worked_minutes: 0,
            farm_jornada_value: 0,
            farm_he_value: 0,
            farm_estourado_value: 0,
            farm_gig_value: 0,
            deduction_value: 0,
            extra_minutes: 0,
            status_desc: justification
        };
    }

    // 2. Cálculo de Tempos
    const timeToMin = (t) => {
        const [h, m] = t.split(":").map(Number);
        return h * 60 + m;
    };
    
    let workedMinutes = 0;
    let almocoMinutes = 0;
    let pauseMinutes = 0;
    let entryTime = null;

    const findEvent = (t) => events.find((e) => e.type === t);
    const entrada = findEvent("entrada");
    const saida = findEvent("saida");
    const aOut = findEvent("almoco_saida");
    const aIn = findEvent("almoco_retorno");
    
    const pOuts = events.filter((e) => e.type === "pausa_start").sort((a,b)=>a.time.localeCompare(b.time));
    const pIns = events.filter((e) => e.type === "pausa_end").sort((a,b)=>a.time.localeCompare(b.time));

    while (pOuts.length > 0 && pIns.length > 0) {
        let start = pOuts.shift();
        let endIdx = pIns.findIndex(e => e.time > start.time);
        if (endIdx !== -1) {
            let end = pIns.splice(endIdx, 1)[0];
            pauseMinutes += timeToMin(end.time) - timeToMin(start.time);
        }
    }

    if (entrada) {
        entryTime = timeToMin(entrada.time);
        let endTime = saida ? timeToMin(saida.time) : null;
        if (aOut && aIn) almocoMinutes = timeToMin(aIn.time) - timeToMin(aOut.time);
        
        if (endTime) {
            let totalSpan = endTime - entryTime;
            let discounts = 0;
            if (almocoMinutes > 0 && !settings.is_almoco_pago) discounts += almocoMinutes;
            discounts += pauseMinutes;
            workedMinutes = Math.max(0, totalSpan - discounts);
        } else {
             if (aOut) workedMinutes += Math.max(0, timeToMin(aOut.time) - entryTime);
        }
    }

    // 3. Cálculo Financeiro
    let valorMinutoBase = 0;
    if (monthConfig && monthConfig.base_hourly_rate > 0) {
        valorMinutoBase = monthConfig.base_hourly_rate / 60;
    } else {
        valorMinutoBase = (settings.salary_monthly || 0) / (220 * 60);
    }

    // A) DIÁRIA (GIG)
    if (is_gig) {
        const gigRateMin = gig_hourly_rate / 60;
        const gigTotal = workedMinutes * gigRateMin;
        return {
            effective_worked_minutes: workedMinutes,
            farm_jornada_value: 0,
            farm_he_value: 0,
            farm_estourado_value: 0,
            farm_gig_value: parseFloat(gigTotal.toFixed(2)),
            deduction_value: 0,
            extra_minutes: 0,
            estourado_minutes: 0,
            is_gig: true,
            saida_sugerida_minutes: 0,
            almoco_minutes_total: almocoMinutes,
            pause_minutes_total: pauseMinutes
        };
    }

    // B) DIA NORMAL
    const jornadaDiaria = settings.jornada_diaria_minutes || 440;
    const limiteHE = settings.max_he_minutes || 120;
    const multHE = settings.multiplicador_hora_extra || 1.5;
    
    let dailyMult = 1.0;
    let heMult = multHE;
    let isDayWithMultiplier = false;

    // (NOVO V3.1) Checa Override FLAG is_holiday
    if (overrideRow && overrideRow.is_holiday === 1) {
        const multFeriado = settings.holiday_multiplier || settings.multiplicador_feriado_domingo || 2.0;
        isDayWithMultiplier = true;
        dailyMult = multFeriado;
        heMult = multFeriado;
    } else {
        // Checa Domingo
        const dt = new Date(dateStr + "T12:00:00Z");
        if (dt.getUTCDay() === 0) { 
            if (settings.sunday_rule === "EXTRA") {
                const sundayMult = settings.sunday_multiplier || 2.0;
                isDayWithMultiplier = true;
                dailyMult = sundayMult;
                heMult = sundayMult;
            }
        }
    }

    let saldo = workedMinutes - jornadaDiaria;
    let extraMinutes = 0;
    let estouradoMinutes = 0;
    let deficitMinutes = 0;

    if (saldo > 0) {
        extraMinutes = Math.min(saldo, limiteHE);
        estouradoMinutes = Math.max(0, saldo - limiteHE);
    } else {
        deficitMinutes = Math.abs(saldo);
    }

    const minutosJornadaRealizados = Math.min(workedMinutes, jornadaDiaria);
    
    let farmJornada = minutosJornadaRealizados * valorMinutoBase * dailyMult;
    let farmHE = 0;
    let farmEstourado = 0;

    if (!isDayWithMultiplier) {
        farmHE = extraMinutes * valorMinutoBase * multHE;
        farmEstourado = estouradoMinutes * valorMinutoBase * multHE;
    } else {
        farmHE = extraMinutes * valorMinutoBase * dailyMult;
        farmEstourado = estouradoMinutes * valorMinutoBase * dailyMult;
    }

    let saidaSugerida = 0;
    if (entryTime !== null) {
        let almocoPadrao = settings.tempo_almoco_minutes || 60;
        if (almocoMinutes > 0) almocoPadrao = almocoMinutes;
        saidaSugerida = entryTime + jornadaDiaria;
        if (!settings.is_almoco_pago) saidaSugerida += almocoPadrao;
    }

    return {
        effective_worked_minutes: workedMinutes,
        almoco_minutes_total: almocoMinutes,
        pause_minutes_total: pauseMinutes,
        saida_sugerida_minutes: saidaSugerida,
        
        extra_minutes: extraMinutes,
        estourado_minutes: estouradoMinutes,
        deficit_minutes: deficitMinutes,

        farm_jornada_value: parseFloat(farmJornada.toFixed(2)),
        farm_he_value: parseFloat(farmHE.toFixed(2)),
        farm_estourado_value: parseFloat(farmEstourado.toFixed(2)),
        farm_gig_value: 0,
        deduction_value: 0,
        
        is_day_with_multiplier: isDayWithMultiplier,
        valor_por_minuto: valorMinutoBase,
        valor_por_minuto_extra: valorMinutoBase * heMult
    };
}

// Lógica Auditor
function calculatePendingDates(settings, overrides, records, startStr, endStr) {
    const pending = [];
    let current = new Date(startStr);
    const end = new Date(endStr);
    
    const recordMap = {};
    records.forEach(r => recordMap[r.date] = true);
    
    const overrideMap = {};
    overrides.forEach(o => overrideMap[o.date] = o);
    
    let weeklyPattern = [1,1,1,1,1,0,0];
    if (settings.scale_work_days) {
        try { weeklyPattern = JSON.parse(settings.scale_work_days); } catch(e){}
    }
    const getPatternIdx = (jsDay) => jsDay === 0 ? 6 : jsDay - 1;

    while(current < end) {
        const dStr = current.toISOString().split("T")[0];
        
        if (!recordMap[dStr]) {
            let shouldWork = false;
            
            // 1. Checa Override
            if (overrideMap[dStr]) {
                // (UPDATE V3.1) A lógica agora olha para day_type explicitamente
                if (overrideMap[dStr].day_type === 'WORK') shouldWork = true;
                // Se for OFF ou GIG, não cobra no auditor (GIG é opcional)
            } else {
                // 2. Checa Escala Padrão
                const dayOfWeek = current.getDay();
                const pIdx = getPatternIdx(dayOfWeek);
                if (weeklyPattern[pIdx] === 1) shouldWork = true;
            }

            if (shouldWork) {
                pending.push(dStr);
            }
        }
        current.setDate(current.getDate() + 1);
    }
    return pending;
}

app.listen(PORT, () => {
  console.log(`\n--- SmartClockin V3.1 Server ---`);
  console.log(`Port: ${PORT}`);
  console.log(`Local: http://localhost:${PORT}`);
});