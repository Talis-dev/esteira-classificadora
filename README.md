# SmartConveyor

Sistema industrial de controle de esteira classificadora com comunicação Modbus TCP com CLP Schneider, distribuição inteligente de produtos e interface web em tempo real acessível de qualquer dispositivo na rede.

## 🎯 Características

- **Comunicação Modbus TCP Dupla**: Conexões independentes para Slave Pool e CLP
- **Modo Client/Server Configurável**: Suporte dinâmico para ambos os modos em cada conexão
- **Gerenciamento de Filas Inteligente**: Sistema de filas com delay automático baseado em distância física
- **Controle de Tempo Preciso**: Cálculo automático de delays baseado na velocidade e comprimento da esteira
- **Interface em Tempo Real**: Dashboard com atualização automática e monitoramento de conexões
- **Configuração Flexível**: Todos os parâmetros ajustáveis via interface web
- **Modo Limpeza (Fachina)**: Controle dedicado para modo de limpeza da esteira
- **Logs Completos**: Sistema de logs categorizado e alertas críticos
- **Rastreamento de Conexões**: Monitor em tempo real de clientes conectados

## 🚀 Instalação

```bash
# Instalar dependências
npm install

# Modo desenvolvimento
npm run dev

# Build para produção
npm run build

# Iniciar produção
npm start
```

## 🔧 Configuração

### Modos de Conexão

O sistema suporta configuração dinâmica de modos client/server para ambas as conexões:

**Slave Pool (Leitura de Pulsos)**

- **Modo Server**: Sistema aguarda conexão do Slave Pool (ex: Modbus Poll)
  - Porta padrão: `503`
  - Sistema lê dos próprios buffers quando cliente escreve
- **Modo Client**: Sistema conecta ao Slave Pool
  - IP/Porta configuráveis
  - Sistema lê via cliente Modbus

**CLP (Escrita de Comandos)**

- **Modo Server**: Sistema aguarda conexão do CLP
  - Porta configurável
  - CLP lê dos buffers do sistema
- **Modo Client**: Sistema conecta ao CLP (modo atual)
  - IP padrão: `192.168.3.115`
  - Porta padrão: `504`
  - Sistema escreve via cliente Modbus

### Parâmetros da Esteira

- **Comprimento**: 15 metros (padrão)
- **Velocidade**: 0.5 m/s (padrão)
- **Cálculo de Delay**: Automático baseado em distância física
- **Tolerância**: 1 segundo por saída

### Saídas Laterais

Configuração de 5 saídas com delays calculados automaticamente:

| Saída | Distância | Delay | Tolerância | Input | Output | Motor Ativo |
| ----- | --------- | ----- | ---------- | ----- | ------ | ----------- |
| 1     | 2m        | 4s    | 1s         | 1     | 1      | 20s         |
| 2     | 4m        | 8s    | 1s         | 2     | 2      | 20s         |
| 3     | 6m        | 12s   | 1s         | 3     | 3      | 20s         |
| 4     | 8m        | 16s   | 1s         | 4     | 4      | 20s         |
| 5     | 10m       | 20s   | 1s         | 5     | 5      | 20s         |

### Modo Fachina (Limpeza)

- **Coil**: 20 (padrão)
- **Ativação**: Via dashboard ou API
- **Função**: Ativa modo de limpeza da esteira

## 📡 API Endpoints

### Status do Sistema

```
GET /api/modbus/status
```

Retorna estado completo incluindo modos de conexão.

### Controle do Sistema

```
POST /api/modbus/control
Body: { "action": "start" | "stop" }
```

### Modo Fachina

```
POST /api/modbus/control
Body: { "action": "toggleCleaning" }
```

### Configuração

```
GET /api/config          # Obter configuração atual
POST /api/config         # Atualizar configuração
PUT /api/config          # Resetar para padrão
```

### Conexões Ativas

```
GET /api/system/connections  # Lista clientes conectados
```

### Alertas Críticos

```
GET /api/system/alerts?unacknowledged=true
POST /api/system/alerts      # Reconhecer alerta
```

### Reiniciar Sistema

```
POST /api/system/restart
```

### Teste CLP

```
POST /api/modbus/test-clp
Body: { "action": "connect" | "disconnect" | "writeCoil" | "readCoils", ... }
```

## 🎮 Como Usar

1. **Acesse a página inicial** (`http://localhost:3000`)
2. **Configure o sistema** (Settings)
   - Selecione modo Client/Server para cada conexão
   - Configure IPs e portas Modbus
   - Ajuste parâmetros da esteira (comprimento, velocidade)
   - Configure saídas e delays
3. **Inicie o monitoramento** (Dashboard)
   - Clique em "Iniciar Sistema"
   - Acompanhe status das conexões (Server/Client)
   - Monitore filas em tempo real
   - Ative/desative modo fachina
4. **Teste o CLP** (Test CLP)
   - Teste conexões em modo client ou server
   - Envie pulsos individuais ou alternados
   - Leia coils do CLP

## 🔄 Fluxo de Funcionamento

1. **Detecção de Produto**: Sensor de entrada envia pulso Modbus
2. **Classificação**: Sistema identifica tipo de produto (1-5)
3. **Enfileiramento**: Produto adicionado à fila com delay calculado
4. **Processamento**: Sistema monitora tempo de chegada
5. **Ativação**: No momento correto, envia pulso para CLP
6. **Duração Motor**: CLP mantém motor ativo pelo tempo configurado
7. **Validação**: Verifica chegada dentro da tolerância
8. **Timeout**: Cancela produto se ultrapassar tempo máximo

## 🛠️ Tecnologias

- **Next.js 15.1** - Framework React com App Router
- **React 19** - Biblioteca UI
- **TypeScript** - Tipagem estática
- **Tailwind CSS v4** - Estilização utility-first
- **Heroicons v2** - Ícones
- **jsmodbus 4.0.6** - Cliente/Servidor Modbus TCP
- **date-fns** - Manipulação de datas

## ⚠️ Requisitos

- Node.js 20+
- Conexões Modbus TCP configuradas:
  - Slave Pool (client ou server)
  - CLP (client ou server)
- Rede TCP/IP configurada

## 🆕 Novidades

- ✅ Suporte dinâmico client/server em ambas conexões
- ✅ Dashboard mostra modo de cada conexão
- ✅ Cálculo automático de delays baseado em física
- ✅ Motor ativo configurável via holding registers
- ✅ Modo fachina (limpeza)
- ✅ Rastreamento de conexões TCP
- ✅ Sistema de alertas críticos
- ✅ Página de teste do CLP com modos dual
- ✅ Botão abortar para conexões travadas
- ✅ Timeout de 10s para estado "conectando"
- ✅ Auto-disconnect ao recarregar página

## 📝 Licença

Projeto desenvolvido para controle de esteira distribuidora industrial.

---

**SmartConveyor** - Desenvolvido com ❤️ usando Next.js e TypeScript
