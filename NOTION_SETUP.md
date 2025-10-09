# 🔗 Setup de Integração com Notion

Este guia te ajudará a configurar a sincronização automática entre este repositório e o Notion.

## 📋 Pré-requisitos

- Conta no Notion
- Repositório no GitHub (este repo)
- Node.js 18+ instalado (para testes locais)

---

## 🎯 Passo 1: Criar Integration no Notion

1. Acesse https://www.notion.so/my-integrations
2. Clique em **"+ New integration"**
3. Configure:
   - **Nome:** Viagem Dezembro 2025 Sync
   - **Associated workspace:** Seu workspace
   - **Capabilities:**
     - ✅ Read content
     - ✅ Update content
     - ✅ Insert content
4. Clique em **Submit**
5. **Copie o "Internal Integration Secret"** (começa com `secret_`)
   - ⚠️ **Importante:** Este é seu `NOTION_TOKEN`

---

## 📊 Passo 2: Criar Databases no Notion

### Database 1: 🗺️ Destinos

1. Crie uma nova página no Notion
2. Digite `/database` e selecione **"Table - Inline"**
3. Nomeie como **"🗺️ Destinos"**
4. Adicione as seguintes colunas (properties):

| Nome da Coluna | Tipo | Descrição |
|----------------|------|-----------|
| **Nome** | Title | Nome da cidade (padrão) |
| **País** | Select | China, Japão, França |
| **Check-in** | Date | Data de check-in |
| **Check-out** | Date | Data de check-out |
| **Hotel** | Text | Nome do hotel |
| **Preço Hotel** | Text | Valor da hospedagem |

5. Clique nos **⋮** (três pontos) → **"Add connections"** → Selecione sua Integration
6. **Copie o Database ID** da URL:
   ```
   https://notion.so/workspace/[DATABASE_ID]?v=...
                              ^^^^^^^^^^^^^^^^
   ```
   - Este é seu `NOTION_DESTINATIONS_DB_ID`

---

### Database 2: 🍽️ Restaurantes

1. Crie outra database inline
2. Nomeie como **"🍽️ Restaurantes"**
3. Adicione as colunas:

| Nome da Coluna | Tipo | Descrição |
|----------------|------|-----------|
| **Nome** | Title | Nome do restaurante (padrão) |
| **Cidade** | Text | Cidade onde está |
| **Tipo** | Select | Vegan, Vegetarian |
| **Localização** | Text | Endereço/área |
| **Preço** | Text | Faixa de preço |
| **Especialidade** | Text | Pratos especiais |
| **Reserva** | Text | Necessidade de reserva |

4. Compartilhe com sua Integration
5. Copie o Database ID → `NOTION_RESTAURANTS_DB_ID`

---

### Database 3: 🎯 Atividades

1. Crie a terceira database
2. Nomeie como **"🎯 Atividades"**
3. Adicione as colunas:

| Nome da Coluna | Tipo | Descrição |
|----------------|------|-----------|
| **Nome** | Title | Nome da atividade (padrão) |
| **Cidade** | Text | Cidade |
| **Preço** | Text | Valor do ingresso |
| **Ingresso** | Checkbox | Requer ingresso? |
| **Reserva** | Select | 1-2 meses, 1-2 semanas, 1-2 dias, Na hora, Não necessário |
| **Notas** | Text | Comentários e dicas |

4. Compartilhe com sua Integration
5. Copie o Database ID → `NOTION_ACTIVITIES_DB_ID`

---

## 🔐 Passo 3: Configurar Secrets no GitHub

1. Vá para seu repositório no GitHub
2. Clique em **Settings** → **Secrets and variables** → **Actions**
3. Clique em **"New repository secret"**
4. Adicione os seguintes secrets:

### Secret 1: NOTION_TOKEN
- **Name:** `NOTION_TOKEN`
- **Value:** `secret_...` (do Passo 1)

### Secret 2: NOTION_DESTINATIONS_DB_ID
- **Name:** `NOTION_DESTINATIONS_DB_ID`
- **Value:** `[ID da database Destinos]` (do Passo 2)

### Secret 3: NOTION_RESTAURANTS_DB_ID
- **Name:** `NOTION_RESTAURANTS_DB_ID`
- **Value:** `[ID da database Restaurantes]` (do Passo 2)

### Secret 4: NOTION_ACTIVITIES_DB_ID
- **Name:** `NOTION_ACTIVITIES_DB_ID`
- **Value:** `[ID da database Atividades]` (do Passo 2)

---

## 🧪 Passo 4: Testar Localmente (Opcional)

### 4.1. Instalar dependências

```bash
npm install
```

### 4.2. Criar arquivo .env

Crie um arquivo `.env` na raiz do projeto:

```env
NOTION_TOKEN=secret_seu_token_aqui
NOTION_DESTINATIONS_DB_ID=id_da_database_destinos
NOTION_RESTAURANTS_DB_ID=id_da_database_restaurantes
NOTION_ACTIVITIES_DB_ID=id_da_database_atividades
```

### 4.3. Testar conexão

```bash
npm test
```

Deve mostrar suas databases e IDs.

### 4.4. Sincronizar tudo

```bash
npm run sync
```

### 4.5. Sincronizar apenas uma categoria

```bash
npm run sync:cities        # Apenas destinos
npm run sync:restaurants   # Apenas restaurantes
npm run sync:activities    # Apenas atividades
```

---

## 🚀 Passo 5: Sincronização Automática

### Como funciona?

A sincronização acontece automaticamente quando você:

1. **Faz push para main** de qualquer um destes arquivos:
   - `trip-data.json`
   - Qualquer arquivo `.md`
   - `scripts/sync-to-notion.js`

2. **Dispara manualmente** via GitHub Actions:
   - Vá em **Actions** → **Sync to Notion**
   - Clique em **"Run workflow"**
   - Escolha o tipo de sync (all, cities, restaurants, activities)

### Verificar logs

1. Vá em **Actions** no GitHub
2. Clique no workflow **"Sync to Notion"**
3. Veja os logs de execução

---

## 🔄 Como Usar no Dia a Dia

### Fluxo normal:

1. Edite `trip-data.json` ou arquivos `.md` localmente
2. Commit e push:
   ```bash
   git add .
   git commit -m "update: adicionar novo restaurante"
   git push
   ```
3. GitHub Actions sincroniza automaticamente com Notion
4. Verifique suas databases no Notion atualizadas!

### Sincronização manual:

Se quiser forçar uma sincronização:

1. Vá em **Actions** → **Sync to Notion**
2. **"Run workflow"** → **"Run workflow"**

---

## 🛠️ Troubleshooting

### ❌ Erro: "NOTION_TOKEN não configurado"

- Verifique se adicionou o secret no GitHub
- Nome deve ser exatamente `NOTION_TOKEN`

### ❌ Erro: "Could not find database"

- Verifique se compartilhou a database com a Integration
- Verifique se o Database ID está correto (sem espaços ou caracteres extras)

### ❌ Erro: "Unauthorized"

- Token pode estar expirado ou inválido
- Gere um novo token e atualize o secret

### ❌ Erro: "Property not found"

- Verifique se os nomes das colunas estão exatamente como especificado
- Nomes devem ter acentuação correta (País, Atividades, etc)

### ⚠️ Dados não aparecem

- Verifique se o workflow executou com sucesso em Actions
- Veja os logs para identificar erros específicos
- Verifique se as databases estão compartilhadas com a Integration

---

## 📝 Estrutura de Dados

### O que é sincronizado?

**Destinos (trip-data.json → itinerary):**
- Nome da cidade com emoji do país
- País (China, Japão, França)
- Datas de check-in e check-out
- Nome e preço do hotel

**Restaurantes (trip-data.json → vegetarian_restaurants):**
- Nome do restaurante
- Cidade
- Tipo (Vegan/Vegetarian)
- Localização
- Preço
- Especialidade
- Necessidade de reserva

**Atividades (trip-data.json → activities):**
- Nome da atividade
- Cidade
- Preço
- Se requer ingresso
- Antecedência necessária para reserva
- Comentários e dicas

---

## 🔒 Segurança

- ✅ Tokens e IDs ficam seguros nos GitHub Secrets
- ✅ Nunca commite `.env` no repositório (já está no `.gitignore`)
- ✅ A Integration só tem acesso às databases que você compartilhou
- ✅ Você pode revogar o acesso a qualquer momento em https://www.notion.so/my-integrations

---

## 📚 Recursos Adicionais

- [Documentação da API do Notion](https://developers.notion.com/reference)
- [Notion SDK para Node.js](https://github.com/makenotion/notion-sdk-js)
- [GitHub Actions Docs](https://docs.github.com/en/actions)

---

## 🆘 Precisa de Ajuda?

Se encontrar problemas:

1. Verifique os logs do GitHub Actions
2. Execute `npm test` localmente para testar conexão
3. Revise este guia passo a passo
4. Verifique a [documentação oficial do Notion](https://developers.notion.com/docs/getting-started)

---

**Setup criado em:** Outubro 2025
**Token usado no exemplo:** `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`
