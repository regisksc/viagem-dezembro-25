const simpleGit = require('simple-git');
const path = require('path');

const git = simpleGit();

/**
 * Get changed markdown files between two commits
 * @param {string} baseSha - Base commit SHA (can be 'HEAD~1' or specific SHA)
 * @param {string} headSha - Head commit SHA (usually 'HEAD')
 * @returns {Promise<Array<{path: string, status: 'added'|'modified'|'deleted', changedLines: Array}>>}
 */
async function getChangedMarkdownFiles(baseSha = 'HEAD~1', headSha = 'HEAD') {
  try {
    // Get diff summary
    const diffSummary = await git.diffSummary([baseSha, headSha]);

    // Filter only .md files
    const mdFiles = diffSummary.files.filter(file =>
      file.file.endsWith('.md') &&
      (file.file.startsWith('itineraries/') ||
       file.file.startsWith('guides/') ||
       file.file === 'INDICE.md')
    );

    // Get detailed diff for each file to extract changed line ranges
    const filesWithChanges = await Promise.all(
      mdFiles.map(async (file) => {
        const filePath = file.file;
        let status = 'modified';

        if (file.insertions > 0 && file.deletions === 0 && file.changes === file.insertions) {
          status = 'added';
        } else if (file.deletions > 0 && file.insertions === 0) {
          status = 'deleted';
        }

        // Get line-by-line diff
        const diffDetails = await git.diff([baseSha, headSha, '--unified=0', '--', filePath]);
        const changedLines = parseChangedLines(diffDetails);

        return {
          path: filePath,
          status,
          changedLines,
          insertions: file.insertions,
          deletions: file.deletions
        };
      })
    );

    return filesWithChanges;
  } catch (error) {
    console.error('Error getting changed files:', error.message);
    throw error;
  }
}

/**
 * Parse git diff output to extract changed line ranges
 * @param {string} diffOutput - Raw git diff output
 * @returns {Array<{startLine: number, endLine: number, type: 'added'|'deleted'|'modified'}>}
 */
function parseChangedLines(diffOutput) {
  const changes = [];
  const lines = diffOutput.split('\n');

  for (const line of lines) {
    // Match hunk headers like: @@ -10,5 +10,7 @@
    const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);

    if (hunkMatch) {
      const oldStart = parseInt(hunkMatch[1]);
      const oldCount = parseInt(hunkMatch[2] || '1');
      const newStart = parseInt(hunkMatch[3]);
      const newCount = parseInt(hunkMatch[4] || '1');

      let type = 'modified';
      if (oldCount === 0) {
        type = 'added';
      } else if (newCount === 0) {
        type = 'deleted';
      }

      changes.push({
        startLine: newStart,
        endLine: newStart + newCount - 1,
        type,
        oldStart,
        oldEnd: oldStart + oldCount - 1
      });
    }
  }

  return changes;
}

/**
 * Get the content of a file at a specific commit
 * @param {string} filePath - Path to the file
 * @param {string} commitSha - Commit SHA (default: 'HEAD')
 * @returns {Promise<string>}
 */
async function getFileContent(filePath, commitSha = 'HEAD') {
  try {
    const content = await git.show([`${commitSha}:${filePath}`]);
    return content;
  } catch (error) {
    if (error.message.includes('does not exist')) {
      return null;
    }
    throw error;
  }
}

/**
 * Check if we're in a git repository
 * @returns {Promise<boolean>}
 */
async function isGitRepo() {
  try {
    await git.revparse(['--git-dir']);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the current commit SHA
 * @returns {Promise<string>}
 */
async function getCurrentSha() {
  try {
    const sha = await git.revparse(['HEAD']);
    return sha.trim();
  } catch (error) {
    console.error('Error getting current SHA:', error.message);
    throw error;
  }
}

/**
 * Get all markdown files in the repository
 * @returns {Promise<Array<string>>}
 */
async function getAllMarkdownFiles() {
  try {
    const files = await git.raw(['ls-files', '*.md', 'itineraries/*.md', 'guides/*.md']);
    return files.trim().split('\n').filter(f => f);
  } catch (error) {
    console.error('Error getting all markdown files:', error.message);
    throw error;
  }
}

module.exports = {
  getChangedMarkdownFiles,
  parseChangedLines,
  getFileContent,
  isGitRepo,
  getCurrentSha,
  getAllMarkdownFiles
};
