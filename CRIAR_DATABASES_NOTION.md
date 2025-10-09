# 📊 Como Criar Databases no Notion (Do Zero)

## 🎯 O que você vai criar:

3 tabelas (databases) no Notion para organizar sua viagem:
1. **🗺️ Destinos** - Suas cidades (Hong Kong, Osaka, Tokyo, Paris, etc)
2. **🍽️ Restaurantes** - Restaurantes vegetarianos/veganos
3. **🎯 Atividades** - Atrações e pontos turísticos

---

## 📝 Passo 1: Criar uma Página no Notion

1. Abra o Notion (app ou navegador)
2. Na **sidebar esquerda**, clique no **+ (Adicionar página)**
3. Digite um nome: **"Viagem Dezembro 2025"**
4. Pressione **Enter**

Pronto! Você está dentro da página nova.

---

## 📊 Passo 2: Criar a Primeira Database (Destinos)

### 2.1. Adicionar a Tabela

Dentro da página "Viagem Dezembro 2025":

1. Digite `/table` (barra + table)
2. Selecione **"Table - Inline"** (não é Full page!)
3. Uma tabela vai aparecer

### 2.2. Renomear a Tabela

1. Clique no nome da tabela (provavelmente diz "Database")
2. Mude para: **"🗺️ Destinos"**

### 2.3. Configurar as Colunas

A tabela já vem com uma coluna "Name". Vamos adicionar as outras:

**Clique no + à direita das colunas** e adicione:

| Nome da Coluna | Tipo | Como fazer |
|----------------|------|------------|
| Nome | Title | Já existe! Renomeie se necessário |
| País | Select | Click no + → "Select" → Digite "País" |
| Check-in | Date | Click no + → "Date" → Digite "Check-in" |
| Check-out | Date | Click no + → "Date" → Digite "Check-out" |
| Hotel | Text | Click no + → "Text" → Digite "Hotel" |
| Preço Hotel | Text | Click no + → "Text" → Digite "Preço Hotel" |

**Para adicionar as opções do "País":**
1. Clique na coluna "País"
2. Clique em "+ Add an option"
3. Adicione: China, Japão, França

### 2.4. Compartilhar com a Integration

1. Clique nos **⋮** (três pontos) no canto superior direito da database
2. Clique em **"Add connections"**
3. Selecione sua Integration: **"Viagem Dezembro 2025 Sync"**
4. ✅ Pronto! Database conectada

### 2.5. Pegar o Database ID

1. Clique nos **⋮** (três pontos) da database
2. Clique em **"Copy link"**
3. Cole em algum lugar e você verá algo assim:
   ```
   https://www.notion.so/workspace/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6?v=...
   ```
4. Copie apenas: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6` (os 32 caracteres do meio)
5. **Este é o `NOTION_DESTINATIONS_DB_ID`** ✅

---

## 🍽️ Passo 3: Criar a Segunda Database (Restaurantes)

Agora, **na mesma página**, vamos criar a segunda tabela:

### 3.1. Adicionar Espaço

1. Pressione **Enter** algumas vezes para dar espaço após a primeira database
2. Digite `/table`
3. Selecione **"Table - Inline"**

### 3.2. Configurar

1. Renomeie para: **"🍽️ Restaurantes"**
2. Adicione as colunas:

| Nome da Coluna | Tipo |
|----------------|------|
| Nome | Title (já existe) |
| Cidade | Text |
| Tipo | Select (opções: Vegan, Vegetarian) |
| Localização | Text |
| Preço | Text |
| Especialidade | Text |
| Reserva | Text |

3. Compartilhe com a Integration (⋮ → Add connections)
4. Copie o link (⋮ → Copy link) → Pegue os 32 caracteres
5. **Este é o `NOTION_RESTAURANTS_DB_ID`** ✅

---

## 🎯 Passo 4: Criar a Terceira Database (Atividades)

Mais uma vez, na mesma página:

### 4.1. Adicionar

1. Pressione **Enter** para dar espaço
2. Digite `/table`
3. Selecione **"Table - Inline"**

### 4.2. Configurar

1. Renomeie para: **"🎯 Atividades"**
2. Adicione as colunas:

| Nome da Coluna | Tipo |
|----------------|------|
| Nome | Title (já existe) |
| Cidade | Text |
| Preço | Text |
| Ingresso | Checkbox |
| Reserva | Select (opções: 1-2 meses, 1-2 semanas, 1-2 dias, Na hora, Não necessário) |
| Notas | Text |

3. Compartilhe com a Integration (⋮ → Add connections)
4. Copie o link (⋮ → Copy link) → Pegue os 32 caracteres
5. **Este é o `NOTION_ACTIVITIES_DB_ID`** ✅

---

## ✅ Resultado Final

Sua página "Viagem Dezembro 2025" deve ter:

```
┌─────────────────────────────────────┐
│  Viagem Dezembro 2025               │
│                                     │
│  🗺️ Destinos                        │
│  ┌──────────────────────────────┐  │
│  │ Nome  │ País │ Check-in │... │  │
│  └──────────────────────────────┘  │
│                                     │
│  🍽️ Restaurantes                    │
│  ┌──────────────────────────────┐  │
│  │ Nome  │ Cidade │ Tipo │...   │  │
│  └──────────────────────────────┘  │
│                                     │
│  🎯 Atividades                      │
│  ┌──────────────────────────────┐  │
│  │ Nome  │ Cidade │ Preço │...  │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

---

## 🔐 Agora Configure os Secrets no GitHub

Agora que você tem os 3 Database IDs, vá no GitHub:

1. Seu repositório → **Settings**
2. **Secrets and variables** → **Actions**
3. **New repository secret**

Adicione 4 secrets:

```bash
# 1. Token da Integration (você já tem!)
Name: NOTION_TOKEN
Value: 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

# 2. Database Destinos
Name: NOTION_DESTINATIONS_DB_ID
Value: [cole o ID que você copiou no Passo 2.5]

# 3. Database Restaurantes
Name: NOTION_RESTAURANTS_DB_ID
Value: [cole o ID que você copiou no Passo 3.4]

# 4. Database Atividades
Name: NOTION_ACTIVITIES_DB_ID
Value: [cole o ID que você copiou no Passo 4.5]
```

---

## 🧪 Testar

Depois de configurar os secrets, faça qualquer alteração no `trip-data.json`:

```bash
git add trip-data.json
git commit -m "test: testar sincronização Notion"
git push
```

Vá em **Actions** no GitHub e veja o workflow rodando!

Depois, volte no Notion e suas databases estarão preenchidas! 🎉

---

## ❓ Ainda com Dúvida?

**Pergunta:** "Onde fica o botão + para adicionar coluna?"
**Resposta:** À direita da última coluna da tabela. Se não aparecer, passe o mouse sobre o cabeçalho da tabela.

**Pergunta:** "Como sei se compartilhei com a Integration?"
**Resposta:** Clique nos ⋮ da database → se aparecer o nome da sua Integration em "Connections", está certo!

**Pergunta:** "Database ou Page?"
**Resposta:** Use **"Table - Inline"**, NÃO "Table - Full page". Inline permite ter várias databases na mesma página.

---

**Dúvidas?** Me chame que te ajudo! 💪
