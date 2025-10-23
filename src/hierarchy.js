const path = require('path');
const notion = require('./notion');
const { getHierarchyMapping, updateHierarchyMapping } = require('./map');

// Emojis for different folders and files
const FOLDER_EMOJIS = {
  'itineraries': '🗺️',
  'guides': '📚'
};

const FILE_EMOJIS = {
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

/**
 * Get or create a folder page in Notion
 * @param {Object} syncMap - The sync map
 * @param {string} folderPath - Folder path (e.g., 'itineraries')
 * @param {string} parentPageId - Parent page ID
 * @returns {Promise<string>} - Folder page ID
 */
async function getOrCreateFolder(syncMap, folderPath, parentPageId) {
  // Check if folder already exists in sync map
  const hierarchyMapping = getHierarchyMapping(syncMap, folderPath);

  if (hierarchyMapping && hierarchyMapping.pageId) {
    // Verify the page still exists
    try {
      await notion.getPage(hierarchyMapping.pageId);
      return hierarchyMapping.pageId;
    } catch (error) {
      console.log(`Folder page ${folderPath} not found, recreating...`);
    }
  }

  // Create the folder page
  const folderName = formatFolderName(folderPath);
  const emoji = FOLDER_EMOJIS[folderPath] || '📁';

  console.log(`Creating folder page: ${emoji} ${folderName}`);

  const page = await notion.createPage(parentPageId, folderName, emoji);

  // Update sync map
  updateHierarchyMapping(syncMap, folderPath, page.id);

  return page.id;
}

/**
 * Format folder name for display
 * @param {string} folderPath - Folder path
 * @returns {string} - Formatted name
 */
function formatFolderName(folderPath) {
  const parts = folderPath.split('/').filter(p => p);
  const name = parts[parts.length - 1];

  // Capitalize and replace hyphens with spaces
  return name
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format file name for display
 * @param {string} filePath - File path
 * @returns {string} - Formatted name
 */
function formatFileName(filePath) {
  const baseName = path.basename(filePath, '.md');

  // Special case for INDICE
  if (baseName === 'INDICE') {
    return 'Índice';
  }

  // Special case for shopping-guide
  if (baseName === 'shopping-guide') {
    return 'Shopping Guide';
  }

  // Capitalize and replace hyphens with spaces
  return baseName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get emoji for a file
 * @param {string} filePath - File path
 * @returns {string} - Emoji
 */
function getFileEmoji(filePath) {
  const baseName = path.basename(filePath, '.md');
  return FILE_EMOJIS[baseName] || '📄';
}

/**
 * Get the full page title with emoji
 * @param {string} filePath - File path
 * @returns {string} - Full page title
 */
function getPageTitle(filePath) {
  const emoji = getFileEmoji(filePath);
  const name = formatFileName(filePath);
  return `${emoji} ${name}`;
}

/**
 * Parse file path to get folder and file info
 * @param {string} filePath - File path (e.g., 'itineraries/tokyo.md')
 * @returns {Object} - {folder: string|null, fileName: string}
 */
function parseFilePath(filePath) {
  const parts = filePath.split('/');

  if (parts.length === 1) {
    // Root level file (e.g., 'INDICE.md')
    return {
      folder: null,
      fileName: parts[0]
    };
  }

  // File in a folder (e.g., 'itineraries/tokyo.md')
  return {
    folder: parts.slice(0, -1).join('/'),
    fileName: parts[parts.length - 1]
  };
}

/**
 * Get or create the parent page for a file
 * @param {Object} syncMap - The sync map
 * @param {string} filePath - File path
 * @param {string} rootPageId - Root page ID
 * @returns {Promise<string>} - Parent page ID
 */
async function getParentPageId(syncMap, filePath, rootPageId) {
  const { folder } = parseFilePath(filePath);

  if (!folder) {
    // Root level file
    return rootPageId;
  }

  // Get or create folder page
  return await getOrCreateFolder(syncMap, folder, rootPageId);
}

/**
 * Ensure folder hierarchy exists in Notion
 * @param {Object} syncMap - The sync map
 * @param {Array<string>} filePaths - Array of file paths
 * @param {string} rootPageId - Root page ID
 */
async function ensureFolderHierarchy(syncMap, filePaths, rootPageId) {
  const folders = new Set();

  // Extract unique folders
  for (const filePath of filePaths) {
    const { folder } = parseFilePath(filePath);
    if (folder) {
      folders.add(folder);
    }
  }

  // Create all folders
  for (const folder of folders) {
    await getOrCreateFolder(syncMap, folder, rootPageId);
  }
}

module.exports = {
  getOrCreateFolder,
  formatFolderName,
  formatFileName,
  getFileEmoji,
  getPageTitle,
  parseFilePath,
  getParentPageId,
  ensureFolderHierarchy
};
