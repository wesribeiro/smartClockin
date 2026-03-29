# Ponto Inteligente - Documentação do Projeto (V3.0)

## Diário de Bordo: 28 de Dezembro de 2025 (V3.0 - Gestão de Jornada e Diárias)

### 1. O Conceito (V3.0)

A Versão 3.0 transforma o SmartClockin de um registrador de ponto em um **Gestor de Jornada Completo**. 
O foco agora é a precisão financeira absoluta ("Centavo por Centavo") e a gestão de exceções.

O sistema entende que a vida real tem imprevistos: você esquece de bater o ponto, troca o dia da folga ou faz um "bico" (diária) no seu dia de descanso. O aplicativo agora audita esses eventos e garante que o cálculo final bata com a realidade do pagamento.

### 2. Novas Regras de Negócio (V3.0)

#### 2.1. O Auditor de Jornada
Ao abrir o aplicativo, o sistema verifica o passado. Se houver dias marcados como "Trabalho" no planejamento que não possuem registros de ponto, o sistema cobra uma justificativa:
* **Esqueci:** Permite lançar os horários manualmente.
* **Falta:** O sistema calcula o valor do dia e **subtrai** do salário mensal.
* **Folga/Compensação:** O dia é ignorado no financeiro.
* **Feriado:** Considera como descanso remunerado.

#### 2.2. Lógica de "Diária por Hora" (Trabalho na Folga)
Se você trabalhar em um dia que estava planejado como **FOLGA**:
* O sistema **não** usa o Salário Base nem o divisor de horas extras comum.
* O cálculo é: `Horas Trabalhadas × Valor da Hora de Folga`.
* *Exemplo:* Valor configurado R$ 20,00/h. Trabalhou 6 horas no domingo de folga = Recebe R$ 120,00 limpos (somados ao salário).

#### 2.3. Estimativa Líquida
Foi adicionado um campo para informar a "% de Descontos (INSS/IRRF)". O sistema exibe o total Bruto e uma estimativa do Líquido para facilitar o planejamento financeiro do usuário.

### 3. Requisitos Técnicos

* **Stack:** Node.js (Backend), SQLite (Banco de Dados), Vanilla JavaScript (Frontend), Tailwind CSS.
* **Cálculo Híbrido:** O backend agora suporta dois modos de cálculo simultâneos no mesmo mês:
    1.  **Regime CLT Padrão:** Salário Mensal + Extras (para dias de escala).
    2.  **Regime Horista/Diária:** Valor por Hora (para dias de folga trabalhados).

### 4. Estrutura de Dados (Schema V3.0)

Além das tabelas da V2 (`month_configs`, `day_records`), novos campos são necessários em `userSettings`:

* `valor_hora_folga`: (Real) Valor pago por hora em dias de folga (ex: 20.00).
* `percentual_descontos`: (Real) Estimativa de descontos em folha (ex: 10.0).
* `bloquear_pendencias`: (Boolean) Se true, esconde os valores monetários enquanto houver dias não justificados.

### 5. Manual da Aplicação

#### 5.1. Fluxo Diário (O Auditor)
1.  Abra o app.
2.  Se houver dias passados em aberto, um card amarelo aparecerá: "Você tem 2 dias pendentes".
3.  Clique em "Resolver". O sistema perguntará dia a dia: "Você trabalhou neste dia?".
4.  Responda honestamente para que o cálculo financeiro seja corrigido (Falta desconta, Trabalho soma).

#### 5.2. Configurações (Ajustes)
* **Valor Hora (Folga):** Defina quanto você ganha por hora ao trabalhar nas suas folgas (bicos/diárias).
* **Descontos:** Insira a % média que vem descontada no seu contracheque para ter uma visão realista do saldo.

#### 5.3. Relatórios
A nova tela de relatórios exibe o "Espelho de Ponto":
* Lista de todos os dias do mês.
* Ícones de status: ✅ (Trabalhado), ➖ (Folga), ❌ (Falta), 💰 (Diária Extra).
* Resumo Financeiro no rodapé:
    * (+) Salário Base
    * (+) Horas Extras (Dias Normais)
    * (+) Adicional Diárias (Dias de Folga)
    * (-) Desconto de Faltas
    * **(=) Total Bruto**
    * (-) Descontos Impostos
    * **(=) Total Líquido Estimado**

### 6. Plano de Ação (Implementação V3.0)

1.  **Backend:** Atualizar `database.js` com novos campos de settings. Atualizar `server.js` para processar justificativas de falta e cálculo de diária.
2.  **Frontend (Settings):** Adicionar inputs para "Valor Hora Folga" e "% Descontos".
3.  **Frontend (Auditor):** Criar o componente visual que detecta pendências e o Modal de Justificativa.
4.  **Frontend (Relatórios):** Implementar a visualização de lista com o resumo financeiro detalhado.

---

### Histórico de Versões
* **V1.0:** Registro de ponto simples e cálculo diário básico.
* **V2.0:** Introdução do "Mês Vivo", Planejador Mensal e Escalas (12x36/Semanal).
* **V3.0 (Atual):** Gestão de Pendências (Faltas/Justificativas), Diária por Hora e Relatório Financeiro Completo.