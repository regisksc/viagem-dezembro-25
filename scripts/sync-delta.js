#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const git = require('../src/git');
const parse = require('../src/parse');
const map = require('../src/map');
const notion = require('../src/notion');
const hierarchy = require('../src/hierarchy');
const indexSync = require('../src/indexSync');

// Configuration
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_PARENT_PAGE_ID = process.env.NOTION_PARENT_PAGE_ID;
const BASE_SHA = process.env.BASE_SHA || 'HEAD~1';
const HEAD_SHA = process.env.HEAD_SHA || 'HEAD';
const FORCE_FULL_SYNC = process.env.FORCE_FULL_SYNC === 'true';

/**
 * Validate environment variables
 */
function validateEnvironment() {
  if (!NOTION_TOKEN) {
    console.error('❌ NOTION_TOKEN not configured');
    process.exit(1);
  }

  if (!NOTION_PARENT_PAGE_ID) {
    console.error('❌ NOTION_PARENT_PAGE_ID not configured');
    process.exit(1);
  }
}

/**
 * Sync a single file to Notion
 * @param {Object} syncMap - The sync map
 * @param {string} filePath - Path to the markdown file
 * @param {Array} changedLines - Changed line ranges (optional, for delta sync)
 * @returns {Promise<void>}
 */
async function syncFile(syncMap, filePath, changedLines = null) {
  console.log(`\n📄 Syncing: ${filePath}`);

  // Read file content
  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }

  const markdown = fs.readFileSync(fullPath, 'utf8');

  if (!markdown.trim()) {
    console.log('⚠️  File is empty');
    return;
  }

  try {
    // Parse markdown to Notion blocks with position tracking
    const blocksWithPosition = parse.markdownToNotionBlocks(markdown);

    if (blocksWithPosition.length === 0) {
      console.log('⚠️  No valid blocks found');
      return;
    }

    // Get or create parent page (folder or root)
    const parentPageId = await hierarchy.getParentPageId(syncMap, filePath, NOTION_PARENT_PAGE_ID);

    // Get page title
    const pageTitle = hierarchy.getPageTitle(filePath);

    // Check if page already exists
    const existingMapping = map.getFileMapping(syncMap, filePath);
    let pageId;

    if (existingMapping && existingMapping.pageId) {
      // Page exists, verify it's still there
      try {
        await notion.getPage(existingMapping.pageId);
        pageId = existingMapping.pageId;
        console.log('🔄 Updating existing page...');
      } catch (error) {
        console.log('Page not found, creating new one...');
        existingMapping.pageId = null;
      }
    }

    if (!pageId) {
      // Create new page
      console.log('✨ Creating new page...');
      const emoji = hierarchy.getFileEmoji(filePath);
      const name = hierarchy.formatFileName(filePath);
      const newPage = await notion.createPage(parentPageId, `${emoji} ${name}`, emoji);
      pageId = newPage.id;
    }

    // Compute delta operations
    const operations = map.computeDeltaOperations(
      existingMapping,
      blocksWithPosition,
      changedLines
    );

    console.log(`📊 Operations: ${operations.filter(o => o.op === 'create').length} create, ${operations.filter(o => o.op === 'update').length} update, ${operations.filter(o => o.op === 'delete').length} delete, ${operations.filter(o => o.op === 'skip').length} skip`);

    // Apply delta operations
    const results = await notion.applyDeltaOperations(pageId, operations);

    // Update sync map
    map.updateFileMapping(syncMap, filePath, pageId, results);

    console.log(`✅ Synced: ${pageTitle}`);

  } catch (error) {
    console.error(`❌ Error syncing ${filePath}:`, error.message);
  }
}

/**
 * Perform delta sync based on git diff
 */
async function deltaSync() {
  console.log('🚀 Starting delta sync...\n');

  // Load sync map
  const syncMap = map.loadSyncMap();

  // Get changed files
  const changedFiles = await git.getChangedMarkdownFiles(BASE_SHA, HEAD_SHA);

  console.log(`📝 Changed files: ${changedFiles.length}`);

  if (changedFiles.length === 0) {
    console.log('✅ No changes detected, nothing to sync');
    return;
  }

  // Ensure folder hierarchy exists
  const allFilePaths = changedFiles.map(f => f.path);
  await hierarchy.ensureFolderHierarchy(syncMap, allFilePaths, NOTION_PARENT_PAGE_ID);

  // Sync each changed file
  for (const file of changedFiles) {
    if (file.status === 'deleted') {
      // Handle file deletion
      console.log(`\n🗑️  File deleted: ${file.path}`);
      const fileMapping = map.getFileMapping(syncMap, file.path);

      if (fileMapping && fileMapping.pageId) {
        console.log('Archiving Notion page...');
        await notion.archivePage(fileMapping.pageId);
      }

      map.removeFileMapping(syncMap, file.path);
    } else {
      // Sync file (added or modified)
      await syncFile(syncMap, file.path, file.changedLines);
    }
  }

  // Update last commit SHA
  const currentSha = await git.getCurrentSha();
  map.markSyncComplete(syncMap, currentSha);

  // Save sync map
  map.saveSyncMap(syncMap);

  console.log('\n✅ Delta sync complete!');
}

/**
 * Perform full sync of all markdown files
 */
async function fullSync() {
  console.log('🚀 Starting full sync...\n');

  // Load sync map
  const syncMap = map.loadSyncMap();

  // Get all markdown files
  const allFiles = await git.getAllMarkdownFiles();

  console.log(`📝 Total files: ${allFiles.length}`);

  if (allFiles.length === 0) {
    console.log('⚠️  No markdown files found');
    return;
  }

  // Ensure folder hierarchy exists
  await hierarchy.ensureFolderHierarchy(syncMap, allFiles, NOTION_PARENT_PAGE_ID);

  // Sync each file
  for (const filePath of allFiles) {
    await syncFile(syncMap, filePath, null);
  }

  // Update last commit SHA
  const currentSha = await git.getCurrentSha();
  map.markSyncComplete(syncMap, currentSha);

  // Save sync map
  map.saveSyncMap(syncMap);

  console.log('\n✅ Full sync complete!');
}

/**
 * Main function
 */
async function main() {
  try {
    // Validate environment
    validateEnvironment();

    // Initialize Notion client
    notion.initializeClient(NOTION_TOKEN);

    // Check if we're in a git repository
    const isRepo = await git.isGitRepo();

    if (!isRepo) {
      console.error('❌ Not a git repository');
      process.exit(1);
    }

    // Decide sync strategy
    if (FORCE_FULL_SYNC) {
      console.log('🔄 Force full sync mode enabled\n');
      await fullSync();
    } else {
      // Try delta sync
      try {
        await deltaSync();
      } catch (error) {
        console.error('⚠️  Delta sync failed, falling back to full sync');
        console.error('Error:', error.message);
        await fullSync();
      }
    }

    // Display Notion URL
    console.log('\n📍 Acesse suas páginas no Notion:');
    console.log(`   https://notion.so/${NOTION_PARENT_PAGE_ID.replace(/-/g, '')}\n`);

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run main function
main();
