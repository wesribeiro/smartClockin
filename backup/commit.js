// commit.js
import { execSync } from "child_process";
import fs from "fs";

const MESSAGE_FILE = "./commit_message.md";

// Verifica se o arquivo existe e não está vazio
if (!fs.existsSync(MESSAGE_FILE)) {
  console.error("❌ Arquivo commit_message.md não encontrado.");
  process.exit(1);
}

const message = fs.readFileSync(MESSAGE_FILE, "utf-8").trim();

if (!message) {
  console.error("⚠️  O arquivo commit_message.md está vazio.");
  process.exit(1);
}

try {
  console.log("📦 Adicionando alterações...");
  execSync("git add .", { stdio: "inherit" });

  console.log("📝 Fazendo commit...");
  execSync(`git commit -F ${MESSAGE_FILE}`, { stdio: "inherit" });

  console.log("🚀 Enviando para o repositório remoto...");
  execSync("git push", { stdio: "inherit" });

  // Opcional: limpar o arquivo após o commit
  fs.writeFileSync(MESSAGE_FILE, "");
  console.log("✅ Commit realizado com sucesso!");
} catch (err) {
  console.error("❌ Erro durante o commit:", err.message);
  process.exit(1);
}
//Safe version 15:12
