# 🔧 Diagnóstico Modbus - Problemas Identificados

## ❌ Problema Principal: Configuração do Modbus Poll

### Configuração Atual (INCORRETA):

- **Mode**: RTU ⚠️
- **Connection**: Modbus TCP/IP
- **IP**: 127.0.0.1
- **Port**: 502

### Problema:

O **Mode** RTU/ASCII é para **Modbus Serial**, não para **Modbus TCP**!

## ✅ Configuração Correta do Modbus Poll:

1. **Connection**: Modbus TCP/IP
2. **IP Address**: 127.0.0.1 (ou o IP da máquina do servidor)
3. **Server Port**: 502
4. **NÃO** deve ter opção RTU/ASCII para Modbus TCP
5. **Protocol**: Deve ser Modbus/TCP (não RTU over TCP)

### Como Corrigir:

1. No Modbus Poll, clique em **"Connection" → "Connection Setup"**
2. Certifique-se que está selecionado **"Modbus TCP/IP"** puro
3. Se aparecer opções RTU/ASCII, você está no modo errado
4. Alguns software têm "Modbus TCP" e "Modbus RTU over TCP" - use **TCP puro**

---

## 🔍 Melhorias Implementadas no Servidor

### 1. Servidor escuta em todas as interfaces

```typescript
this.netServer.listen(this.port, "0.0.0.0", ...)
```

Antes: Apenas localhost  
Agora: Aceita conexões de qualquer IP

### 2. Logs Detalhados

- ✅ Log quando cliente conecta com IP e porta
- ✅ Log de requisições Modbus recebidas
- ✅ Log quando coils são alterados
- ✅ Log de inicialização de registradores

### 3. Rastreamento de Dados

Agora você verá no console:

```
[Modbus Server] 📝 Inicializados 201 coils e 201 holding registers
[Modbus Server] ✅ Servidor Slave rodando na porta 502 (todas as interfaces)
[Modbus Server] 🔌 Cliente conectado: 127.0.0.1:xxxxx (Total: 1)
[Modbus Server] 📥 Requisição recebida de 127.0.0.1: XX bytes
[Modbus Server] 📝 Coil 1 alterado: false → true
```

---

## 🧪 Como Testar

### Passo 1: Inicie o Servidor de Teste

1. Acesse: http://localhost:3000/test-clp
2. Clique em "Iniciar Servidor"
3. Aguarde mensagem "Servidor rodando"

### Passo 2: Configure o Modbus Poll

1. **Connection Setup**:
   - Connection: Modbus TCP/IP (SEM RTU!)
   - IP: 127.0.0.1
   - Port: 502
   - Timeout: 1000ms

2. **Setup → Read/Write Definition**:
   - Function: Read Coils (FC 01)
   - Address: 1
   - Quantity: 10
   - Poll Interval: 1000ms

### Passo 3: Conecte

1. No Modbus Poll: **Connection → Connect**
2. Você deve ver:
   - Status muda de "No connection" para conectado
   - Console do Node.js mostra: "Cliente conectado: 127.0.0.1:xxxxx"

### Passo 4: Teste Pulsos

1. Na página de teste, clique em "Enviar Pulso" para coil 1
2. No Modbus Poll, você deve ver o coil 1 mudar para 1 por 1 segundo
3. Console mostra: "Coil 1 alterado: false → true"

---

## 🔎 Alternativas ao Modbus Poll

Se o Modbus Poll continuar com problemas, teste com:

### 1. QModMaster (RECOMENDADO)

- Download: https://sourceforge.net/projects/qmodmaster/
- Grátis e open source
- Suporte completo a Modbus TCP

### 2. ModScan

- Similar ao Modbus Poll
- Versão demo disponível

### 3. Comando Python (teste rápido)

```python
from pymodbus.client import ModbusTcpClient

client = ModbusTcpClient('127.0.0.1', port=502)
client.connect()
result = client.read_coils(1, 10)
print(result.bits)
client.close()
```

---

## 📊 Checklist de Diagnóstico

Execute na ordem:

- [ ] Servidor de teste iniciado na porta 502
- [ ] Console mostra "Servidor Slave rodando na porta 502"
- [ ] Modbus Poll configurado em **Modbus TCP** (não RTU)
- [ ] Modbus Poll conectado (sem "No connection")
- [ ] Console mostra "Cliente conectado"
- [ ] Enviou pulso pela página de teste
- [ ] Console mostra "Coil X alterado"
- [ ] Modbus Poll exibe mudança no coil

---

## 🐛 Se Ainda Não Funcionar

Verifique no console Node.js:

1. **Se NÃO aparecer "Cliente conectado"**:
   - Firewall bloqueando porta 502
   - Modbus Poll está no modo errado
   - IP incorreto

2. **Se conectar mas não receber dados**:
   - Verifique se aparece "📥 Requisição recebida"
   - Se não aparecer: Modbus Poll não está enviando requisições
   - Verifique configuração de "Read/Write Definition"

3. **Se aparecer erros no console**:
   - Copie e cole os erros para análise
