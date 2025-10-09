#!/usr/bin/env node

const { Client } = require('@notionhq/client');

const NOTION_TOKEN = process.env.NOTION_TOKEN;

if (!NOTION_TOKEN) {
  console.error('❌ NOTION_TOKEN não configurado');
  console.log('\nConfigure a variável de ambiente:');
  console.log('export NOTION_TOKEN="seu_token_aqui"');
  process.exit(1);
}

const notion = new Client({ auth: NOTION_TOKEN });

async function testConnection() {
  console.log('🔍 Testando conexão com Notion...\n');

  try {
    // Testar listagem de databases
    const response = await notion.search({
      filter: {
        property: 'object',
        value: 'database'
      },
      page_size: 10
    });

    console.log('✅ Conexão estabelecida com sucesso!\n');
    console.log(`📊 Databases encontradas: ${response.results.length}\n`);

    if (response.results.length > 0) {
      console.log('Suas databases:');
      response.results.forEach((db, index) => {
        const title = db.title?.[0]?.plain_text || 'Sem título';
        console.log(`  ${index + 1}. ${title}`);
        console.log(`     ID: ${db.id}`);
      });
    } else {
      console.log('⚠️  Nenhuma database encontrada.');
      console.log('Certifique-se de que a Integration tem acesso às suas databases.');
    }

    console.log('\n💡 Próximos passos:');
    console.log('1. Copie os IDs das databases acima');
    console.log('2. Configure as variáveis de ambiente:');
    console.log('   - NOTION_DESTINATIONS_DB_ID');
    console.log('   - NOTION_RESTAURANTS_DB_ID');
    console.log('   - NOTION_ACTIVITIES_DB_ID');

  } catch (error) {
    console.error('❌ Erro ao conectar:', error.message);
    console.log('\nVerifique se:');
    console.log('1. O token está correto');
    console.log('2. A Integration tem permissão nas databases');
    process.exit(1);
  }
}

testConnection();
