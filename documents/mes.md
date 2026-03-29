.

📘 DOCUMENTAÇÃO — FEATURE: MÊS (PAINEL MENSAL)
🎯 Objetivo

Criar uma tela chamada “Mês” responsável por:

Consolidar dados diários
Projetar ganhos mensais
Medir perdas financeiras
Medir perdas de tempo
Permitir edição retroativa de dias
Gerar visão estratégica e comportamental
🧠 Conceito do Produto

A funcionalidade NÃO é apenas um relatório.

Ela é um:

Sistema de análise de desempenho financeiro + eficiência de tempo

Separação obrigatória:

💰 Financeiro → quanto ganhei/perdi
⏱️ Tempo → quanto desperdicei/compensei
🧱 Arquitetura Geral
📌 Estratégia atual
Rodar local (LocalStorage ou IndexedDB)
Estrutura já compatível com backend futuro
🚀 Preparação para backend futuro

Compatível com:

Firebase (Firestore)
Netlify (frontend)
⚠️ Regra crítica (economia no Firebase)

Evitar:

Escritas desnecessárias
Recalcular e salvar tudo a cada mudança

Adotar:

Salvar apenas eventos (dias)
Calcular agregações no frontend
🗂️ Modelagem de Dados
📅 DayRecord
{
  "date": "2026-03-21",

  "entrada": "07:00",
  "saidaAlmoco": "12:00",
  "voltaAlmoco": "13:40",
  "saidaFinal": "18:30",

  "horasTrabalhadas": 9.33,
  "horasExtras": 2.0,

  "valorDia": 100.00,
  "valorExtras": 30.00,

  "atrasoMinutos": 10,
  "tempoCompensadoMinutos": 10,
  "tempoPerdidoMinutos": 0,

  "tipoDia": "normal",
  "isFeriado": false,
  "isDomingo": false,

  "dsrElegivel": true,

  "status": "completo"
}
📆 MonthRecord
{
  "month": 3,
  "year": 2026,

  "salarioBase": 2300,

  "days": [],

  "feriados": ["2026-03-25"],
  "domingosTrabalhados": ["2026-03-08"],

  "configSnapshot": {}
}
⚠️ Importante
NÃO salvar totais agregados (evita custo no Firebase)
Sempre recalcular no frontend
⚙️ Configurações Necessárias
📌 Jornada
{
  "diasTrabalhados": [1,2,3,4,5,6],
  "horasPorDia": 7.33,
  "horasExtrasPadrao": 2,
  "tempoAlmocoMin": 100
}
💰 Financeiro
{
  "salarioBase": 2300,
  "multiplicadorExtra": 1.5,
  "multiplicadorFeriado": 2.0
}
📅 Regras
{
  "domingoTipo": "compensado", 
  "dsrAtivo": true
}
🧠 Comportamental (DIFERENCIAL)
{
  "mostrarTempoPerdido": true,
  "mostrarPerdaFinanceira": true
}
🧮 Regras de Negócio
🎯 1. Valor Ideal do Mês
salarioBase +
(horasExtrasEsperadas × valorHoraExtra) +
DSR estimado +
feriados
📈 2. Valor Atual
Soma dos valores dos dias já registrados
📊 3. Projeção
valorAtual +
(mediaAtual × diasRestantes)
💸 4. Perda Financeira
valorIdeal - valorProjetado
⏱️ 5. Tempo Perdido

Separar:

A. Não compensado
atrasos não recuperados
B. Compensado
tempo extra usado para corrigir atraso
🔥 Insight-chave

Tempo compensado = vida perdida, não dinheiro perdido

🖥️ Estrutura da Tela
🔝 1. Header (Resumo do mês)
Exibir:
Mês/Ano
Botões: anterior / próximo
Cards:
💰 Atual
📈 Projetado
🎯 Ideal
Indicadores:
💸 Perda financeira
⏱️ Tempo perdido
🔁 Tempo compensado
📊 2. Barras de Progresso
Barra Ideal
Total possível
Barra Real
Baseado nos dias feitos
Barra Projetada
Baseado no comportamento atual
📅 3. Calendário
Requisitos:
Mostrar todos os dias do mês
Indicar status visual
Estados:
🟢 Perfeito
🟡 Sem extra
🔴 Perda
⚫ Não preenchido
🔵 Domingo
🟣 Feriado
Interação:
Clique no dia → abrir modal
Modal deve permitir:
Editar horários
Marcar tipo do dia
Ver resumo financeiro
Ver impacto (tempo + dinheiro)
⚙️ 4. Gestão do mês
Permitir:
Marcar feriados
Definir domingos trabalhados
Definir folgas
Ajustes manuais
📈 5. Análise
Mostrar:
Total horas extras feitas
Total horas extras perdidas
Tempo perdido
Tempo compensado
Dias perfeitos vs ruins
Insights automáticos:

Exemplo:

“Você perdeu 2h esse mês com atrasos”
“Você trabalhou 1h a mais só compensando”
🔄 Fluxo de Funcionamento
1. Usuário registra dia

→ Atualiza DayRecord

2. Sistema recalcula mês

→ Função pura (sem salvar)

3. UI atualiza

→ Tempo real

🧠 Estratégia de Performance (CRÍTICO)
❌ NÃO FAZER
Recalcular tudo a cada render
Salvar totais no banco
✅ FAZER
Memoização (ex: useMemo)
Funções puras
Recalcular só quando mudar dados
📦 Estrutura sugerida (frontend)
Pastas:
/src
  /models
  /services
  /calculations
  /screens/month
  /components/calendar
  /components/summary
Funções principais:
calculateDay()
calculateMonth()
calculateProjection()
calculateTimeMetrics()
📄 Exportação (Futuro)
PDF deve conter:
Resumo financeiro
Calendário
Gráficos
Insights
🚨 Riscos
1. Misturar cálculo com UI

→ Quebra manutenção

2. Não separar tempo vs dinheiro

→ Perde diferencial

3. Excesso de precisão

→ Paralisa o projeto

💡 Roadmap sugerido
Fase 1 (agora)
Tela mês funcional
Persistência local
Cálculos básicos
Fase 2
Firebase
Multiusuário
Backup
Fase 3
PDF
Insights avançados
Monetização
📌 Conclusão

Você está construindo algo com potencial real de produto.

O diferencial NÃO é cálculo.

É isso aqui:

Transformar atraso em consciência de perda de vida

Se essa tela entregar isso com clareza:

👉 você tem algo vendável.