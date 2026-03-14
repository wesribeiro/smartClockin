const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const path = require("path");

// (CORREÇÃO) Garante que o DB seja criado no diretório 'backend'
const DB_SOURCE = path.resolve(__dirname, "ponto.db");

// Tabela de Usuários (RF1)
// (ATUALIZADO) Adiciona 'login' e torna 'email' opcional
const createUsersTable = `
CREATE TABLE IF NOT EXISTS users (
    userId INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    login TEXT NOT NULL, -- Será UNIQUE via índice
    email TEXT UNIQUE, -- AGORA OPCIONAL
    password_hash TEXT,
    role TEXT CHECK(role IN ('user', 'admin')) NOT NULL DEFAULT 'user',
    is_first_login INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);`;

// (NOVO) Índice único para a coluna login
const createLoginIndex = `
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_login ON users(login);
`;

// Tabela de Configurações (RF2.1)
// (ATUALIZADO) Adicionado campo 'max_he_minutes'
const createUserSettingsTable = `
CREATE TABLE IF NOT EXISTS userSettings (
    userId INTEGER PRIMARY KEY,
    salary_monthly REAL DEFAULT 0,
    jornada_diaria_minutes INTEGER DEFAULT 440, /* 7h20m */
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
    
    /* NOVO CAMPO (Implementação V29) */
    max_he_minutes INTEGER DEFAULT 120

);`;

// Tabela de Registros de Ponto (RF3)
const createPointRecordsTable = `
CREATE TABLE IF NOT EXISTS pointRecords (
    recordId INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    date TEXT NOT NULL, /* Formato YYYY-MM-DD */
    events TEXT DEFAULT '[]', /* JSON Array [{type, time, is_manual}] */
    aggregates TEXT DEFAULT '{}', /* JSON Object com cálculos */
    is_holiday INTEGER DEFAULT 0, /* 0 ou 1 */
    is_finalized INTEGER DEFAULT 0, /* 0 ou 1 */
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users (userId) ON DELETE CASCADE,
    UNIQUE(userId, date)
);`;

// Trigger para atualizar 'updated_at'
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
      // --- Migração (Adiciona colunas novas se não existirem) ---
      const addColumn = (tableName, columnName, columnDefinition, callback) => {
        db.run(
          `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`,
          (alterErr) => {
            if (
              alterErr &&
              alterErr.message.includes("duplicate column name")
            ) {
              // Coluna já existe, ignora o erro
            } else if (alterErr) {
              console.error(
                `Erro ao adicionar coluna '${columnName}' em '${tableName}':`,
                alterErr
              );
            } else {
              console.log(
                `Coluna '${columnName}' adicionada com sucesso em '${tableName}'.`
              );
            }
            if (callback) callback(alterErr);
          }
        );
      };

      // Cria tabela Users (se não existir)
      db.run(createUsersTable, (err) => {
        if (err) console.error("Erro Tabela Users:", err);
        else {
          // (CORRIGIDO) Adiciona a coluna 'login' primeiro, SEM 'UNIQUE'
          addColumn("users", "login", "TEXT", () => {
            // Após garantir que a coluna existe, roda o seed
            const saltRounds = 10;
            const defaultPassword = "@1254";
            bcrypt.hash(defaultPassword, saltRounds, (errHash, hash) => {
              if (errHash) {
                console.error("Erro fatal ao gerar hash:", errHash);
                return;
              }

              // Popula o login dos usuários padrão (Admin e User)
              // Usamos UPDATE para contas existentes e INSERT OR IGNORE para novas
              db.run(
                `UPDATE users SET login = ? WHERE userId = ? AND login IS NULL`,
                ["admin", 1]
              );
              db.run(
                `UPDATE users SET login = ? WHERE userId = ? AND login IS NULL`,
                ["user", 2]
              );

              db.run(
                `INSERT OR IGNORE INTO users (userId, name, login, email, password_hash, role, is_first_login) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                  1,
                  "Admin Padrão",
                  "admin",
                  "admin@example.com",
                  hash,
                  "admin",
                  0,
                ],
                (errInsertAdmin) => {
                  if (errInsertAdmin)
                    console.error("Erro ao inserir admin:", errInsertAdmin);
                }
              );
              db.run(
                `INSERT OR IGNORE INTO users (userId, name, login, email, password_hash, role, is_first_login) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                  2,
                  "Usuário Padrão",
                  "user",
                  "user@example.com",
                  hash,
                  "user",
                  0,
                ],
                (errInsertUser) => {
                  if (errInsertUser)
                    console.error("Erro ao inserir user:", errInsertUser);
                }
              );

              // (CORRIGIDO) Finalmente, cria o índice único
              db.run(createLoginIndex, (errIndex) => {
                if (errIndex)
                  console.error("Erro ao criar índice 'login':", errIndex);
              });
            });
          });
        }
      });

      // Tabela de Configurações
      db.run(createUserSettingsTable, (err) => {
        if (err) {
          console.error("Erro Tabela Settings (CREATE):", err);
          return;
        }

        // Garante que os usuários de seed tenham configurações
        db.run(
          "INSERT OR IGNORE INTO userSettings (userId) VALUES (?), (?)",
          [1, 2],
          (errSeedSettings) => {
            if (errSeedSettings)
              console.error("Erro ao garantir settings:", errSeedSettings);
          }
        );

        // --- Migrações de Colunas de Settings ---
        addColumn(
          "userSettings",
          "adicional_noturno_percent",
          "REAL DEFAULT 20.0"
        );
        addColumn(
          "userSettings",
          "disable_sunday_auto_multiplier",
          "INTEGER DEFAULT 0"
        );
        addColumn("userSettings", "is_almoco_pago", "INTEGER DEFAULT 0");
        addColumn("userSettings", "max_he_minutes", "INTEGER DEFAULT 120");
      }); // Fim do createUserSettingsTable run

      db.run(createPointRecordsTable, (err) => {
        if (err) console.error("Erro Tabela Records:", err);
      });

      db.run(createPointRecordsUpdateTrigger, (err) => {
        if (err) console.error("Erro Trigger Records:", err);
      });
    }); // Fim do db.serialize
  }
});

module.exports = db;
//<!-- Safe version 13/11 - 14h -->
