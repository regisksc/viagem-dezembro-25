const { Client } = require('@notionhq/client');

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_PARENT_PAGE_ID = process.env.NOTION_PARENT_PAGE_ID;

if (!NOTION_TOKEN || !NOTION_PARENT_PAGE_ID) {
  console.error('❌ Faltam variáveis de ambiente!');
  console.log('NOTION_TOKEN:', NOTION_TOKEN ? '✅ Configurado' : '❌ Faltando');
  console.log('NOTION_PARENT_PAGE_ID:', NOTION_PARENT_PAGE_ID ? '✅ Configurado' : '❌ Faltando');
  process.exit(1);
}

const notion = new Client({ auth: NOTION_TOKEN });

async function test() {
  try {
    console.log('🔍 Testando conexão com Notion...\n');

    // Testar se consegue acessar a página pai
    console.log('1️⃣ Verificando acesso à página pai...');
    const page = await notion.pages.retrieve({ page_id: NOTION_PARENT_PAGE_ID });
    const title = page.properties?.title?.title?.[0]?.plain_text || 'Sem título';
    console.log('✅ Página encontrada:', title);

    // Listar páginas filhas
    console.log('\n2️⃣ Listando páginas filhas...');
    const children = await notion.blocks.children.list({
      block_id: NOTION_PARENT_PAGE_ID,
      page_size: 100
    });
    console.log(`📄 Encontrados ${children.results.length} blocos/páginas filhos`);

    // Buscar páginas filhas (que são do tipo child_page)
    const childPages = children.results.filter(block => block.type === 'child_page');
    console.log(`📑 Páginas filhas: ${childPages.length}`);
    childPages.forEach((page, i) => {
      const pageTitle = page.child_page?.title || 'Sem título';
      console.log(`   ${i+1}. ${pageTitle}`);
    });

    console.log('\n✅ Conexão OK! Script pode criar páginas.');

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    if (error.code === 'object_not_found') {
      console.log('\n💡 Possíveis causas:');
      console.log('   - A página não existe');
      console.log('   - A integração não tem acesso à página');
      console.log('   - O ID está incorreto');
    }
  }
}

test();
