Docs: Especificação V3.0 - Gestão de Jornada, Diárias e Auditoria

Implementação da lógica de "Auditor de Jornada" e refinamento do cálculo financeiro para suportar Diárias por Hora e descontos de falta.

Mudanças Funcionais (Regras de Negócio):
- Introdução do "Auditor de Pendências":
  - Identifica dias passados sem registro de ponto.
  - Solicita justificativa: Falta (desconta), Folga (neutro), Feriado (neutro) ou Trabalho (lançar horas).
- Nova Lógica de "Trabalho em Folga" (Diária por Hora):
  - Dias marcados como FOLGA no planner, se trabalhados, não utilizam o salário base.
  - Cálculo: Horas Trabalhadas * Valor da Hora de Folga (Configurável, ex: R$ 20,00).
- Ajuste no Cálculo Mensalista:
  - Salário Base é fixo.
  - Faltas injustificadas descontam do valor do dia (Salário / 30).
  - Horas Extras em dia normal continuam com multiplicador padrão.
- Configurações:
  - Novo campo: Valor da Hora em Folga (Diária).
  - Novo campo: % Estimada de Descontos (INSS/IRRF) para visão líquida.
  - Opção de bloquear visualização de valores se houver pendências.

Mudanças Técnicas Previstas:
- Backend:
  - Atualização na tabela `day_records` para suportar status de justificativa.
  - Novos endpoints para resolver pendências em lote ou individualmente.
  - Refatoração do `calculateDailyTotals` para suportar o modo "Diária por Hora".
- Frontend:
  - Novo Modal "Auditor" na inicialização.
  - Novos campos na tela de Ajustes.
  - Atualização do Relatório para diferenciar tipos de ganho.