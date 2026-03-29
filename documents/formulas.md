# Documentação Técnica de Fórmulas e Regras de Negócio

Esta documentação detalha a origem e o cálculo de cada dado exibido nas telas do SmartClockin, diferenciando entradas do usuário de valores calculados.

## 1. Configurações de Referência (Base de Cálculo)

Para os cálculos abaixo, consideramos as seguintes configurações informadas:

*   **Salário Base:** R$ 2.300,00
*   **Jornada Diária:** 7h 20min (440 minutos)
*   **Tempo de Almoço:** 1h 40min (100 minutos)
*   **Horário de Entrada:** 07:00
*   **Dias de Trabalho:** 6 dias por semana (Será alterado para lista de seleção)
*   **Adicional Hora Extra:** 50% (Multiplicador 1.5)
*   **Adicional Feriado/Domingo:** 100% (Multiplicador 2.0)
*   **Adicional Noturno:** 20% (Sobre a hora base)
*   **FGTS:** 8%
*   **Limite de Horas Extras/Dia:** 120 minutos (Será alterado para formato Horas:Minutos)
*   **Meta de HE/Dia:** Abaixo do limite (Mesmo formato)

---

## 2. Dashboard (Resumo do Dia)

Os itens são listados seguindo a ordem visual do print, de cima para baixo.

### 2.1. Relógio e Cabeçalho
*   **Relógio Digital:** Exibe a hora atual do sistema em tempo real (`HH:MM:SS`).
*   **Valor do Dia (R$):**
    *   **Tipo:** Calculado.
    *   **Fórmula:** `Farm Jornada + Farm HE + Farm Adicional Noturno + Farm Feriado`.
    *   **Descrição:** Soma de todos os valores acumulados em tempo real desde a entrada.
*   **Tempo Trabalhado (HH:MM):**
    *   **Tipo:** Calculado.
    *   **Fórmula:** `(Agora - Último Evento de Entrada/Retorno) + Minutos já registrados no dia`.

### 2.2. Card de Detalhes (Farm Bar)
*   **Feriado? (Toggle):**
    *   **Tipo:** Entrada do Usuário (Booleano).
    *   **Impacto:** Se ativo, utiliza o multiplicador de feriado (100%) para todas as horas.
*   **Progresso Total do Dia:**
    *   **Tipo:** Calculado (Barra de progresso).
    *   **Fórmula:** `(Valor Atual / Meta Total do Dia) * 100`.
    *   **Meta Total:** `(Jornada Diária * Valor Minuto Base) + (Limite HE * Valor Minuto HE)`.
*   **Jornada Normal (R$ e Meta):**
    *   **Tipo:** Calculado.
    *   **Fórmula (Valor):** `Minutos Trabalhados (até o limite da jornada) * Valor Minuto Base`.
    *   **Meta:** `440 min * Valor Minuto Base`.
*   **Horas extras totais (R$ e Tempo):**
    *   **Tipo:** Calculado (Acumulado Mensal).
    *   **Fórmula (Tempo):** Somatório de `extra_minutes + estourado_minutes` de todos os dias finalizados do mês atual + HE do dia em curso.
    *   **Fórmula (Valor):** Somatório do valor monetário das HEs do mês.

---

## 3. Saída Sugerida

*   **Horário de Saída (Ex: 16:00):**
    *   **Tipo:** Calculado.
    *   **Fórmula:** `Entrada Real + Jornada Diária (440m) + Almoço Real (ou padrão se não iniciado) + Pausas não contadas`.
    *   **Regra:** Se a pessoa fez menos de 1h40 de almoço, a saída sugerida antecipa. Se fez mais, atrasa.

---

## 4. Tela do Mês (Análise Financeira e Estatística)

### 4.1. Cards Principais
1.  **Atual (Azul):**
    *   **Fórmula:** Soma dos valores de todos os dias logados + (Dias de folga/feriado passados * Valor Dia Ideal).
    *   *Nota: O sistema atualmente pode estar somando dias vazios de forma errada, o que será corrigido.*
2.  **Proj. (Verde):**
    *   **Fórmula:** `Valor Atual + (Dias Futuros de Trabalho * Valor Dia Completo) + (Dias Futuros de Folga * Valor Dia Ideal)`.
    *   **Valor Dia Completo:** `Valor Jornada + Valor Meta HE`.
3.  **Ideal (Roxo):**
    *   **Fórmula:** `Salário Base + (Meta HE Diária * Dias Úteis * Valor HE)`.
    *   **Descrição:** O valor total esperado se o usuário cumprir todas as metas de HE.
4.  **Perda (Vermelho):**
    *   **Fórmula:** `Valor Ideal - Valor Projetado`.
5.  **Perdido (Laranja):**
    *   **Fórmula:** Somatório de minutos não trabalhados (abaixo da jornada) em dias de trabalho.
6.  **Comp. (Azul Escuro):**
    *   **Fórmula:** Minutos de atraso que foram compensados saindo mais tarde no mesmo dia.

### 4.2. Progresso do Mês (Barras)
*   **Ideal:** Barra fixa em 100% representando o alvo financeiro.
*   **Real:** Progresso do `Valor Atual` em relação ao `Ideal`.
*   **Projetado:** Progresso do `Valor Projetado` em relação ao `Ideal`.

---

## 5. Análise Detalhada (Rodapé da Tela Mês)

*   **HE Realizadas:** Somatório de todas as HEs (em minutos) feitas no mês.
*   **HE Esperadas:** `Meta HE Diária * Dias Úteis do Mês`.
*   **Dias Perfeitos:** Quantidade de dias onde `Trabalhado >= Jornada + Meta HE`.
*   **Dias c/ Perda:** Quantidade de dias onde `Trabalhado < Jornada`.

---

## 6. Plano de Implementação: Lista de Tarefas para Correção

Abaixo, os itens que identificamos como prioritários para corrigir as fórmulas e a interface:

### ⚙️ Configurações e Regras
- [ ] **Entrada de Saída Sugerida:** Adicionar campo para o usuário informar o horário que planeja sair (para cálculo de HE prevista).
- [ ] **Dias de Trabalho Checkbox:** Alterar de "6 dias" para uma lista (Seg, Ter, Qua...) onde o usuário marca seus dias úteis.
- [ ] **Padronização de Percentuais:** Alterar labels de multiplicadores para format `%` (ex: 50%, 100%).
- [ ] **Remover Tolerância:** Excluir a regra de tolerância de entrada das configurações.
- [ ] **Limite/Meta de HE:** Alterar inputs de minutos para formato `HH:MM` (ex: `02:00` em vez de `120`).
- [ ] **Regra de 15 Minutos:** Implementar lógica onde 15 min de pausa contam como não trabalhados e acrescem o horário de saída.
- [ ] **Domingos:** Substituir "Desativar multiplicador" por Select [Folga Compensatória, 100%].
- [ ] **Status DSR:** Renomear "DSR Ativo" para "DSR" e descrição para "Considerar DSR?".

### 📱 Layout Tela Mês
- [ ] **Reorganização Visual:**
    1. Nome do Mês e Navegação (Topo)
    2. Calendário (Logo abaixo do mês)
    3. Progresso do Mês
    4. Análise do Mês

### 🧮 Correções de Cálculo
- [ ] **Cálculo do "Atual":** Garantir que dias passados sem log só somem o valor da jornada se forem folgas/feriados oficiais.
- [ ] **Projeção:** Ajustar para que dias futuros assumam a "Meta Completa" definida pelo usuário.
