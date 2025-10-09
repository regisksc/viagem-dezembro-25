#!/usr/bin/env node

const { Client } = require('@notionhq/client');
const fs = require('fs');
const path = require('path');

// Configuração
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DESTINATIONS_DB_ID = process.env.NOTION_DESTINATIONS_DB_ID;
const RESTAURANTS_DB_ID = process.env.NOTION_RESTAURANTS_DB_ID;
const ACTIVITIES_DB_ID = process.env.NOTION_ACTIVITIES_DB_ID;

// Validação de variáveis de ambiente
if (!NOTION_TOKEN) {
  console.error('❌ NOTION_TOKEN não configurado');
  process.exit(1);
}

const notion = new Client({ auth: NOTION_TOKEN });

// Ler dados da viagem
const tripDataPath = path.join(__dirname, '..', 'trip-data.json');
const tripData = JSON.parse(fs.readFileSync(tripDataPath, 'utf8'));

// Mapear emojis por país
const countryEmojis = {
  'China': '🇨🇳',
  'Japão': '🇯🇵',
  'França': '🇫🇷'
};

// Função auxiliar para buscar página por nome
async function findPageByName(databaseId, name) {
  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      filter: {
        property: 'Nome',
        title: { equals: name }
      }
    });
    return response.results.length > 0 ? response.results[0] : null;
  } catch (error) {
    console.error(`Erro ao buscar "${name}":`, error.message);
    return null;
  }
}

// Função para criar texto rico
function richText(text) {
  return text ? [{ text: { content: text } }] : [];
}

// Função para sincronizar destinos
async function syncDestinations() {
  if (!DESTINATIONS_DB_ID) {
    console.log('⏭️  Pulando destinos (NOTION_DESTINATIONS_DB_ID não configurado)');
    return;
  }

  console.log('\n📍 Sincronizando Destinos...\n');

  for (const city of tripData.itinerary) {
    const cityName = city.city;

    // Determinar país baseado na cidade
    let country = '';
    if (['Hong Kong', 'Shenzhen'].includes(cityName)) country = 'China';
    else if (['Osaka', 'Nara', 'Kyoto', 'Nagano City & Surroundings', 'Tokyo'].includes(cityName)) country = 'Japão';
    else if (cityName === 'Paris') country = 'França';

    const emoji = countryEmojis[country] || '🌍';

    const properties = {
      'Nome': {
        title: [{ text: { content: `${emoji} ${cityName}` } }]
      },
      'País': {
        select: { name: country }
      },
      'Check-in': {
        date: city.check_in ? { start: city.check_in } : null
      },
      'Check-out': {
        date: city.check_out ? { start: city.check_out } : null
      },
      'Hotel': {
        rich_text: richText(city.hotel?.name || 'N/A')
      },
      'Preço Hotel': {
        rich_text: richText(city.hotel?.rate_per_night || city.hotel?.expected_price || city.hotel?.discounted_rate || city.hotel?.amount_due_at_checkin || '')
      }
    };

    try {
      const existingPage = await findPageByName(DESTINATIONS_DB_ID, `${emoji} ${cityName}`);

      if (existingPage) {
        await notion.pages.update({
          page_id: existingPage.id,
          properties
        });
        console.log(`✅ Atualizado: ${cityName}`);
      } else {
        await notion.pages.create({
          parent: { database_id: DESTINATIONS_DB_ID },
          properties
        });
        console.log(`✨ Criado: ${cityName}`);
      }
    } catch (error) {
      console.error(`❌ Erro em ${cityName}:`, error.message);
    }

    // Rate limiting (max 3 requests/second)
    await new Promise(resolve => setTimeout(resolve, 350));
  }
}

// Função para sincronizar restaurantes
async function syncRestaurants() {
  if (!RESTAURANTS_DB_ID) {
    console.log('⏭️  Pulando restaurantes (NOTION_RESTAURANTS_DB_ID não configurado)');
    return;
  }

  console.log('\n🍽️  Sincronizando Restaurantes...\n');

  for (const city of tripData.itinerary) {
    const cityName = city.city;
    const restaurants = city.vegetarian_restaurants || [];

    for (const restaurant of restaurants) {
      const restaurantName = restaurant.name;

      // Determinar tipo
      let tipo = 'Vegetarian';
      if (restaurant.type?.toLowerCase().includes('vegan')) tipo = 'Vegan';
      else if (restaurant.type?.toLowerCase().includes('vegetarian')) tipo = 'Vegetarian';

      const properties = {
        'Nome': {
          title: [{ text: { content: restaurantName } }]
        },
        'Cidade': {
          rich_text: richText(cityName)
        },
        'Tipo': {
          select: { name: tipo }
        },
        'Localização': {
          rich_text: richText(restaurant.location || '')
        },
        'Preço': {
          rich_text: richText(restaurant.price || restaurant.price_range || '')
        },
        'Especialidade': {
          rich_text: richText(restaurant.specialty || restaurant.notes || '')
        },
        'Reserva': {
          rich_text: richText(restaurant.advance_booking || '')
        }
      };

      try {
        const existingPage = await findPageByName(RESTAURANTS_DB_ID, restaurantName);

        if (existingPage) {
          await notion.pages.update({
            page_id: existingPage.id,
            properties
          });
          console.log(`✅ Atualizado: ${restaurantName} (${cityName})`);
        } else {
          await notion.pages.create({
            parent: { database_id: RESTAURANTS_DB_ID },
            properties
          });
          console.log(`✨ Criado: ${restaurantName} (${cityName})`);
        }
      } catch (error) {
        console.error(`❌ Erro em ${restaurantName}:`, error.message);
      }

      await new Promise(resolve => setTimeout(resolve, 350));
    }
  }
}

// Função para sincronizar atividades
async function syncActivities() {
  if (!ACTIVITIES_DB_ID) {
    console.log('⏭️  Pulando atividades (NOTION_ACTIVITIES_DB_ID não configurado)');
    return;
  }

  console.log('\n🎯 Sincronizando Atividades...\n');

  for (const city of tripData.itinerary) {
    const cityName = city.city;
    const activities = city.activities || [];

    for (const activity of activities) {
      const activityName = activity.name;

      // Determinar necessidade de reserva
      let reserva = 'Não necessário';
      if (activity.advance_booking) {
        if (activity.advance_booking.includes('mês') || activity.advance_booking.includes('month')) {
          reserva = '1-2 meses';
        } else if (activity.advance_booking.includes('semana') || activity.advance_booking.includes('week')) {
          reserva = '1-2 semanas';
        } else if (activity.advance_booking.includes('dia') || activity.advance_booking.includes('day')) {
          reserva = '1-2 dias';
        } else if (activity.advance_booking === 'na hora') {
          reserva = 'Na hora';
        }
      }

      const properties = {
        'Nome': {
          title: [{ text: { content: activityName } }]
        },
        'Cidade': {
          rich_text: richText(cityName)
        },
        'Preço': {
          rich_text: richText(activity.price?.toString() || '0')
        },
        'Ingresso': {
          checkbox: activity.ticket_required || false
        },
        'Reserva': {
          select: { name: reserva }
        },
        'Notas': {
          rich_text: richText(activity.comments?.join(' | ') || activity.extra || '')
        }
      };

      try {
        const existingPage = await findPageByName(ACTIVITIES_DB_ID, activityName);

        if (existingPage) {
          await notion.pages.update({
            page_id: existingPage.id,
            properties
          });
          console.log(`✅ Atualizado: ${activityName} (${cityName})`);
        } else {
          await notion.pages.create({
            parent: { database_id: ACTIVITIES_DB_ID },
            properties
          });
          console.log(`✨ Criado: ${activityName} (${cityName})`);
        }
      } catch (error) {
        console.error(`❌ Erro em ${activityName}:`, error.message);
      }

      await new Promise(resolve => setTimeout(resolve, 350));
    }
  }
}

// Função principal
async function main() {
  const args = process.argv.slice(2);

  console.log('🚀 Iniciando sincronização com Notion...');
  console.log(`📅 Viagem: ${tripData.trip_overview.start_date} a ${tripData.trip_overview.end_date}`);
  console.log(`🌍 ${tripData.trip_overview.countries.join(', ')}`);

  try {
    if (args.includes('--cities') || args.length === 0) {
      await syncDestinations();
    }

    if (args.includes('--restaurants') || args.length === 0) {
      await syncRestaurants();
    }

    if (args.includes('--activities') || args.length === 0) {
      await syncActivities();
    }

    console.log('\n✅ Sincronização concluída com sucesso!\n');
  } catch (error) {
    console.error('\n❌ Erro durante sincronização:', error.message);
    process.exit(1);
  }
}

// Executar
main();
