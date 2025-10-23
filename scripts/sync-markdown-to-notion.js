#!/usr/bin/env node

const { Client } = require('@notionhq/client');
const fs = require('fs');
const path = require('path');

// Configuração
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_PARENT_PAGE_ID = process.env.NOTION_PARENT_PAGE_ID;

if (!NOTION_TOKEN) {
  console.error('❌ NOTION_TOKEN não configurado');
  process.exit(1);
}

if (!NOTION_PARENT_PAGE_ID) {
  console.error('❌ NOTION_PARENT_PAGE_ID não configurado');
  console.log('\n💡 Este é o ID da página raiz onde as sub-páginas serão criadas.');
  console.log('Para pegar: abra a página no navegador e copie o ID da URL');
  process.exit(1);
}

const notion = new Client({ auth: NOTION_TOKEN });

// Emojis por cidade
const cityEmojis = {
  'hong-kong': '🇭🇰',
  'shenzhen': '🇨🇳',
  'osaka': '🇯🇵',
  'nara': '🦌',
  'kyoto': '⛩️',
  'nagano': '🏔️',
  'tokyo': '🗼',
  'paris': '🗼',
  'INDICE': '🗺️',
  'shopping-guide': '🛍️'
};

// Converter markdown para blocos do Notion
function markdownToNotionBlocks(markdown) {
  const blocks = [];
  const lines = markdown.split('\n');

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Cabeçalho H1 (#)
    if (line.startsWith('# ')) {
      blocks.push({
        object: 'block',
        type: 'heading_1',
        heading_1: {
          rich_text: [{ text: { content: line.substring(2) } }]
        }
      });
      i++;
      continue;
    }

    // Cabeçalho H2 (##)
    if (line.startsWith('## ')) {
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ text: { content: line.substring(3) } }]
        }
      });
      i++;
      continue;
    }

    // Cabeçalho H3 (###)
    if (line.startsWith('### ')) {
      blocks.push({
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: [{ text: { content: line.substring(4) } }]
        }
      });
      i++;
      continue;
    }

    // Lista com marcador (-)
    if (line.trim().startsWith('- ')) {
      blocks.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [{ text: { content: line.trim().substring(2) } }]
        }
      });
      i++;
      continue;
    }

    // Divider (---)
    if (line.trim() === '---') {
      blocks.push({
        object: 'block',
        type: 'divider',
        divider: {}
      });
      i++;
      continue;
    }

    // Linha vazia
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Parágrafo normal
    if (line.trim()) {
      // Remover markdown bold/italic básico para simplificar
      let content = line.trim()
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/\[(.*?)\]\(.*?\)/g, '$1'); // Remove links markdown

      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ text: { content } }]
        }
      });
    }

    i++;
  }

  return blocks;
}

// Buscar página por título
async function findPageByTitle(parentId, title) {
  try {
    const response = await notion.blocks.children.list({
      block_id: parentId,
      page_size: 100
    });

    for (const block of response.results) {
      if (block.type === 'child_page') {
        const page = await notion.pages.retrieve({ page_id: block.id });
        const pageTitle = page.properties.title?.title?.[0]?.plain_text || '';
        if (pageTitle === title) {
          return page;
        }
      }
    }
    return null;
  } catch (error) {
    console.error(`Erro ao buscar página "${title}":`, error.message);
    return null;
  }
}

// Limpar conteúdo de uma página
async function clearPageContent(pageId) {
  try {
    const response = await notion.blocks.children.list({
      block_id: pageId,
      page_size: 100
    });

    for (const block of response.results) {
      await notion.blocks.delete({ block_id: block.id });
      await new Promise(resolve => setTimeout(resolve, 350)); // Rate limiting
    }
  } catch (error) {
    console.error('Erro ao limpar conteúdo:', error.message);
  }
}

// Adicionar blocos em lotes (max 100 por requisição)
async function appendBlocksInBatches(pageId, blocks) {
  const batchSize = 100;

  for (let i = 0; i < blocks.length; i += batchSize) {
    const batch = blocks.slice(i, i + batchSize);

    try {
      await notion.blocks.children.append({
        block_id: pageId,
        children: batch
      });
      await new Promise(resolve => setTimeout(resolve, 350)); // Rate limiting
    } catch (error) {
      console.error(`Erro ao adicionar bloco ${i}-${i + batch.length}:`, error.message);
      // Tentar adicionar bloco por bloco se falhar
      for (const block of batch) {
        try {
          await notion.blocks.children.append({
            block_id: pageId,
            children: [block]
          });
          await new Promise(resolve => setTimeout(resolve, 350));
        } catch (blockError) {
          console.error('Erro ao adicionar bloco individual:', blockError.message);
        }
      }
    }
  }
}

// Sincronizar um arquivo markdown
async function syncMarkdownFile(filePath) {
  const fileName = path.basename(filePath, '.md');
  const emoji = cityEmojis[fileName] || '📄';
  const title = fileName === 'INDICE' ? 'Índice' :
                fileName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const pageTitle = `${emoji} ${title}`;

  console.log(`\n📄 Sincronizando: ${pageTitle}`);

  // Ler conteúdo do markdown
  const markdown = fs.readFileSync(filePath, 'utf8');
  const blocks = markdownToNotionBlocks(markdown);

  if (blocks.length === 0) {
    console.log('⚠️  Arquivo vazio ou sem conteúdo válido');
    return;
  }

  try {
    // Buscar se página já existe
    let page = await findPageByTitle(NOTION_PARENT_PAGE_ID, pageTitle);

    if (page) {
      // Atualizar página existente
      console.log('🔄 Atualizando página existente...');
      await clearPageContent(page.id);
      await appendBlocksInBatches(page.id, blocks);
      console.log(`✅ Atualizado: ${pageTitle}`);
    } else {
      // Criar nova página
      console.log('✨ Criando nova página...');
      const newPage = await notion.pages.create({
        parent: { page_id: NOTION_PARENT_PAGE_ID },
        properties: {
          title: {
            title: [{ text: { content: pageTitle } }]
          }
        }
      });

      await new Promise(resolve => setTimeout(resolve, 350));
      await appendBlocksInBatches(newPage.id, blocks);
      console.log(`✅ Criado: ${pageTitle}`);
    }
  } catch (error) {
    console.error(`❌ Erro em ${pageTitle}:`, error.message);
  }

  // Rate limiting
  await new Promise(resolve => setTimeout(resolve, 350));
}

// Função principal
async function main() {
  console.log('🚀 Iniciando sincronização Markdown → Notion...\n');

  const args = process.argv.slice(2);

  // Se especificou arquivo único
  if (args.includes('--file') && args[1]) {
    await syncMarkdownFile(args[1]);
    console.log('\n✅ Sincronização concluída!\n');
    return;
  }

  // Sincronizar todos os arquivos markdown principais
  const mdFiles = {
    'INDICE.md': 'INDICE.md',
    'hong-kong.md': 'itineraries/hong-kong.md',
    'shenzhen.md': 'itineraries/shenzhen.md',
    'osaka.md': 'itineraries/osaka.md',
    'nara.md': 'itineraries/nara.md',
    'kyoto.md': 'itineraries/kyoto.md',
    'nagano.md': 'itineraries/nagano.md',
    'tokyo.md': 'itineraries/tokyo.md',
    'paris.md': 'itineraries/paris.md',
    'shopping-guide.md': 'guides/shopping-guide.md'
  };

  const rootDir = path.join(__dirname, '..');

  for (const [fileName, filePath] of Object.entries(mdFiles)) {
    const fullPath = path.join(rootDir, filePath);

    if (fs.existsSync(fullPath)) {
      await syncMarkdownFile(fullPath);
    } else {
      console.log(`⚠️  Arquivo não encontrado: ${filePath}`);
    }
  }

  console.log('\n✅ Sincronização concluída!\n');
  console.log('📍 Acesse suas páginas no Notion:');
  console.log(`   https://notion.so/${NOTION_PARENT_PAGE_ID.replace(/-/g, '')}\n`);
}

// Executar
main().catch(error => {
  console.error('\n❌ Erro fatal:', error.message);
  process.exit(1);
});
