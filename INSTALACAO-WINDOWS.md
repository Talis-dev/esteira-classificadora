# Instalação SmartConveyor no Windows 10 Industrial

Guia completo para configurar o SmartConveyor para iniciar automaticamente com o Windows.

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter:

- ✅ Node.js instalado (versão 20 ou superior)
- ✅ Projeto SmartConveyor clonado e funcionando
- ✅ Acesso de administrador ao Windows

## 🔨 Passo 1: Build do Projeto

1. Abra o PowerShell como **Administrador**
2. Navegue até a pasta do projeto:
   ```powershell
   cd "C:\SmartConveyor"
   ```
3. Execute o build:
   ```powershell
   npm run build
   ```
4. Aguarde o build completar (pode levar alguns minutos)

## 📁 Passo 2: Criar Pasta de Logs

No PowerShell, execute:

```powershell
New-Item -ItemType Directory -Path "C:\SmartConveyor\logs" -Force
```

## 🎯 Método A: Agendador de Tarefas - Interface Gráfica

### Passo 1: Abrir o Agendador de Tarefas

1. Pressione `Win + R` no teclado
2. Digite: `taskschd.msc`
3. Pressione `Enter`

### Passo 2: Criar Nova Tarefa

1. No menu à direita, clique em **"Criar Tarefa..."**
   - ⚠️ NÃO clique em "Criar Tarefa Básica"
   - ⚠️ Certifique-se de clicar em "Criar Tarefa..." (com os três pontos)

### Passo 3: Aba "Geral"

Configure os seguintes campos:

1. **Nome**: `SmartConveyor`
2. **Descrição**: `Sistema de controle de esteira industrial`
3. **Opções de segurança**:
   - ☑️ Marque: **"Executar estando o usuário conectado ou não"**
   - ☑️ Marque: **"Executar com privilégios mais altos"**
4. **Configurar para**: Selecione **"Windows 10"**

### Passo 4: Aba "Gatilhos"

1. Clique no botão **"Novo..."**
2. Configure:
   - **Iniciar a tarefa**: Selecione **"Na inicialização"**
   - ☑️ Certifique-se que **"Habilitado"** está marcado
3. Clique em **"OK"**

### Passo 5: Aba "Ações"

1. Clique no botão **"Novo..."**
2. Configure:
   - **Ação**: Selecione **"Iniciar um programa"**
   - **Programa/script**:
     ```
     cmd.exe
     ```
   - **Adicionar argumentos (opcional)**:
     ```
     /c npm start
     ```
   - **Iniciar em (opcional)**:
     ```
     C:\SmartConveyor
     ```
3. Clique em **"OK"**

### Passo 6: Aba "Condições"

1. **Energia**:
   - ☐ **Desmarque**: "Iniciar a tarefa apenas se o computador estiver conectado à energia CA"
   - ☐ **Desmarque**: "Parar se o computador alternar para energia de bateria"

2. **Rede**:
   - ☑️ **Marque**: "Iniciar somente se a seguinte conexão de rede estiver disponível"
   - Selecione: **"Qualquer conexão"**

### Passo 7: Aba "Configurações"

Configure as seguintes opções:

1. ☑️ **Marque**: "Permitir que a tarefa seja executada sob demanda"
2. ☑️ **Marque**: "Executar tarefa assim que possível após uma inicialização agendada ter sido perdida"
3. ☑️ **Marque**: "Se a tarefa falhar, reiniciar a cada:"
   - Defina: **1 minuto**
   - Tentativas: **999** (ilimitado)
4. ☐ **Desmarque**: "Parar a tarefa se ela for executada por mais de:"
5. **Se a tarefa já estiver em execução**:
   - Selecione: **"Não iniciar uma nova instância"**

> ⚠️ **IMPORTANTE**: A configuração de "reiniciar a cada 1 minuto" com 999 tentativas garante que o sistema reinicie automaticamente quando você usar o botão "Reiniciar Sistema" nas configurações.

### Passo 8: Finalizar

1. Clique em **"OK"** para salvar a tarefa
2. Se solicitar senha, digite a senha do administrador
3. A tarefa "SmartConveyor" deve aparecer na lista

### Passo 9: Testar

1. Clique com botão direito na tarefa **"SmartConveyor"**
2. Selecione **"Executar"**
3. Abra o navegador em: `http://localhost:3000`
4. Verifique se o sistema está rodando

---

## 💻 Método B: Agendador de Tarefas - PowerShell

### Passo 1: Abrir PowerShell como Administrador

1. Clique no menu Iniciar
2. Digite: `PowerShell`
3. Clique com botão direito em **"Windows PowerShell"**
4. Selecione **"Executar como administrador"**

### Passo 2: Navegar até a Pasta do Projeto

```powershell
cd "C:\SmartConveyor"
```

### Passo 3: Criar a Ação (o que executar)

```powershell
$action = New-ScheduledTaskAction `
  -Execute "cmd.exe" `
  -Argument "/c npm start" `
  -WorkingDirectory "C:\SmartConveyor"
```

### Passo 4: Criar o Gatilho (quando executar)

```powershell
$trigger = New-ScheduledTaskTrigger -AtStartup
```

### Passo 5: Criar o Principal (como executar)

```powershell
$principal = New-ScheduledTaskPrincipal `
  -UserId "SYSTEM" `
  -LogonType ServiceAccount `
  -RunLevel Highest
```

### Passo 6: Criar as Configurações (comportamento)

```powershell
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -RestartCount 999 `
  -RestartInterval (New-TimeSpan -Minutes 1) `
  -MultipleInstances IgnoreNew `
  -ExecutionTimeLimit (New-TimeSpan -Days 0)
```

> ⚠️ **IMPORTANTE**: `-RestartCount 999` garante reinicialização automática quando usar o botão "Reiniciar Sistema".

### Passo 7: Registrar a Tarefa

```powershell
Register-ScheduledTask `
  -TaskName "SmartConveyor" `
  -Action $action `
  -Trigger $trigger `
  -Principal $principal `
  -Settings $settings `
  -Description "Sistema de controle de esteira industrial"
```

### Passo 8: Verificar se Foi Criada

```powershell
Get-ScheduledTask -TaskName "SmartConveyor"
```

Você deve ver a tarefa listada com o status **Ready**.

### Passo 9: Testar a Tarefa

```powershell
Start-ScheduledTask -TaskName "SmartConveyor"
```

Aguarde 10 segundos e acesse: `http://localhost:3000`

---

## 🎮 Comandos de Gerenciamento

### Via PowerShell

```powershell
# Iniciar a tarefa manualmente
Start-ScheduledTask -TaskName "SmartConveyor"

# Ver status da tarefa
Get-ScheduledTask -TaskName "SmartConveyor" | Select-Object TaskName, State, LastRunTime

# Parar o processo (quando necessário)
Stop-Process -Name "node" -Force

# Desabilitar a tarefa (não inicia mais com o Windows)
Disable-ScheduledTask -TaskName "SmartConveyor"

# Habilitar a tarefa novamente
Enable-ScheduledTask -TaskName "SmartConveyor"

# Remover a tarefa completamente
Unregister-ScheduledTask -TaskName "SmartConveyor" -Confirm:$false
```

### Via Linha de Comando (CMD)

```cmd
REM Iniciar tarefa
schtasks /run /tn "SmartConveyor"

REM Ver informações da tarefa
schtasks /query /tn "SmartConveyor" /v /fo list

REM Desabilitar tarefa
schtasks /change /tn "SmartConveyor" /disable

REM Habilitar tarefa
schtasks /change /tn "SmartConveyor" /enable

REM Remover tarefa
schtasks /delete /tn "SmartConveyor" /f
```

---

## 🔍 Verificação e Troubleshooting

### Verificar se o Node.js está instalado

```powershell
node --version
npm --version
```

Se não aparecer a versão, instale o Node.js de: https://nodejs.org

### Verificar se a porta 3000 está livre

```powershell
netstat -ano | findstr :3000
```

Se houver algo usando a porta 3000, você pode:

- Parar o processo: `Stop-Process -Id <PID> -Force`
- Ou alterar a porta no arquivo `.env.local`

### Verificar se a tarefa está rodando

```powershell
# Ver processos Node.js ativos
Get-Process node -ErrorAction SilentlyContinue

# Ver informações detalhadas
Get-ScheduledTask -TaskName "SmartConveyor" | Get-ScheduledTaskInfo
```

### Verificar logs do sistema

1. Abra o Visualizador de Eventos: `Win + R` → `eventvwr.msc`
2. Navegue: **Logs do Windows** → **Sistema**
3. Procure por eventos do **Agendador de Tarefas**

### Problemas Comuns

**Problema**: Tarefa não inicia automaticamente

- **Solução**: Verifique se está configurada para "Na inicialização"
- Certifique-se que "Executar com privilégios mais altos" está marcado

**Problema**: Erro "Acesso negado"

- **Solução**: Execute o PowerShell como Administrador
- Verifique permissões na pasta do projeto

**Problema**: Node.js não encontrado

- **Solução**: Verifique se Node.js está no PATH
- Execute: `where.exe node` para encontrar o caminho
- Reinstale Node.js se necessário

**Problema**: Projeto não inicia

- **Solução**: Verifique se o build foi feito: `npm run build`
- Verifique logs em: `C:\SmartConveyor\logs`
- Execute manualmente: `cd C:\SmartConveyor` e depois `npm start`

---

## ✅ Checklist Final

Antes de reiniciar o computador, verifique:

- [ ] Build do projeto concluído (`npm run build`)
- [ ] Pasta `logs` criada
- [ ] Tarefa "SmartConveyor" criada no Agendador
- [ ] Tarefa configurada para "Na inicialização"
- [ ] Tarefa configurada para "Executar com privilégios mais altos"
- [ ] Tarefa testada manualmente e funcionando
- [ ] Sistema acessível em `http://localhost:3000`

## 🎉 Pronto!

Agora o SmartConveyor iniciará automaticamente sempre que o Windows ligar.

Para acessar o sistema:

- Dashboard: `http://localhost:3000/dashboard`
- Configurações: `http://localhost:3000/settings`
- Teste CLP: `http://localhost:3000/test-clp`

---

**Dúvidas?** Consulte a documentação completa em `README.md`
