# 🔗 Setup Sincronização Markdown → Notion

Guia rápido para sincronizar automaticamente seus arquivos `.md` com o Notion.

---

## 🎯 O que você vai ter:

Cada arquivo `.md` vira uma **página no Notion**:
- 🗺️ **Índice** (INDICE.md)
- 🇭🇰 **Hong Kong** (hong-kong.md)
- 🇨🇳 **Shenzhen** (shenzhen.md)
- 🇯🇵 **Osaka** (osaka.md)
- 🦌 **Nara** (nara.md)
- ⛩️ **Kyoto** (kyoto.md)
- 🏔️ **Nagano** (nagano.md)
- 🗼 **Tokyo** (tokyo.md)
- 🗼 **Paris** (paris.md)

**Atualização automática:** Quando você edita um `.md` e faz push, sincroniza automaticamente!

---

## ⚡ Setup em 5 Minutos

### 1️⃣ Criar Integration no Notion (1 min)

1. Acesse: https://www.notion.so/my-integrations
2. Click em **"+ New integration"**
3. Configure:
   - **Nome:** Viagem Dezembro 2025
   - **Workspace:** Seu workspace
   - **Capabilities:** Read content, Update content, Insert content
4. Click **Submit**
5. **Copie o "Internal Integration Secret"** (o token)
   - Já tem o token: `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` ✅

---

### 2️⃣ Criar Página Raiz no Notion (1 min)

1. No Notion, crie uma **nova página**
2. Nome: **"Viagem Dezembro 2025"** (ou o que preferir)
3. Click nos **⋮** (três pontos) → **"Add connections"**
4. Selecione sua Integration: **"Viagem Dezembro 2025"**
5. **Pegar o Page ID:**
   - Abra a página no navegador
   - A URL será: `https://notion.so/workspace/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`
   - Copie os 32 caracteres (o `XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`)
   - Este é seu **NOTION_PARENT_PAGE_ID** ✅

---

### 3️⃣ Configurar Secrets no GitHub (2 min)

1. Vá no seu repositório GitHub
2. **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**

Adicione 2 secrets:

#### Secret 1: NOTION_TOKEN
```
Name: NOTION_TOKEN
Value: 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
```

#### Secret 2: NOTION_PARENT_PAGE_ID
```
Name: NOTION_PARENT_PAGE_ID
Value: [cole o ID da página que você criou]
```

---

### 4️⃣ Pronto! Testar (1 min)

Faça qualquer alteração em um arquivo `.md`:

```bash
git add osaka.md
git commit -m "test: testar sincronização Notion"
git push
```

Vá em **Actions** no GitHub e veja o workflow rodando!

Depois, volte no Notion → sua página "Viagem Dezembro 2025" terá sub-páginas! 🎉

---

## 📖 Como Funciona

### Estrutura no Notion

```
📄 Viagem Dezembro 2025 (página raiz)
  ├── 🗺️ Índice
  ├── 🇭🇰 Hong Kong
  ├── 🇨🇳 Shenzhen
  ├── 🇯🇵 Osaka
  ├── 🦌 Nara
  ├── ⛩️ Kyoto
  ├── 🏔️ Nagano
  ├── 🗼 Tokyo
  └── 🗼 Paris
```

### Gatilho Automático

O GitHub Actions roda automaticamente quando você:
- Faz push de qualquer arquivo `.md`
- Faz push de `scripts/sync-markdown-to-notion.js`

### Manual

Você também pode rodar manualmente:
1. Vá em **Actions** no GitHub
2. Click em **"Sync Markdown to Notion"**
3. **"Run workflow"**

---

## 🧪 Testar Localmente (Opcional)

```bash
# Instalar dependências
npm install

# Criar arquivo .env
echo "NOTION_TOKEN=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" > .env
echo "NOTION_PARENT_PAGE_ID=seu_page_id_aqui" >> .env

# Sincronizar
npm run sync
```

---

## 🎨 Depois no Notion

Com as páginas criadas, você pode:

### ✅ Adicionar Mapa
1. Em qualquer página, digite `/map`
2. Adicione localizações manualmente
3. Pins aparecem no mapa!

### ✅ Adicionar Imagens
1. Digite `/image`
2. Upload ou URL

### ✅ Criar Database de Locais (Opcional)
1. Digite `/database`
2. Crie colunas: Nome, Endereço, Tipo
3. Adicione property type "URL" para localização
4. Use view "Map" para visualizar pins

### ✅ Usar Toggles
1. Digite `/toggle`
2. Organize conteúdo colapsável

### ✅ Adicionar Callouts
1. Digite `/callout`
2. Destaque informações importantes

---

## 🔄 Fluxo de Trabalho

```
1. Edite osaka.md localmente
   ↓
2. git add osaka.md && git commit -m "update" && git push
   ↓
3. GitHub Actions detecta mudança
   ↓
4. Script sincroniza com Notion
   ↓
5. Página "Osaka" atualizada no Notion
```

---

## ⚙️ Comandos Disponíveis

```bash
# Sincronizar todos os arquivos
npm run sync

# Sincronizar arquivo específico
npm run sync:single osaka.md
```

---

## 🆘 Troubleshooting

### ❌ Erro: "NOTION_TOKEN não configurado"
- Verifique se adicionou o secret no GitHub
- Nome deve ser exatamente `NOTION_TOKEN`

### ❌ Erro: "NOTION_PARENT_PAGE_ID não configurado"
- Adicione o secret `NOTION_PARENT_PAGE_ID` no GitHub
- Verifique se copiou o ID correto da URL

### ❌ Erro: "Unauthorized"
- Verifique se compartilhou a página com a Integration
- Vá na página → ⋮ → "Add connections" → Selecione a Integration

### ⚠️ Página não aparece
- Verifique logs do GitHub Actions
- Veja se o workflow executou sem erros
- Recarregue a página raiz no Notion

### ⚠️ Conteúdo estranho
- O script converte markdown básico
- Formatações complexas podem não ser suportadas
- Edite manualmente no Notion se necessário

---

## 📝 O que é Sincronizado

### ✅ Convertido:
- Cabeçalhos (# ## ###)
- Listas (-)
- Parágrafos
- Divisores (---)

### ⚠️ Simplificado:
- **Bold** → texto normal
- *Italic* → texto normal
- [Links](url) → texto do link

### ❌ Não suportado (ainda):
- Tabelas
- Código
- Imagens
- Checkboxes

**Solução:** Adicione manualmente no Notion depois da sincronização!

---

## 🎯 Próximos Passos

Depois do setup:

1. ✅ Faça push de algum `.md` para testar
2. ✅ Veja as páginas aparecerem no Notion
3. ✅ Adicione mapas, imagens, e outros recursos do Notion
4. ✅ Continue editando os `.md` localmente
5. ✅ Push sincroniza automaticamente

---

## 💡 Dicas

- **Edite no GitHub/VSCode:** Mantenha os `.md` como fonte da verdade
- **Enriqueça no Notion:** Adicione mapas, imagens, databases
- **Sincronização sobrescreve:** Mudanças no Notion serão perdidas no próximo sync
- **Use Notion para visualizar:** Use os `.md` para editar

---

**Token fornecido:** `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`

**Setup completo em ~5 minutos!** 🚀
