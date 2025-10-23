# Notion Delta Sync System

Sistema avançado de sincronização incremental entre Markdown (GitHub) e Notion.

## Características

### ✨ Delta Sync (Sincronização Incremental)
- Sincroniza apenas as alterações de cada commit (não reescreve tudo)
- Usa `git diff` para detectar arquivos e linhas modificadas
- Operações em nível de bloco (create, update, delete, skip)

### 🎨 Preservação de Markdown
- Parser AST (Abstract Syntax Tree) usando `remark`
- Preserva formatação: **negrito**, *itálico*, [links](url), código, tabelas
- Suporte completo ao GitHub-flavored Markdown (GFM)

### 🗂️ Hierarquia de Pastas
- Espelha a estrutura de pastas do GitHub no Notion
- `itineraries/` → Página "Itineraries" no Notion
- `guides/` → Página "Guides" no Notion
- Emojis automáticos por pasta e arquivo

### 📍 Rastreamento de Blocos
- Arquivo `.notion-sync-map.json` mapeia:
  - Arquivos → Páginas Notion
  - Blocos Markdown → Blocos Notion (com hash de conteúdo)
  - Posições no arquivo (linha inicial/final)
- Permite updates incrementais (não deleta e recria tudo)

### 🔄 Idempotência
- Executar o sync várias vezes no mesmo commit = sem duplicação
- Hashes de conteúdo garantem que blocos inalterados não sejam reescritos

## Arquitetura

```
src/
├── git.js         - Extrai git diff, detecta arquivos alterados
├── parse.js       - Parser AST de Markdown → Blocos Notion
├── map.js         - Gerencia .notion-sync-map.json e delta operations
├── notion.js      - Wrappers da API Notion com rate limiting
├── hierarchy.js   - Mapeia estrutura de pastas GitHub → Notion
└── indexSync.js   - Sincroniza INDICE.md com links para páginas

scripts/
└── sync-delta.js  - Script principal (entry point)
```

## Uso

### Local

```bash
# Delta sync (recomendado)
npm run sync:delta

# Full sync (força sincronização completa)
FORCE_FULL_SYNC=true npm run sync:delta
```

### GitHub Actions

1. **Modo Delta** (padrão):
   - Vai em Actions → "Sync Markdown to Notion" → Run workflow
   - Seleciona "delta" mode
   - Sincroniza apenas mudanças desde o último commit

2. **Modo Full**:
   - Seleciona "full" mode
   - Reescreve todas as páginas (útil para correções)

## Variáveis de Ambiente

```bash
NOTION_TOKEN              # Token de integração Notion
NOTION_PARENT_PAGE_ID     # ID da página raiz no Notion
BASE_SHA                  # Commit base para diff (padrão: HEAD~1)
HEAD_SHA                  # Commit atual para diff (padrão: HEAD)
FORCE_FULL_SYNC           # true = full sync, false = delta sync
```

## Estrutura do .notion-sync-map.json

```json
{
  "version": "1.0.0",
  "lastSync": "2025-01-23T10:30:00Z",
  "lastCommitSha": "abc123...",
  "files": {
    "itineraries/tokyo.md": {
      "pageId": "notion-page-id-...",
      "lastUpdated": "2025-01-23T10:30:00Z",
      "blocks": [
        {
          "position": {"start": 1, "end": 3},
          "notionId": "block-id-...",
          "hash": "sha256-hash-of-content",
          "type": "heading_1"
        }
      ]
    }
  },
  "hierarchy": {
    "itineraries": {
      "pageId": "notion-folder-page-id",
      "lastUpdated": "2025-01-23T10:30:00Z"
    }
  }
}
```

## Fluxo de Sincronização

1. **Git Diff**: Detecta arquivos `.md` alterados desde último commit
2. **Parse**: Converte Markdown para AST e depois para blocos Notion
3. **Delta Computation**: Compara blocos novos com mapeamento antigo
4. **Operations**: Gera operações (create/update/delete/skip)
5. **Apply**: Aplica operações na API Notion (com rate limiting)
6. **Update Map**: Atualiza `.notion-sync-map.json` com novos hashes
7. **Save**: Salva mapeamento para próxima execução

## Operações Delta

- **create**: Bloco novo (não existe no mapeamento)
- **update**: Bloco existe mas conteúdo mudou (hash diferente)
- **delete**: Bloco existe no mapeamento mas sumiu do arquivo
- **skip**: Bloco inalterado (mesmo hash)

## Rate Limiting

- 350ms entre requisições (Notion API limits)
- Retry com exponential backoff (1s, 2s, 4s...)
- Max 3 tentativas por operação

## Emojis

### Pastas
- `itineraries/` → 🗺️
- `guides/` → 📚

### Arquivos
- Hong Kong → 🇭🇰
- Shenzhen → 🇨🇳
- Osaka → 🇯🇵
- Nara → 🦌
- Kyoto → ⛩️
- Nagano → 🏔️
- Tokyo → 🗼
- Paris → 🗼
- Shopping Guide → 🛍️
- INDICE → 🗺️

## Troubleshooting

### "object_not_found" error
- A página não foi compartilhada com a integração Notion
- Solução: Abrir página no Notion → Share → Add connection

### Delta sync não funciona
- Fallback automático para full sync
- Verifique se `.notion-sync-map.json` está correto

### Blocos duplicados
- Delete `.notion-sync-map.json` e rode full sync
- Isso vai recriar o mapeamento do zero

### API rate limit errors
- Aumentar `RATE_LIMIT_DELAY` em `src/notion.js`
- Padrão: 350ms

## Comparação: Old vs New

| Feature | Old System | New System |
|---------|-----------|------------|
| Sync mode | Full rewrite | Delta (incremental) |
| Markdown parsing | Regex (strips formatting) | AST (preserves all) |
| Block updates | Clear all + re-append | Update only changed blocks |
| Git tracking | None | git diff with line ranges |
| Folder structure | Flat | Hierarchical (mirrors GitHub) |
| Idempotency | ❌ | ✅ |
| Block mapping | None | Persistent (.notion-sync-map.json) |
| Rate limiting | Simple delay | Retry + exponential backoff |

## Manutenção

- `.notion-sync-map.json` é auto-gerenciado (não commitar)
- Se precisar resetar tudo: delete o arquivo e rode full sync
- Mapeamento é salvo localmente e no CI (entre runs)
