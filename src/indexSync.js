const fs = require('fs');
const path = require('path');
const notion = require('./notion');
const { getFileMapping } = require('./map');

/**
 * Update INDICE.md with Notion page links
 * @param {Object} syncMap - The sync map
 * @param {string} rootPageId - Root Notion page ID
 */
async function updateIndexWithNotionLinks(syncMap, rootPageId) {
  const indexPath = 'INDICE.md';
  const indexFilePath = path.join(process.cwd(), indexPath);

  if (!fs.existsSync(indexFilePath)) {
    console.log('INDICE.md not found, skipping link update');
    return;
  }

  let content = fs.readFileSync(indexFilePath, 'utf8');

  // Build a map of file paths to Notion URLs
  const notionLinks = {};

  for (const [filePath, mapping] of Object.entries(syncMap.files)) {
    if (mapping.pageId) {
      const notionUrl = `https://notion.so/${mapping.pageId.replace(/-/g, '')}`;
      notionLinks[filePath] = notionUrl;
    }
  }

  // Replace or add Notion links in the index
  // This is a simplified version - you can enhance this based on your INDICE structure
  for (const [filePath, notionUrl] of Object.entries(notionLinks)) {
    const fileName = path.basename(filePath, '.md');

    // Look for references to this file in the index
    const patterns = [
      new RegExp(`\\[${fileName}\\]\\([^)]+\\)`, 'gi'),
      new RegExp(`${fileName}(?!\\])`, 'gi')
    ];

    // Try to replace existing links
    let replaced = false;
    for (const pattern of patterns) {
      if (content.match(pattern)) {
        content = content.replace(pattern, `[${fileName}](${notionUrl})`);
        replaced = true;
        break;
      }
    }
  }

  // Write updated content back
  fs.writeFileSync(indexFilePath, content, 'utf8');
  console.log('✅ Updated INDICE.md with Notion links');
}

/**
 * Generate a Notion-friendly index page content
 * @param {Object} syncMap - The sync map
 * @returns {Array} - Array of Notion blocks
 */
function generateIndexBlocks(syncMap) {
  const blocks = [];

  // Add title
  blocks.push({
    object: 'block',
    type: 'heading_1',
    heading_1: {
      rich_text: [{
        type: 'text',
        text: { content: '🗺️ Índice de Viagem' }
      }]
    }
  });

  // Group files by folder
  const filesByFolder = {
    root: [],
    itineraries: [],
    guides: []
  };

  for (const [filePath, mapping] of Object.entries(syncMap.files)) {
    if (filePath.startsWith('itineraries/')) {
      filesByFolder.itineraries.push({ filePath, mapping });
    } else if (filePath.startsWith('guides/')) {
      filesByFolder.guides.push({ filePath, mapping });
    } else {
      filesByFolder.root.push({ filePath, mapping });
    }
  }

  // Add itineraries section
  if (filesByFolder.itineraries.length > 0) {
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{
          type: 'text',
          text: { content: '📍 Roteiros' }
        }]
      }
    });

    for (const { filePath, mapping } of filesByFolder.itineraries) {
      const fileName = path.basename(filePath, '.md');
      const notionUrl = `https://notion.so/${mapping.pageId.replace(/-/g, '')}`;

      blocks.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [{
            type: 'text',
            text: {
              content: fileName,
              link: { url: notionUrl }
            }
          }]
        }
      });
    }
  }

  // Add guides section
  if (filesByFolder.guides.length > 0) {
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{
          type: 'text',
          text: { content: '📚 Guias' }
        }]
      }
    });

    for (const { filePath, mapping } of filesByFolder.guides) {
      const fileName = path.basename(filePath, '.md');
      const notionUrl = `https://notion.so/${mapping.pageId.replace(/-/g, '')}`;

      blocks.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [{
            type: 'text',
            text: {
              content: fileName,
              link: { url: notionUrl }
            }
          }]
        }
      });
    }
  }

  return blocks;
}

/**
 * Sync the index page to Notion
 * @param {Object} syncMap - The sync map
 * @param {string} rootPageId - Root Notion page ID
 */
async function syncIndexPage(syncMap, rootPageId) {
  const indexPath = 'INDICE.md';
  const indexMapping = getFileMapping(syncMap, indexPath);

  if (!indexMapping || !indexMapping.pageId) {
    console.log('INDICE page not found in Notion, skipping index sync');
    return;
  }

  console.log('Syncing index page with cross-references...');

  // Generate index blocks with links
  const indexBlocks = generateIndexBlocks(syncMap);

  // Clear existing blocks and add new ones
  // Note: This is a simplified version - you might want to use delta updates here too
  await notion.clearPageBlocks(indexMapping.pageId);
  await notion.appendBlocks(indexMapping.pageId, indexBlocks);

  console.log('✅ Index page synced with cross-references');
}

module.exports = {
  updateIndexWithNotionLinks,
  generateIndexBlocks,
  syncIndexPage
};
