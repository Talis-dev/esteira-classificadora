# Sistema de Esteira Modbus - Operação em Background

## 🚀 Como Funciona em Background

Este sistema foi desenvolvido para **operar continuamente em segundo plano**, sem necessidade de manter o navegador aberto.

### Arquitetura de Background

```
┌─────────────────────────────────────────┐
│        Servidor Next.js (Backend)        │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  Modbus Client (Slave Pool)        │ │
│  │  - Conecta a 192.168.3.200:503     │ │
│  │  - Lê inputs 1-6 continuamente     │ │
│  │  - Auto-reconnect se desconectar   │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  Modbus Server (CLP)               │ │
│  │  - Aguarda conexão do CLP          │ │
│  │  - Porta 502 (0.0.0.0)             │ │
│  │  - Responde a coils 0-11           │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  Sistema de Filas                  │ │
│  │  - Processa inputs                 │ │
│  │  - Gerencia timing                 │ │
│  │  - Envia pulsos para outputs       │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  Sistema de Alertas Críticos       │ │
│  │  - Monitora conexões               │ │
│  │  - Registra falhas                 │ │
│  │  - Notifica quando navegador abre  │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### ✅ O Que Continua Funcionando em Background

1. **Servidor Modbus** - Continua aceitando conexões do CLP
2. **Cliente Modbus** - Continua lendo inputs do Slave Pool
3. **Processamento de Filas** - Continua roteando itens
4. **Envio de Pulsos** - Continua enviando sinais para outputs
5. **Auto-Reconnect** - Reconecta automaticamente se perder conexão
6. **Logging de Erros** - Registra todos os problemas em memória
7. **Rastreamento de Conexões** - Monitora CLPs conectados

### ❌ O Que NÃO Funciona com Navegador Fechado

1. **Interface Visual** - Obviamente não atualiza se não está aberta
2. **Logs em Tempo Real** - Ficam armazenados até você abrir o navegador
3. **Monitoramento Visual** - Gráficos e animações pausam

## 🔔 Sistema de Notificações

### Como Funciona

1. **Sistema opera normalmente** em background
2. **Se houver erro crítico** (perda de conexão, falha no servidor):
   - Erro é registrado no sistema de alertas
   - Aparece no console do servidor (para logs)
   - Fica armazenado em memória

3. **Quando você abre o navegador**:
   - Widget de alertas verifica se há problemas
   - Exibe notificação vermelha no canto superior direito
   - Lista todos os problemas que ocorreram
   - Permite reconhecer os alertas

### Tipos de Alertas

- 🔴 **CRÍTICO** - Falha no servidor Modbus, erro grave
- 🟡 **AVISO** - Conexão perdida mas tentando reconectar

### Categorias

- `connection_lost` - Conexão com Slave Pool perdida
- `server_error` - Erro no servidor Modbus (CLP)
- `client_error` - Erro no cliente Modbus (Slave Pool)

## 📊 Monitoramento de Logs

### Logs em Produção

Para **não sobrecarregar** o sistema em produção:

- ✅ **Logs mantidos**: Erros, avisos, mudanças de estado
- ❌ **Logs removidos**: Respostas Modbus (centenas por segundo)

### Configuração Automática

O sistema detecta automaticamente o ambiente:

- **Desenvolvimento** (`npm run dev`):
  - Todos os logs são exibidos
  - Respostas Modbus aparecem no console
  - Debug detalhado disponível

- **Produção** (`npm run build` + `npm start`):
  - Apenas logs importantes
  - Sem logs de respostas Modbus
  - Performance otimizada

### Página de Teste CLP

Acesse `/test-clp` para diagnóstico detalhado:

- 📡 **Informações do Servidor**: IP, porta, conexões ativas
- 👥 **Conexões Ativas**: Lista de CLPs conectados com IP e tempo de conexão
- 📝 **Últimos 100 Logs**: Visualização em tempo real
- ⏸️ **Pausa de Logs**: Congela logs para análise técnica
- 🎯 **Teste de Pulsos**: Envia pulsos para coils específicos

## 🔧 Como Usar em Produção

### 1. Iniciar o Sistema

```powershell
# Terminal
cd c:\Users\thali\Desktop\Repositorio Talis\esteira_modbus\esteira-modbus-nextjs
pnpm run build
pnpm start
```

### 2. Acessar Interface Inicial

- Abra navegador em `http://localhost:3000`
- Vá para **Dashboard**
- Inicie o sistema (botão "Iniciar Sistema")

### 3. Fechar Navegador

- Sistema **continua rodando** no terminal
- Processamento **não para**
- Conexões **permanecem ativas**

### 4. Verificar Status Depois

- Abra navegador novamente em `http://localhost:3000`
- Widget de alertas mostrará se houve problemas
- Logs estarão disponíveis (últimos 100)
- Dashboard mostrará estado atual

## 🛡️ Garantias de Confiabilidade

### Auto-Reconnect

Se a conexão com Slave Pool cair:

- Sistema tenta reconectar a cada 5 segundos
- Alerta é registrado
- Quando reconectar, alerta de sucesso aparece

### Keep-Alive

Conexões Modbus usam keep-alive:

- Envia pacotes a cada 5 segundos
- Timeout de 30 segundos
- Detecta conexões mortas rapidamente

### Rastreamento de Conexões

Servidor monitora:

- Quantos CLPs estão conectados
- IP e porta de cada conexão
- Última atividade de cada CLP
- Tempo de conexão

## 📱 Futuras Melhorias (Opcional)

Para notificações ainda mais robustas, considere:

1. **Service Workers** - Notificações no desktop do Windows
2. **Telegram Bot** - Alertas por mensagem
3. **Email** - Notificações por email
4. **SMS** - Para alertas críticos

Atualmente, o sistema garante que **todos os alertas são registrados** e mostrados quando você abre o navegador.

## 🎯 Uso Recomendado

### Fluxo de Trabalho do Operador

1. **Manhã**: Liga servidor, abre navegador, inicia sistema
2. **Durante o dia**: Fecha navegador, usa outro sistema
3. **Se houver problema**: Sistema registra automaticamente
4. **Fim do dia**: Abre navegador, verifica se há alertas
5. **Se tudo OK**: Reconhece alertas, fecha

### Fluxo de Trabalho do Técnico

1. Acessa `/test-clp` para diagnóstico
2. Pausa logs para analisar problemas
3. Testa pulsos individuais
4. Verifica conexões ativas
5. Analisa histórico de logs

## ⚙️ Configuração do Sistema

Todos os parâmetros podem ser ajustados em `/config`:

- Endereços IP e portas
- Mapeamento de inputs → outputs
- Duração de pulsos (padrão 1500ms)
- Tempos de tolerância e delay

Sistema **salva automaticamente** e **recarrega** quando detecta mudanças no arquivo.
