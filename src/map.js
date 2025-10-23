const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MAP_FILE = path.join(__dirname, '..', '.notion-sync-map.json');

/**
 * Load the sync map from disk
 * @returns {Object} - The sync map object
 */
function loadSyncMap() {
  try {
    if (fs.existsSync(MAP_FILE)) {
      const content = fs.readFileSync(MAP_FILE, 'utf8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('Error loading sync map:', error.message);
  }

  // Return empty map structure
  return {
    version: '1.0.0',
    lastSync: null,
    lastCommitSha: null,
    files: {},
    hierarchy: {}
  };
}

/**
 * Save the sync map to disk
 * @param {Object} syncMap - The sync map to save
 */
function saveSyncMap(syncMap) {
  try {
    syncMap.lastSync = new Date().toISOString();
    fs.writeFileSync(MAP_FILE, JSON.stringify(syncMap, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving sync map:', error.message);
    throw error;
  }
}

/**
 * Generate a content hash for a block
 * @param {Object} block - Notion block object
 * @returns {string} - SHA256 hash
 */
function generateBlockHash(block) {
  const blockCopy = JSON.parse(JSON.stringify(block));

  // Remove fields that shouldn't affect the hash
  delete blockCopy.id;
  delete blockCopy.created_time;
  delete blockCopy.last_edited_time;
  delete blockCopy.created_by;
  delete blockCopy.last_edited_by;
  delete blockCopy.has_children;
  delete blockCopy.archived;
  delete blockCopy.object;
  delete blockCopy.parent;

  const content = JSON.stringify(blockCopy);
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Generate a content hash from markdown text
 * @param {string} text - Markdown text
 * @returns {string} - SHA256 hash
 */
function generateTextHash(text) {
  return crypto.createHash('sha256').update(text.trim()).digest('hex');
}

/**
 * Update file mapping in sync map
 * @param {Object} syncMap - The sync map
 * @param {string} filePath - Path to the markdown file
 * @param {string} pageId - Notion page ID
 * @param {Array} blocks - Array of {block, position, notionId, hash}
 */
function updateFileMapping(syncMap, filePath, pageId, blocks) {
  syncMap.files[filePath] = {
    pageId,
    lastUpdated: new Date().toISOString(),
    blocks: blocks.map(b => ({
      position: b.position,
      notionId: b.notionId,
      hash: b.hash,
      type: b.type
    }))
  };
}

/**
 * Get file mapping from sync map
 * @param {Object} syncMap - The sync map
 * @param {string} filePath - Path to the markdown file
 * @returns {Object|null} - File mapping or null
 */
function getFileMapping(syncMap, filePath) {
  return syncMap.files[filePath] || null;
}

/**
 * Compute delta operations for a file
 * @param {Object} oldMapping - Old file mapping from sync map
 * @param {Array} newBlocks - New blocks with positions from parser
 * @param {Array} changedLines - Changed line ranges from git diff
 * @returns {Array<{op: 'create'|'update'|'delete', block, notionId, position}>}
 */
function computeDeltaOperations(oldMapping, newBlocks, changedLines) {
  const operations = [];

  if (!oldMapping) {
    // New file - create all blocks
    return newBlocks.map(b => ({
      op: 'create',
      block: b.block,
      position: b.position,
      hash: generateBlockHash(b.block)
    }));
  }

  // Build a map of old blocks by position
  const oldBlocksByPosition = new Map();
  if (oldMapping.blocks) {
    oldMapping.blocks.forEach(b => {
      if (b.position) {
        const key = `${b.position.start}-${b.position.end}`;
        oldBlocksByPosition.set(key, b);
      }
    });
  }

  // Check if a line range overlaps with changed lines
  const isLineChanged = (start, end) => {
    if (!changedLines || changedLines.length === 0) {
      // If no specific changed lines, assume everything changed
      return true;
    }

    return changedLines.some(change =>
      (start >= change.startLine && start <= change.endLine) ||
      (end >= change.startLine && end <= change.endLine) ||
      (start <= change.startLine && end >= change.endLine)
    );
  };

  // Process new blocks
  const processedOldBlocks = new Set();

  for (const newBlock of newBlocks) {
    if (!newBlock.position) {
      // No position tracking - always create
      operations.push({
        op: 'create',
        block: newBlock.block,
        position: null,
        hash: generateBlockHash(newBlock.block)
      });
      continue;
    }

    const posKey = `${newBlock.position.start}-${newBlock.position.end}`;
    const oldBlock = oldBlocksByPosition.get(posKey);

    if (!oldBlock) {
      // New block - create
      operations.push({
        op: 'create',
        block: newBlock.block,
        position: newBlock.position,
        hash: generateBlockHash(newBlock.block)
      });
    } else {
      processedOldBlocks.add(posKey);

      // Check if block content changed
      const newHash = generateBlockHash(newBlock.block);

      if (newHash !== oldBlock.hash || isLineChanged(newBlock.position.start, newBlock.position.end)) {
        // Block changed - update
        operations.push({
          op: 'update',
          block: newBlock.block,
          notionId: oldBlock.notionId,
          position: newBlock.position,
          hash: newHash
        });
      } else {
        // Block unchanged - skip
        operations.push({
          op: 'skip',
          notionId: oldBlock.notionId,
          position: newBlock.position,
          hash: oldBlock.hash
        });
      }
    }
  }

  // Find deleted blocks (in old mapping but not in new blocks)
  if (oldMapping.blocks) {
    for (const oldBlock of oldMapping.blocks) {
      if (!oldBlock.position) continue;

      const posKey = `${oldBlock.position.start}-${oldBlock.position.end}`;

      if (!processedOldBlocks.has(posKey)) {
        // Block was deleted
        operations.push({
          op: 'delete',
          notionId: oldBlock.notionId,
          position: oldBlock.position
        });
      }
    }
  }

  return operations;
}

/**
 * Update hierarchy mapping in sync map
 * @param {Object} syncMap - The sync map
 * @param {string} folderPath - Folder path (e.g., 'itineraries')
 * @param {string} pageId - Notion page ID for this folder
 */
function updateHierarchyMapping(syncMap, folderPath, pageId) {
  syncMap.hierarchy[folderPath] = {
    pageId,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Get hierarchy mapping from sync map
 * @param {Object} syncMap - The sync map
 * @param {string} folderPath - Folder path
 * @returns {Object|null} - Hierarchy mapping or null
 */
function getHierarchyMapping(syncMap, folderPath) {
  return syncMap.hierarchy[folderPath] || null;
}

/**
 * Remove file from sync map (when file is deleted)
 * @param {Object} syncMap - The sync map
 * @param {string} filePath - Path to the markdown file
 */
function removeFileMapping(syncMap, filePath) {
  delete syncMap.files[filePath];
}

/**
 * Get all tracked files from sync map
 * @param {Object} syncMap - The sync map
 * @returns {Array<string>} - Array of file paths
 */
function getTrackedFiles(syncMap) {
  return Object.keys(syncMap.files);
}

/**
 * Mark sync as complete
 * @param {Object} syncMap - The sync map
 * @param {string} commitSha - The commit SHA that was synced
 */
function markSyncComplete(syncMap, commitSha) {
  syncMap.lastCommitSha = commitSha;
  syncMap.lastSync = new Date().toISOString();
}

module.exports = {
  loadSyncMap,
  saveSyncMap,
  generateBlockHash,
  generateTextHash,
  updateFileMapping,
  getFileMapping,
  computeDeltaOperations,
  updateHierarchyMapping,
  getHierarchyMapping,
  removeFileMapping,
  getTrackedFiles,
  markSyncComplete
};
