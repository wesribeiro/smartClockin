const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const path = require("path");

// Garante que o DB seja criado no diretório 'backend'
const DB_SOURCE = path.resolve(__dirname, "ponto.db");

// Tabela de Usuários
const createUsersTable = `
CREATE TABLE IF NOT EXISTS users (
    userId INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    login TEXT NOT NULL, 
    email TEXT UNIQUE,
    password_hash TEXT,
    role TEXT CHECK(role IN ('user', 'admin')) NOT NULL DEFAULT 'user',
    is_first_login INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);`;

// Índice único para login
const createLoginIndex = `
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_login ON users(login);
`;

// Tabela de Configurações
const createUserSettingsTable = `
CREATE TABLE IF NOT EXISTS userSettings (
    userId INTEGER PRIMARY KEY,
    salary_monthly REAL DEFAULT 0,
    jornada_diaria_minutes INTEGER DEFAULT 440,
    entrada_padrao TEXT DEFAULT '07:00',
    saida_almoco_padrao TEXT DEFAULT '12:00',
    retorno_almoco_padrao TEXT DEFAULT '13:00',
    saida_padrao TEXT DEFAULT '15:20',
    tempo_almoco_minutes INTEGER DEFAULT 60,
    dias_trabalho_por_semana INTEGER DEFAULT 6,
    multiplicador_hora_extra REAL DEFAULT 1.5,
    multiplicador_feriado_domingo REAL DEFAULT 2.0,
    fgts_percent REAL DEFAULT 8.0,
    has_15min_pause INTEGER DEFAULT 1,
    pause_policy TEXT DEFAULT 'per_day',
    tolerancia_entrada_minutes INTEGER DEFAULT 10,
    alert_voice_on INTEGER DEFAULT 1,
    timezone TEXT DEFAULT 'America/Sao_Paulo',
    adicional_noturno_percent REAL DEFAULT 20.0,
    disable_sunday_auto_multiplier INTEGER DEFAULT 0,
    is_almoco_pago INTEGER DEFAULT 0,
    max_he_minutes INTEGER DEFAULT 120,
    
    /* Configurações de Escala V3.1 */
    scale_type TEXT DEFAULT 'WEEKLY', /* WEEKLY, 12X36 */
    scale_work_days TEXT DEFAULT '[1,1,1,1,1,1,0]', /* Seg-Sab */
    scale_12x36_anchor_date TEXT,
    sunday_rule TEXT DEFAULT 'EXTRA', /* EXTRA, NORMAL */
    sunday_multiplier REAL DEFAULT 2.0,
    holiday_multiplier REAL DEFAULT 2.0
);`;

// Tabela de Configuração Mensal
const createMonthConfigsTable = `
CREATE TABLE IF NOT EXISTS month_configs (
    configId INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    month_key TEXT NOT NULL,
    planned_work_days INTEGER DEFAULT 0,
    base_hourly_rate REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(userId, month_key)
);`;

// Tabela de Overrides do Planner (Atualizada V3.1)
// Adicionado campo is_holiday para separar a natureza do dia da ação (trabalhar/folgar)
const createPlannerOverridesTable = `
CREATE TABLE IF NOT EXISTS planner_overrides (
    overrideId INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    date TEXT NOT NULL,
    day_type TEXT CHECK(day_type IN ('WORK', 'OFF', 'HOLIDAY', 'GIG')) NOT NULL, /* Mantendo HOLIDAY no check por legado, mas usaremos WORK/OFF + flag */
    is_holiday INTEGER DEFAULT 0, /* 0 ou 1 */
    notes TEXT,
    gig_hourly_rate REAL DEFAULT 0, /* Salvar taxa específica para o dia */
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(userId, date)
);`;

// Tabela de Registros de Ponto
const createPointRecordsTable = `
CREATE TABLE IF NOT EXISTS pointRecords (
    recordId INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    date TEXT NOT NULL,
    events TEXT DEFAULT '[]',
    aggregates TEXT DEFAULT '{}',
    is_holiday INTEGER DEFAULT 0, /* Legacy: Mantido, mas Planner tem prioridade */
    is_finalized INTEGER DEFAULT 0,
    justification TEXT,
    is_gig INTEGER DEFAULT 0,
    gig_hourly_rate REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users (userId) ON DELETE CASCADE,
    UNIQUE(userId, date)
);`;

const createPointRecordsUpdateTrigger = `
CREATE TRIGGER IF NOT EXISTS update_pointRecords_updated_at
AFTER UPDATE ON pointRecords FOR EACH ROW
BEGIN
    UPDATE pointRecords SET updated_at = CURRENT_TIMESTAMP WHERE recordId = OLD.recordId;
END;`;

const db = new sqlite3.Database(DB_SOURCE, (err) => {
  if (err) {
    console.error("Erro fatal ao conectar ao DB:", err.message);
    throw err;
  } else {
    console.log("Conectado ao banco de dados SQLite em", DB_SOURCE);
    db.serialize(() => {
      // Função Auxiliar de Migração
      const addColumn = (tableName, columnName, columnDefinition, callback) => {
        db.run(
          `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`,
          (alterErr) => {
            if (alterErr && alterErr.message.includes("duplicate column name")) {
              // Ignora se já existe
            } else if (alterErr) {
              console.error(`Erro ao adicionar coluna '${columnName}' em '${tableName}':`, alterErr);
            } else {
              console.log(`Coluna '${columnName}' adicionada com sucesso em '${tableName}'.`);
            }
            if (callback) callback(alterErr);
          }
        );
      };

      // 1. Users
      db.run(createUsersTable, (err) => {
        if (!err) {
             const saltRounds = 10;
             const defaultPassword = "@1254";
             bcrypt.hash(defaultPassword, saltRounds, (errHash, hash) => {
               if(!errHash) {
                 db.run(`UPDATE users SET login = ? WHERE userId = ? AND login IS NULL`, ["admin", 1]);
                 db.run(`UPDATE users SET login = ? WHERE userId = ? AND login IS NULL`, ["user", 2]);
                 db.run(`INSERT OR IGNORE INTO users (userId, name, login, email, password_hash, role, is_first_login) VALUES (?, ?, ?, ?, ?, ?, ?)`, [1, "Admin Padrão", "admin", "admin@example.com", hash, "admin", 0]);
                 db.run(`INSERT OR IGNORE INTO users (userId, name, login, email, password_hash, role, is_first_login) VALUES (?, ?, ?, ?, ?, ?, ?)`, [2, "Usuário Padrão", "user", "user@example.com", hash, "user", 0]);
                 db.run(createLoginIndex);
               }
             });
        }
      });

      // 2. Settings
      db.run(createUserSettingsTable, (err) => {
        if (!err) {
          db.run("INSERT OR IGNORE INTO userSettings (userId) VALUES (?), (?)", [1, 2]);
          // Migrações V2
          addColumn("userSettings", "adicional_noturno_percent", "REAL DEFAULT 20.0");
          addColumn("userSettings", "disable_sunday_auto_multiplier", "INTEGER DEFAULT 0");
          addColumn("userSettings", "is_almoco_pago", "INTEGER DEFAULT 0");
          addColumn("userSettings", "max_he_minutes", "INTEGER DEFAULT 120");
          // Migrações V3.1
          addColumn("userSettings", "scale_type", "TEXT DEFAULT 'WEEKLY'");
          addColumn("userSettings", "scale_work_days", "TEXT DEFAULT '[1,1,1,1,1,1,0]'");
          addColumn("userSettings", "scale_12x36_anchor_date", "TEXT");
          addColumn("userSettings", "sunday_rule", "TEXT DEFAULT 'EXTRA'");
          addColumn("userSettings", "sunday_multiplier", "REAL DEFAULT 2.0");
          addColumn("userSettings", "holiday_multiplier", "REAL DEFAULT 2.0");
        }
      });

      // 3. Month Configs
      db.run(createMonthConfigsTable);

      // 4. Planner Overrides (V3.1)
      db.run(createPlannerOverridesTable, (err) => {
          if(!err) {
              // Adicionar colunas novas caso a tabela já exista da versão V3.0
              addColumn("planner_overrides", "is_holiday", "INTEGER DEFAULT 0");
              addColumn("planner_overrides", "gig_hourly_rate", "REAL DEFAULT 0");
          }
      });

      // 5. Point Records
      db.run(createPointRecordsTable, (err) => {
        if (!err) {
            addColumn("pointRecords", "justification", "TEXT");
            addColumn("pointRecords", "is_gig", "INTEGER DEFAULT 0");
            addColumn("pointRecords", "gig_hourly_rate", "REAL DEFAULT 0");
        }
      });

      // 6. Triggers
      db.run(createPointRecordsUpdateTrigger);
    });
  }
});

module.exports = db;