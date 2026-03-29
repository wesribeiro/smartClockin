.

📘 DOCUMENTAÇÃO OFICIAL – SMARTCLOCKIN (VERSÃO CORRIGIDA)
1. PRINCÍPIOS DO SISTEMA

O sistema é baseado em 3 pilares:

1. Fixo (salário base – sempre integral)
2. Variável (horas extras + DSR)
3. Oportunidade (ganhos não realizados)

👉 O sistema NÃO recalcula salário
👉 Ele calcula:

GANHO REAL vs GANHO POTENCIAL
2. PARÂMETROS BASE
2.1 Configurações
salarioBase = 2300.00
cargaSemanal = 44h
jornadaDiaria = 440 min
almoco = 100 min
metaHEDiaria = (ex: 120 min)
limiteHEDiaria = (ex: 120 min)
adicionalHE = 1.5
adicionalDomingoFeriado = 2.0
adicionalNoturno = 1.2
diasTrabalhoSemana = [seg, ter, qua, qui, sex, sab]
2.2 Derivados
divisorMensal = 220

valorHora = salarioBase / divisorMensal
valorMinuto = valorHora / 60

valorHoraExtra = valorHora * 1.5
valorMinutoHE = valorHoraExtra / 60
3. DSR (MODELO OFICIAL)
Regra adotada:

DSR incide sobre horas extras

DSR = (valorTotalHE / diasUteisTrabalhados) * domingosEFeriados
4. CÁLCULOS DIÁRIOS
4.1 Jornada (fixo exibido como progresso)
valorJornadaDia = jornadaDiaria * valorMinuto

👉 Sempre igual
👉 Apenas exibido como “ganho em tempo real”

4.2 Horas Extras do Dia
horasExtrasDia = max(0, minutosTrabalhados - jornadaDiaria)

valorHEDia = horasExtrasDia * valorMinutoHE
4.3 Feriado/Domingo
se (feriado || domingo com 100%):
    valorMinutoHE = valorHora * 2 / 60

⚠️ Substitui o 50%, não acumula

4.4 Valor Total do Dia
valorDia = valorJornadaDia + valorHEDia + adicionalNoturno
5. CÁLCULOS MENSAIS
5.1 CARD: ATUAL (REAL)
Definição:

Quanto você já gerou até agora

valorHEAcumulado = soma(valorHEDia)

DSRAtual =
  (valorHEAcumulado / diasTrabalhados) * domingosEFeriadosPassados

ATUAL =
  salarioBase + valorHEAcumulado + DSRAtual
5.2 CARD: IDEAL
Definição:

Máximo possível no mês

totalDiasUteis = diasTrabalhoNoMes

HEIdealTotal =
  totalDiasUteis * metaHEDiaria

valorHEIdeal =
  HEIdealTotal * valorMinutoHE

DSRIdeal =
  (valorHEIdeal / totalDiasUteis) * domingosEFeriados

IDEAL =
  salarioBase + valorHEIdeal + DSRIdeal
5.3 CARD: PROJETADO (CORRIGIDO)
Definição:

Baseado no que já foi feito + restante ideal

diasRestantes = diasUteisMes - diasTrabalhados

HEFuturo =
  diasRestantes * metaHEDiaria

totalHEProjetado =
  horasExtrasFeitas + HEFuturo

valorHEProjetado =
  totalHEProjetado * valorMinutoHE

DSRProjetado =
  (valorHEProjetado / diasUteisMes) * domingosEFeriados

PROJETADO =
  salarioBase + valorHEProjetado + DSRProjetado
5.4 CARD: PERDA (FINANCEIRA)
Definição:

Quanto você deixou de ganhar por não bater meta

HEEsperadaAteAgora =
  diasTrabalhados * metaHEDiaria

HENaoFeita =
  HEEsperadaAteAgora - horasExtrasFeitas

PERDA =
  HENaoFeita * valorMinutoHE
5.5 CARD: PERDIDO (TEMPO)
Definição:

Tempo perdido por atraso

tempoAtrasos = soma(atrasos)

tempoCompensadoMesmoDia = soma(compensações válidas)

tempoPerdidoLiquido =
  tempoAtrasos - tempoCompensadoMesmoDia
5.6 CARD: COMPENSADO
COMPENSADO = tempoCompensadoMesmoDia
6. REGRAS DE NEGÓCIO CRÍTICAS
6.1 Atraso
Não desconta salário
Reduz capacidade de gerar HE
Impacta apenas:
PERDA (financeira indireta)
PERDIDO (tempo)
6.2 Dias sem registro
Regra atual:
mediaHE = horasExtrasFeitas / diasTrabalhados

para dias sem registro:
  considerar mediaHE
6.3 FUTURO: FALTAS
se dia marcado como falta:
  não conta como dia trabalhado
  não gera HE
  não entra na média
6.4 Meta vs Limite
meta = expectativa (impacta PERDA)
limite = teto (bloqueia cálculo)
7. BARRAS DE PROGRESSO
7.1 Real
REAL% = ATUAL / IDEAL
7.2 Projetado
PROJETADO% = PROJETADO / IDEAL
7.3 Ideal
fixo em 100%
8. CORREÇÕES EM RELAÇÃO À VERSÃO ANTIGA
Corrigido:

✔ “Atual” não depende mais de dias vazios
✔ “Projetado” agora tem lógica consistente
✔ “Perda” não depende mais de projeção errada
✔ DSR aplicado corretamente
✔ Separação clara entre dinheiro e tempo