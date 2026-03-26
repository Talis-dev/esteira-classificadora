# SmartConveyor

Sistema industrial de controle de esteira classificadora com comunicação Modbus TCP dedicada ao CLP Schneider, distribuição inteligente de produtos e interface web responsiva acessível de qualquer dispositivo na rede local.

---

## Visão Geral

O SmartConveyor é um software de automação industrial desenvolvido para gerenciar esteiras classificadoras conectadas a CLPs Schneider via protocolo Modbus TCP. O sistema detecta produtos passando por um sensor de gatilho, calcula automaticamente o tempo de chegada em cada braço desvio e aciona as válvulas no momento exato, garantindo a classificação precisa sem perda de produtos.

Toda a operação é gerenciada por uma interface web moderna, acessível no computador de controle, tablets ou smartphones conectados à mesma rede  sem necessidade de software adicional nos dispositivos de supervisão.

---

## Comunicação com o CLP Schneider

### Protocolo Modbus TCP

A comunicação com o CLP Schneider é feita exclusivamente via **Modbus TCP no modo Client**: o SmartConveyor atua como cliente e o CLP como servidor (Modbus Slave), que é o comportamento padrão dos CLPs Schneider.

### Velocidade e Latência da Comunicação

O ciclo de leitura padrão é de **50 ms**, o que significa que o sistema consulta o CLP **20 vezes por segundo**. Isso garante:

- Captura precisa de pulsos rápidos de RPM e sensor de gatilho
- Tempo de resposta menor que 50 ms para detectar um novo produto
- Acionamento de válvulas com precisão de milissegundos após o cálculo do delay
- Monitoramento em tempo real da velocidade da esteira (RPM  m/s)

A latência típica de uma leitura/escrita Modbus TCP em rede local é de **1 a 5 ms**, portanto o ciclo de 50 ms tem folga suficiente para garantir confiabilidade mesmo em redes com leve congestionamento.

### Mapa de Endereços Modbus

#### Entradas (Leitura do CLP)  Holding Register 16

| Bit | Sinal             | Tipo    | Estado Normal | Função                                    |
|-----|-------------------|---------|---------------|-------------------------------------------|
| 0   | Pulso RPM         | Pulso   | OFF           | Pulso do encoder de rotação da esteira    |
| 1   | Volta Completa    | Pulso   | OFF           | Pulso de referência de uma volta completa |
| 2   | Gatilho Produto   | Pulso   | ON            | Sensor que detecta passagem de produto    |
| 3   | Sensor de Porta   | Digital | ON            | Porta do painel (aberta = falha)          |
| 4   | Inversor OK       | Digital | ON            | Falha no inversor de frequência           |
| 5   | Emergência OK     | Digital | ON            | Botão de emergência acionado              |
| 6   | Motor Rodando     | Digital | OFF           | Confirmação de motor em operação          |

#### Saídas (Escrita no CLP)  Holding Registers 0 e 1

| HR | Bit | Sinal              | Função                            |
|----|-----|--------------------|-----------------------------------|
| 0  | 0   | Modo Higienização  | Ativa modo de limpeza da esteira  |
| 1  | 0   | Válvula Braço 1    | Aciona braço desvio 1             |
| 1  | 1   | Válvula Braço 2    | Aciona braço desvio 2             |
| 1  | 2   | Válvula Braço 3    | Aciona braço desvio 3             |

Todos os endereços são configuráveis pela interface  não há necessidade de alterar código para adaptar a diferentes projetos.

### Reconexão Automática

Caso a comunicação com o CLP seja interrompida (queda de rede, reinício do CLP), o sistema tenta reconectar automaticamente em segundo plano sem intervenção do operador. A reconexão é registrada em log e alertas críticos são gerados se a falha persistir.

---

## Fluxo de Operação

1. **Detecção**: O sensor de gatilho (HR16 bit2) detecta a passagem de um produto.
2. **Leitura**: O SmartConveyor lê o estado do HR16 no próximo ciclo ( 50 ms).
3. **Classificação**: Com base no modo de distribuição configurado, o sistema define qual braço receberá o produto.
4. **Cálculo de Delay**: O sistema usa a velocidade atual da esteira (calculada pelos pulsos de RPM) e a distância configurada entre o sensor e cada braço para calcular o tempo exato de acionamento.
5. **Rastreamento**: O produto entra na fila interna com o timestamp de ativação programado.
6. **Acionamento**: No momento calculado, o sistema escreve o bit da válvula correspondente no CLP (HR1).
7. **Tempo de Ativação**: O pulso dura o tempo configurado por braço (ex: 500 ms), depois a válvula é desligada automaticamente.
8. **Contagem**: O produto é registrado nas estatísticas e no histórico de contagem persistente.

---

## Modos de Distribuição

O operador pode escolher entre três estratégias de distribuição entre os braços:

### Sequencial (Manual)
Cada braço tem uma meta individual de produtos por minuto. O sistema direciona produtos tentando atingir as metas configuradas de forma independente. Ideal quando os braços alimentam linhas com capacidades diferentes.

### Igual (Round-Robin)
O sistema alterna os produtos entre todos os braços habilitados de forma igualitária, um por vez. Garante distribuição perfeitamente balanceada independente de metas.

### Porcentagem
Os produtos são distribuídos proporcionalmente às metas configuradas. Se o Braço 1 tem meta 60 e o Braço 2 tem meta 40, então 60% dos produtos vão para o Braço 1 e 40% para o Braço 2.

---

## Modos de Operação de Cada Braço

Além do modo automático, cada braço pode ser controlado individualmente:

| Modo               | Comportamento                                              |
|--------------------|------------------------------------------------------------|
| Auto               | Acionado automaticamente conforme o modo de distribuição  |
| Forçar Aberto      | Válvula permanentemente aberta (útil para testes/ajustes) |
| Forçar Fechado     | Válvula permanentemente fechada (braço desativado)         |
| Desabilitado       | Braço ignorado completamente na distribuição               |

---

## Modo Higienização (Fachina)

O modo higienização ativa um bit especial no CLP (HR0 bit0) que instrui o CLP a entrar em rotina de limpeza. Pode ser ativado/desativado diretamente pelo dashboard com um único botão. O estado é monitorado em tempo real e exibido com destaque visual no painel de controle.

---

## Interface Web

### Dashboard Principal

O dashboard é a tela central de operação. Atualiza automaticamente a cada 500 ms e exibe:

- **Status da conexão com o CLP** (conectado/desconectado com IP e porta)
- **Estado do sistema** (rodando/parado)
- **Estado de todas as entradas** em tempo real: sensor de porta, inversor, emergência, motor
- **RPM atual e velocidade da esteira** em m/s
- **Produtos em trânsito** (rastreados na esteira no momento)
- **Contadores por braço**: total processado e taxa por minuto, usando os nomes configurados
- **Rejeitados**: produtos que passaram direto sem serem desviados por nenhum braço
- **Modo higienização** com botão de ativação rápida
- **Alertas críticos** com destaque visual

O operador pode **resetar os contadores** com um botão dedicado no cabeçalho, útil ao início de turno.

### Controles de Distribuição

Acessíveis diretamente do dashboard, os controles permitem:

- Alterar o modo de distribuição (Sequencial / Igual / Porcentagem)
- Ajustar a meta por minuto de cada braço
- Salvar a configuração  que persiste mesmo após reinicialização do sistema

As alterações salvas são sincronizadas automaticamente para todos os dispositivos conectados ao dashboard em até 5 segundos.

### Página de Configurações

Protegida por senha de 6 dígitos, reúne todos os parâmetros do sistema em grupos:

- **Conexão CLP**: IP, porta, timeout
- **Parâmetros da esteira**: diâmetro do tambor, pulsos por revolução, relação de transmissão, diâmetro do eixo, debounce do gatilho
- **Endereços Modbus**: HR e bit de cada entrada e saída individualmente
- **Configuraçoes de braços**: nome, delay, tempo de ativação, modo manual
- **Uptime do servidor** com reinicialização segura (disponível apenas com senha correta)

### Múltiplos Dispositivos Simultâneos

O dashboard pode ser aberto em vários dispositivos ao mesmo tempo (computador de controle, tablet do supervisor, smartphone do operador). A tela de distribuição sincroniza automaticamente a cada 5 segundos. O sistema detecta quando um usuário está editando um campo e bloqueia a sincronização até que ele salve ou abandone a edição por mais de 30 segundos, evitando que valores sejam sobrescritos acidentalmente.

---

## Modo de Teste do CLP

A página **Teste CLP** permite testar comunicação Modbus e atuadores de forma segura e independente do sistema de produção:

- **Modo Servidor**: SmartConveyor funciona como servidor Modbus para o CLP conectar
- **Modo Cliente**: SmartConveyor conecta diretamente ao CLP em IP/porta configurável
- **Visualização de Holding Registers em bits**: 16 bits de cada HR em tempo real (HR0, HR1, HR16 e outros configuráveis)
- **Escrita de bits**: Clique em qualquer bit para ligar/desligar em modo **pulso** (temporizado) ou **toggle** (permanente)
- **Acesso rápido às válvulas**: Botões dedicados para pulsar ou travar cada braço individualmente
- **Histórico de operações**: Registro de todos os comandos enviados na sessão
- **Logs em tempo real**: Com opção de pausar o scroll para análise

Ideal para comissionamento inicial, ajuste de delays, verificação de fiação e diagnóstico de problemas sem interferir na produção.

---

## Sistema de Logs

### Logs de Eventos

Todos os eventos são registrados com timestamp, nível e categoria:

| Nível   | Exemplos                                                      |
|---------|---------------------------------------------------------------|
| Info    | Produto detectado, válvula acionada, modo alterado            |
| Sucesso | Conexão estabelecida, produto processado                      |
| Aviso   | Reconexão detectada, input travado                            |
| Erro    | Falha de comunicação, timeout, erro de escrita Modbus         |
| Debug   | Detalhes internos (apenas em modo desenvolvimento)            |

### Armazenamento em Disco

Os logs são gravados em formato **JSONL** (JSON Lines) na pasta `logs/`, com um arquivo por dia:

- `log-YYYY-MM-DD.jsonl`  eventos do sistema
- `count-YYYY-MM-DD.jsonl`  histórico de contagem por braço

Escrita em lote a cada 5 segundos para minimizar operações de I/O. Horário salvo no fuso horário local do servidor.

### Visualização na Interface

A página de Logs exibe:

- Paginação de 100 registros por página (sem travar mesmo com milhares de entradas)
- Ordenação do mais recente para o mais antigo
- Filtro por data
- Navegação First / Anterior / Próxima / Last

### Alertas Críticos

Falhas graves geram alertas visíveis no dashboard até serem reconhecidos:

- Falha de conexão com o CLP
- Emergência acionada
- Inversor em falha
- Input travado (sinal preso pelo tempo configurado)

---

## Instalação

### Pré-requisitos

- Node.js 20 ou superior
- npm ou pnpm
- Rede TCP/IP com acesso ao CLP Schneider na porta Modbus (padrão 502)

### Instalação

```bash
# Entrar na pasta do projeto
cd "C:\SmartConveyor"

# Instalar dependências
npm install

# Build de produção
npm run build

# Iniciar
npm start
```

O sistema estará disponível em `http://localhost:3000`. Para acesso de outros dispositivos na rede, use o IP do computador de controle: `http://192.168.x.x:3000`.

### Desenvolvimento

```bash
npm run dev
```

### Inicialização Automática com o Windows

Para ambientes industriais, o sistema pode ser configurado para iniciar automaticamente com o Windows via **Agendador de Tarefas**, garantindo:

- Início automático ao ligar ou reiniciar a máquina
- Reinício automático em caso de falha do processo
- Funcionamento sem usuário logado
- Sem necessidade de software adicional

O botão **Reiniciar Servidor** na página de configurações (disponível apenas com senha correta) encerra o processo atual, e o Agendador de Tarefas o reinicia automaticamente em segundos.

Guia completo de instalação industrial em [INSTALACAO-WINDOWS.md](INSTALACAO-WINDOWS.md).

---

## Tecnologias

| Tecnologia   | Função                                              |
|--------------|-----------------------------------------------------|
| Next.js 15   | Framework web full-stack com servidor Node.js       |
| React 19     | Interface de usuário reativa                        |
| TypeScript 5 | Tipagem estática para segurança do código           |
| Tailwind CSS | Estilização responsiva (mobile, tablet e desktop)   |
| jsmodbus 4   | Implementação Modbus TCP cliente/servidor           |
| Heroicons    | Ícones da interface                                 |

---

## Estrutura de Arquivos

```
/
 src/
    app/
       dashboard/          # Painel de operação principal
       config/             # Configurações do sistema
       logs/               # Visualizador de logs
       test-clp/           # Modo de teste do CLP
       api/                # API REST interna
    components/             # Componentes React
    lib/
       conveyor-controller.ts   # Controlador principal
       modbus-client.ts         # Cliente Modbus TCP
       system-logger.ts         # Logs de eventos
       count-logger.ts          # Histórico de contagens
       critical-alerts.ts       # Alertas críticos
    types/
        conveyor.ts              # Interfaces e tipos
 logs/
    log-YYYY-MM-DD.jsonl         # Logs de eventos (diário)
    count-YYYY-MM-DD.jsonl       # Contagens por braço (diário)
 data/
    conveyor-config.json         # Configuração persistente
    server-state.json            # Estado do servidor
 INSTALACAO-WINDOWS.md            # Guia de instalação industrial
```

---

**SmartConveyor**  Controle industrial de esteira classificadora com CLP Schneider via Modbus TCP.