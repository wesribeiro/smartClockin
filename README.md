# SmartClockin - Sistema de Controle de Ponto Inteligente

Sistema completo de registro de ponto eletrônico com cálculos automáticos de horas extras, adicionais noturnos, feriados e integração com legislação trabalhista brasileira (CLT).

## Funcionalidades

### 1. Registro de Ponto

O aplicativo permite registrar os seguintes eventos de ponto:
- **Entrada**: Hora de início da jornada de trabalho
- **Saída do Almoço**: Quando o funcionário sai para o intervalo
- **Retorno do Almoço**: Quando o funcionário retorna do intervalo
- **Pausa**: Intervalos de pausa durante a jornada
- **Saída**: Término da jornada de trabalho

Cada registro pode ser feito:
- No momento atual (botão "Agora")
- Manual (digitando o horário desejado)

### 2. Dashboard - Painel Principal

O painel principal exibe em tempo real:

#### Barra Superior (Farm Bar)
- **Total de Horas Trabalhadas**: Tempo total trabalhado no dia
- **Valor Total (R$)**: Valor monetário total do dia incluindo jornada + horas extras

#### Barras de Progresso
- **Meta da Jornada**: Progresso em relação à carga horária diária
- **Meta de HE**: Progresso em relação ao limite de horas extras diário

#### Informações em Tempo Real
- **Faltam**: Tempo restante para completar a jornada
- **Hora Extra**: Quantidade de horas extras acumuladas no momento
- **Tempo Estourado**: Quando ultrapassa o limite de HE permitido
- **Atraso**: Minutos de atraso na entrada (se aplicável)

#### Indicadores Visuais
- **Feriado/Domingo**: Card com destaque dourado indicando adicionais
- **Dia Finalizado**: Indicação quando o dia está fechado

### 3. Cálculos Automáticos

O sistema calcula automaticamente:

#### Valor da Hora Base
- Divide o salário mensal pelo divisor mensal configurado
- Considera a jornada diária de trabalho

#### Horas Extras (HE)
- Calcula minutos trabalhados além da jornada diária
- Aplica multiplicador configurado (padrão CLT: 50% = 1.5x)
- Diferencia HE normal de HE Estourada (acima do limite diário)

#### Adicional Noturno
- Percentual adicional para trabalho noturno (padrão: 20%)
- Calculado automaticamente entre 22:00 e 05:00

#### Adicional de Feriado/Domingo
- Percentual adicional para trabalho em dias feriados (padrão: 100% = 2x)
- Inclui Sunday e holidays

#### DSR (Descanso Semanal Remunerado)
- Calcula o valor de DSR baseado nas HE do mês
- Considera domingos e feriados do mês

### 4. Painel Mensal

Visão consolidada do mês com:

#### Cards Principais
- **Valor Atual**: Salário + HE acumuladas até agora + DSR parcial
- **Valor Projetado**: Projeção do total do mês incluindo HE futuras
- **Valor Ideal**: Meta máxima possível considerando DSR completo
- **Perda Financeira**: HE não realizadas × valor da hora extra

#### Indicadores
- **HE Realizado**: Total de horas extras feitas no mês
- **HE Esperado**: Meta de HE para o mês
- **Dias Perfeitos**: Dias com HE completa
- **Dias com Perda**: Dias com déficit de jornada
- **Tempo Perdido**: Minutos além do horário de saída padrão
- **Tempo Compensado**: Minutos compensados / Minutos de atraso

#### Calendário Mensal
- Visualização por dia com código de cores:
  - 🟢 **Verde**: Dia perfeito (jornada + HE esperada)
  - 🟡 **Amarelo**: Dia normal (jornada completa sem HE)
  - 🔴 **Vermelho**: Dia com perda (déficit de jornada)
  - 🟦 **Azul**: Folga
  - 🟠 **Laranja**: Feriado
  - ⚪ **Cinza**: Dia futuro ou sem registro

### 5. Configurações

#### Jornada e Horários
- **Jornada Diária**: Horas e minutos da carga horária diária
- **Intervalo de Almoço**: Tempo de pausa para almoço
- **Entrada Padrão**: Horário habitual de entrada
- **Saída do Almoço**: Horário de saída para almoço
- **Retorno do Almoço**: Horário de retorno do almoço
- **Saída Padrão**: Horário habitual de saída

#### Dias Trabalhados
- Seleção dos dias da semana trabalhados
- Configuração flexível (5 ou 6 dias)

#### Valores e Multiplicadores
- **Salário Base**: Salário mensal bruto
- **Divisor Mensal**: Divisor para cálculo da hora (padrão: 220)
- **Multiplicador HE (%)**: Percentual adicional para horas extras (padrão CLT: 50%)
- **Multiplicador Feriado/Domingo (%)**: Percentual para trabalho em feriados (padrão CLT: 100%)
- **Adicional Noturno (%)**: Percentual para trabalho noturno (padrão: 20%)
- **FGTS (%)**: Percentual de FGTS sobre o salário

#### Regras de Negócio
- **Limite HE**: Máximo de horas extras permitidas por dia
- **Pausa 15min**: Habilitar/desabilitar pausa obrigatória
- **Almoço Pago**: Se o intervalo de almoço conta como trabalhado
- **Política de Domingos**: Gera folga compensatória ou paga 100%
- **Política de Pausa**: Por evento ou por dia
- **Alerta de Voz**: Ativar/desativar notificações sonoras

#### Localização
- **Fuso Horário**: Configuração de timezone

#### Painel Mensal (Configurações)
- **Meta de HE por Dia**: Meta de horas extras esperada diariamente
- **DSR Ativo**: Considerar Descanso Semanal Remunerado nos cálculos

### 6. Relatório Diário

Geração de relatório detalhado do dia com:
- Lista de todos os eventos de ponto
- Total de horas trabalhadas
- Total de horas extras
- Valores calculados (jornada, HE, adicionais)
- Exportação para PNG

### 7. Funcionalidades Administrativas

- **Criar Usuários**: Adicionar novos funcionários
- **Alterar Senha**: Mudar senha de acesso
- **Visualizar Todos os Usuários**: Lista de usuários cadastrados

## Dados Informados ao Usuário

### Tempo Real
| Dado | Descrição |
|------|-----------|
| Total de Horas | Tempo total trabalhado no dia |
| Faltam | Tempo restante para jornada completa |
| Hora Extra | HE acumulada no momento |
| Tempo Estourado | Minutos acima do limite de HE |
| Atraso | Minutos de atraso na entrada |

### Valores Monetários
| Dado | Descrição |
|------|-----------|
| Valor Total Dia | Jornada + HE + adicionais do dia |
| Valor da Hora | Valor por hora trabalhada |
| Valor HE | Valor da hora extra |
| Valor Noturno | Valor da hora noturna |
| Valor Feriado | Valor da hora em feriado |
| Valor DSR | Descanso Semanal Remunerado |

### Mensal
| Dado | Descrição |
|------|-----------|
| Valor Atual | Total acumulado no mês |
| Valor Projetado | Projeção do mês completo |
| Valor Ideal | Meta máxima possível |
| Perda Financeira | HE não realizadas |
| HE Realizado | Total de HE no mês |
| Dias Perfeitos | Dias com meta atingida |

## Configurações Padrão (CLT)

O sistema oferece modo "Padrão CLT" que aplica automaticamente:
- Jornada de 8h48min diárias (440 minutos)
- 1 hora de almoço
- Multiplicador de HE: 50% (1.5x)
- Multiplicador Feriado/Domingo: 100% (2x)
- Adicional Noturno: 20%
- Divisor Mensal: 220
- DSR ativo
- Trabalho de Segunda a Sábado

## Tecnologias

- **Frontend**: HTML, CSS (Tailwind), JavaScript (Vanilla)
- **Backend**: Node.js, Express
- **Banco de Dados**: SQLite
- **Autenticação**: JWT (JSON Web Tokens)

## Instalação

```bash
# Instalar dependências
cd backend
npm install

# Iniciar servidor
npm start
```

A aplicação estará disponível em `http://localhost:3001`

## Estrutura de Arquivos

```
smartClockin/
├── backend/
│   ├── server.js         # Servidor principal
│   ├── database.js       # Conexão SQLite
│   ├── routes/          # Rotas da API
│   └── ...
├── frontend/
│   ├── index.html       # Interface principal
│   ├── app.js          # Lógica do frontend
│   └── ...
├── package.json
└── README.md
```
