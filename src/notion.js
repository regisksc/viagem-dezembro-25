const { Client } = require('@notionhq/client');

// Rate limiting configuration
const RATE_LIMIT_DELAY = 350; // ms between requests
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000; // ms

// Initialize Notion client
let notionClient = null;

/**
 * Initialize the Notion client
 * @param {string} token - Notion API token
 */
function initializeClient(token) {
  notionClient = new Client({ auth: token });
}

/**
 * Get the Notion client
 * @returns {Client}
 */
function getClient() {
  if (!notionClient) {
    throw new Error('Notion client not initialized. Call initializeClient() first.');
  }
  return notionClient;
}

/**
 * Sleep for a specified duration
 * @param {number} ms - Milliseconds to sleep
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry wrapper with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} retries - Number of retries
 * @returns {Promise}
 */
async function withRetry(fn, retries = MAX_RETRIES) {
  let lastError;

  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on certain errors
      if (error.code === 'object_not_found' || error.code === 'validation_error') {
        throw error;
      }

      // Exponential backoff
      const delay = RETRY_DELAY_BASE * Math.pow(2, i);
      console.log(`Retry ${i + 1}/${retries} after ${delay}ms...`);
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Create a new page
 * @param {string} parentId - Parent page or database ID
 * @param {string} title - Page title
 * @param {string} icon - Icon emoji (optional)
 * @returns {Promise<Object>} - Created page object
 */
async function createPage(parentId, title, icon = null) {
  const client = getClient();

  const properties = {
    title: {
      title: [{ text: { content: title } }]
    }
  };

  const pageData = {
    parent: { page_id: parentId },
    properties
  };

  if (icon) {
    pageData.icon = { emoji: icon };
  }

  const page = await withRetry(() => client.pages.create(pageData));
  await sleep(RATE_LIMIT_DELAY);

  return page;
}

/**
 * Retrieve a page by ID
 * @param {string} pageId - Page ID
 * @returns {Promise<Object>} - Page object
 */
async function getPage(pageId) {
  const client = getClient();
  const page = await withRetry(() => client.pages.retrieve({ page_id: pageId }));
  await sleep(RATE_LIMIT_DELAY);
  return page;
}

/**
 * Update a page's properties
 * @param {string} pageId - Page ID
 * @param {Object} properties - Properties to update
 * @returns {Promise<Object>} - Updated page object
 */
async function updatePage(pageId, properties) {
  const client = getClient();
  const page = await withRetry(() =>
    client.pages.update({
      page_id: pageId,
      properties
    })
  );
  await sleep(RATE_LIMIT_DELAY);
  return page;
}

/**
 * List child pages of a parent page
 * @param {string} parentId - Parent page ID
 * @returns {Promise<Array>} - Array of child pages
 */
async function listChildPages(parentId) {
  const client = getClient();

  const response = await withRetry(() =>
    client.blocks.children.list({
      block_id: parentId,
      page_size: 100
    })
  );

  await sleep(RATE_LIMIT_DELAY);

  const childPages = response.results.filter(block => block.type === 'child_page');
  return childPages;
}

/**
 * Find a child page by title
 * @param {string} parentId - Parent page ID
 * @param {string} title - Page title to search for
 * @returns {Promise<Object|null>} - Page object or null if not found
 */
async function findPageByTitle(parentId, title) {
  const childPages = await listChildPages(parentId);

  for (const childPage of childPages) {
    try {
      const page = await getPage(childPage.id);
      const pageTitle = page.properties?.title?.title?.[0]?.plain_text || '';

      if (pageTitle === title) {
        return page;
      }
    } catch (error) {
      console.error(`Error retrieving page ${childPage.id}:`, error.message);
    }
  }

  return null;
}

/**
 * Append blocks to a page
 * @param {string} pageId - Page ID
 * @param {Array} blocks - Array of Notion blocks
 * @returns {Promise<Object>} - Response object
 */
async function appendBlocks(pageId, blocks) {
  if (blocks.length === 0) return;

  const client = getClient();

  // Notion API limits to 100 blocks per request
  const batchSize = 100;

  for (let i = 0; i < blocks.length; i += batchSize) {
    const batch = blocks.slice(i, i + batchSize);

    await withRetry(() =>
      client.blocks.children.append({
        block_id: pageId,
        children: batch
      })
    );

    await sleep(RATE_LIMIT_DELAY);
  }
}

/**
 * Update a block
 * @param {string} blockId - Block ID
 * @param {Object} blockData - Block data to update
 * @returns {Promise<Object>} - Updated block object
 */
async function updateBlock(blockId, blockData) {
  const client = getClient();

  const block = await withRetry(() =>
    client.blocks.update({
      block_id: blockId,
      ...blockData
    })
  );

  await sleep(RATE_LIMIT_DELAY);
  return block;
}

/**
 * Delete a block
 * @param {string} blockId - Block ID
 * @returns {Promise<Object>} - Deleted block object
 */
async function deleteBlock(blockId) {
  const client = getClient();

  const block = await withRetry(() =>
    client.blocks.delete({ block_id: blockId })
  );

  await sleep(RATE_LIMIT_DELAY);
  return block;
}

/**
 * List all blocks in a page
 * @param {string} pageId - Page ID
 * @returns {Promise<Array>} - Array of blocks
 */
async function listBlocks(pageId) {
  const client = getClient();
  const blocks = [];

  let cursor = undefined;
  let hasMore = true;

  while (hasMore) {
    const response = await withRetry(() =>
      client.blocks.children.list({
        block_id: pageId,
        page_size: 100,
        start_cursor: cursor
      })
    );

    blocks.push(...response.results);
    hasMore = response.has_more;
    cursor = response.next_cursor;

    await sleep(RATE_LIMIT_DELAY);
  }

  return blocks;
}

/**
 * Delete all blocks in a page
 * @param {string} pageId - Page ID
 */
async function clearPageBlocks(pageId) {
  const blocks = await listBlocks(pageId);

  for (const block of blocks) {
    await deleteBlock(block.id);
  }
}

/**
 * Get a block by ID
 * @param {string} blockId - Block ID
 * @returns {Promise<Object>} - Block object
 */
async function getBlock(blockId) {
  const client = getClient();

  const block = await withRetry(() =>
    client.blocks.retrieve({ block_id: blockId })
  );

  await sleep(RATE_LIMIT_DELAY);
  return block;
}

/**
 * Archive a page
 * @param {string} pageId - Page ID
 * @returns {Promise<Object>} - Archived page object
 */
async function archivePage(pageId) {
  const client = getClient();

  const page = await withRetry(() =>
    client.pages.update({
      page_id: pageId,
      archived: true
    })
  );

  await sleep(RATE_LIMIT_DELAY);
  return page;
}

/**
 * Apply delta operations to a Notion page
 * @param {string} pageId - Page ID
 * @param {Array} operations - Delta operations
 * @returns {Promise<Array>} - Array of {notionId, hash} for created/updated blocks
 */
async function applyDeltaOperations(pageId, operations) {
  const results = [];

  for (const op of operations) {
    try {
      if (op.op === 'create') {
        // Create new block
        const response = await appendBlocks(pageId, [op.block]);
        results.push({
          position: op.position,
          notionId: response?.results?.[0]?.id || null,
          hash: op.hash,
          type: op.block.type
        });
      } else if (op.op === 'update') {
        // Update existing block
        await updateBlock(op.notionId, op.block);
        results.push({
          position: op.position,
          notionId: op.notionId,
          hash: op.hash,
          type: op.block.type
        });
      } else if (op.op === 'delete') {
        // Delete block
        await deleteBlock(op.notionId);
      } else if (op.op === 'skip') {
        // Keep existing block
        results.push({
          position: op.position,
          notionId: op.notionId,
          hash: op.hash,
          type: 'skip'
        });
      }
    } catch (error) {
      console.error(`Error applying operation ${op.op}:`, error.message);
      // Continue with other operations
    }
  }

  return results;
}

module.exports = {
  initializeClient,
  getClient,
  createPage,
  getPage,
  updatePage,
  listChildPages,
  findPageByTitle,
  appendBlocks,
  updateBlock,
  deleteBlock,
  listBlocks,
  clearPageBlocks,
  getBlock,
  archivePage,
  applyDeltaOperations
};
