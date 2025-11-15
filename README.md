# Ponto Inteligente - Documentação do Projeto (V1.0)

## Diário de Bordo: 15 de Novembro de 2025 (V1.0)

### 1. O Conceito (Não-Técnico)

O "Ponto Inteligente" nasceu da necessidade de transformar o tedioso registro de ponto em uma ferramenta de *empoderamento financeiro*. Em vez de apenas registrar horas, a aplicação permite que o usuário veja, em tempo real, exatamente quanto está ganhando, incluindo horas extras, adicionais noturnos e o impacto de feriados.

O objetivo é gamificar a jornada de trabalho, transformando horas em "farm" (um termo de jogos para "coletar recursos"), incentivando a pontualidade e dando uma visão clara de como cada minuto trabalhado se converte em valor monetário.

### 2. Requisitos Técnicos (V1.0)

* **Stack:** Node.js (Backend), SQLite (Banco de Dados), Vanilla JavaScript (Frontend), Tailwind CSS (Estilização).
* **Design:** Mobile-First, responsivo para desktops.
* **Autenticação:** Sistema de usuários (Admin/User) com login e senha (hash) e autenticação via Token (JWT).
* **Segurança:** Senhas devem ser armazenadas com hash (bcrypt). Usuários criados pelo Admin devem definir sua própria senha no primeiro login.
* **Cálculo:** O backend deve ser a fonte da verdade para todos os cálculos financeiros, recebendo os eventos de ponto e retornando os totais agregados.
* **Personalização:** O usuário deve poder configurar sua própria jornada, salário e multiplicadores.

### 3. Tecnologias (V1.0)

* **Backend:**
    * **Node.js c/ Express:** Servidor web para a API RESTful.
    * **SQLite3:** Banco de dados leve e embarcado para armazenar usuários, configurações e registros.
    * **bcrypt:** Para hash e comparação de senhas.
    * **jsonwebtoken (JWT):** Para gerenciamento de sessão e autenticação de rotas.
    * **cors:** Para permitir a comunicação entre frontend e backend.
* **Frontend:**
    * **Vanilla JavaScript (ES6+):** Para toda a lógica do lado do cliente, manipulação de DOM e chamadas de API (sem frameworks).
    * **Tailwind CSS:** Utilidade-primeiro para estilização rápida e responsiva.
    * **html2canvas:** Biblioteca para gerar capturas de tela (PNG) dos relatórios.

### 4. Estrutura do Projeto

O projeto é um monorepo simples dividido em duas pastas principais:

* `/backend`: Contém `server.js` (API), `database.js` (lógica do DB) e o arquivo `ponto.db`.
* `/frontend`: Contém `index.html`, `app.js` e (futuramente) arquivos estáticos.

### 5. Manual da Aplicação (V1.0)

A aplicação agora possui um fluxo completo, desde a autenticação até o registro de ponto e cálculo de ganhos.

#### 5.1. Autenticação e Admin

* **Login:** A tela de login autentica o usuário contra o `server.js`. O login é feito com um campo "Login" (não email) e "Senha".
* **Primeiro Login:** Usuários criados pelo Admin têm a flag `is_first_login = 1`. Ao tentar logar (com a senha "dummy" ou em branco), eles são direcionados a um modal para definir sua própria senha segura.
* **Painel Admin:** Administradores têm acesso a uma página (`#/admin`) onde podem criar novos usuários (com "Nome", "Login", "Email" (opcional) e "Role") e listar os usuários existentes.

#### 5.2. Dashboard Principal

O dashboard (`#/`) é a tela principal e exibe:

* **Relógio em Tempo Real:** Um relógio (HH:MM:SS) que atualiza a cada segundo.
* **Resumo do Dia:**
    * **Farm Total (R$):** O valor total ganho no dia, atualizado em tempo real.
    * **Horas Trabalhadas (HH:MM):** O total de horas efetivamente trabalhadas, atualizado em tempo real.
    * **Atraso:** Se o primeiro registro ("Entrada") for após a `entrada_padrao` definida nos Ajustes, um aviso de "Atraso: X min" é exibido.
* **Card Expansível:**
    * **Feriado?:** Um toggle que permite marcar o dia como Feriado. Isso recalcula imediatamente os ganhos usando o `multiplicador_feriado_domingo`.
    * **Barras de Progresso:** Barras visuais para a "Meta" (dia normal) e "Meta HE".
    * **Horas Extras Totais:** Exibe o acumulado de HE do mês (dias finalizados) somado à HE do dia atual (em tempo real), mostrando o Valor (R$) e o Tempo (HH:MM).

#### 5.3. Registro de Ponto (Cards)

O núcleo da aplicação. O usuário registra eventos clicando nos cards.

* **Fluxo de Estado:** Os cards são habilitados/desabilitados com base no último evento registrado. Ex: Após "Entrada", habilita "Almoço", "Pausa" e "Saída".
* **Edição:** O ícone de lápis permite editar um horário já registrado.
* **Modal de Registro:** Clicar em um card abre um modal que permite registrar o ponto "Agora" ou inserir um horário manualmente (com teclado virtual no mobile).
* **Card de Almoço:**
    * Ao clicar, registra `almoco_saida`.
    * O card expande, mostrando `time-almoco_saida` e `time-almoco_retorno`.
    * Inicia um contador regressivo.
    * Ao clicar novamente, registra `almoco_retorno`.
    * Após o retorno, exibe o "Total" de tempo de almoço e o "Excesso" (se houver).
* **Card de Pausa (15min):**
    * Funciona de forma idêntica ao Almoço.
    * Ao clicar, registra `pausa_start`. O card muda para a cor azul (indicando "em pausa").
    * Inicia um contador regressivo de 15 minutos.
    * Ao clicar novamente, registra `pausa_end`.
    * Após o retorno, exibe o "Total" de tempo de pausa e o "Excesso" (minutos além dos 15 permitidos).

#### 5.4. Card "Saída Sugerida"

* **Saída Sugerida:** Exibe o horário de saída com base na `entrada` + `jornada_diaria` + `tempo_almoco`.
* **Faltam:** Um contador em tempo real (MM:SS) que mostra quanto tempo falta para a "Saída Sugerida".
* **Saída (c/ 2h HE):** Mostra o horário de saída com o limite máximo de HE (definido em Ajustes).
* **Finalizar o Dia:** Ao bater a "Saída", o app pergunta se o dia deve ser finalizado. Ao confirmar, os registros são travados e os totais do dia são somados ao resumo mensal.

#### 5.5. Painel de Ajustes (`#/settings`)

* **Jornada e Horários:** Permite definir a jornada diária, tempo de almoço e horários padrão.
* **Valores e Multiplicadores:**
    * **Padrão CLT (Toggle):** Quando ativado (padrão), preenche e trava os campos com os valores padrão da CLT (Salário 1518, 6 dias/sem, 1.5x HE, etc.).
    * **Modo Manual:** Quando desativado, os campos são preenchidos com os valores padrão (para edição) e se tornam obrigatórios. O salvamento é bloqueado se algum campo (exceto FGTS) for zero ou inválido.
* **Regras de Negócio:** Permite configurar a política de pausa, tolerância de atraso, limite de HE, etc..
* **Localização:** Define o Timezone (IANA) do usuário, usado pelo backend para garantir que o "dia" correto seja registrado.

### 6. Ideias Futuras (Roadmap V1.1+)

* **Múltiplas Pausas:** (Solicitado pelo usuário) Refatorar a lógica de `pausa_start`/`pausa_end` para permitir múltiplos eventos de pausa por dia (ex: 2x 10min) e somar os totais.
* **Tela de Relatórios:** Implementar a página `#/relatorios`, mostrando um resumo semanal e mensal com gráficos e totais (Farm, HE, Déficit, Atrasos, Dias trabalhados).
* **Tela de Alarmes:** Implementar a página `#/alarmes` para permitir que o usuário configure notificações (ex: 5 minutos antes da Saída Sugerida).
* **Exportação:** Permitir a exportação dos relatórios (PDF/CSV).
* **Gestão de Dias (Admin):** Permitir que o Admin visualize, edite e aprove os registros de ponto dos seus usuários.

### 7. Plano de Ação Imediato

1.  **Relatórios (Frontend):** Iniciar a construção da UI da tela `#/relatorios`.
2.  **Relatórios (Backend):** Criar novos endpoints no `server.js` para buscar dados por período (ex: semana/mês).
3.  **Lógica de Múltiplas Pausas:** Discutir a melhor forma de implementar o registro de múltiplas pausas sem quebrar a lógica de cálculo atual.
