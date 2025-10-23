const { unified } = require('unified');
const remarkParse = require('remark-parse').default || require('remark-parse');
const remarkGfm = require('remark-gfm').default || require('remark-gfm');

/**
 * Parse Markdown to AST with position tracking
 * @param {string} markdown - Raw markdown content
 * @returns {Object} - AST tree with position information
 */
function parseMarkdownToAST(markdown) {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm);

  // Parse the markdown - the parse method is synchronous
  const ast = processor.parse(markdown);
  return ast;
}

/**
 * Convert AST node to Notion block format
 * @param {Object} node - AST node
 * @returns {Object|null} - Notion block or null if not convertible
 */
function astNodeToNotionBlock(node) {
  if (!node.type) return null;

  switch (node.type) {
    case 'heading':
      return convertHeading(node);

    case 'paragraph':
      return convertParagraph(node);

    case 'list':
      return convertList(node);

    case 'listItem':
      return convertListItem(node);

    case 'code':
      return convertCode(node);

    case 'blockquote':
      return convertBlockquote(node);

    case 'thematicBreak':
      return {
        object: 'block',
        type: 'divider',
        divider: {}
      };

    case 'table':
      return convertTable(node);

    case 'html':
      return convertHtml(node);

    default:
      return null;
  }
}

/**
 * Convert heading node to Notion block
 */
function convertHeading(node) {
  const level = Math.min(node.depth, 3); // Notion supports heading_1, heading_2, heading_3
  const type = `heading_${level}`;

  return {
    object: 'block',
    type,
    [type]: {
      rich_text: convertInlineContent(node.children),
      color: 'default'
    }
  };
}

/**
 * Convert paragraph node to Notion block
 */
function convertParagraph(node) {
  const richText = convertInlineContent(node.children);

  // Skip empty paragraphs
  if (richText.length === 0 || (richText.length === 1 && !richText[0].text.content.trim())) {
    return null;
  }

  return {
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: richText,
      color: 'default'
    }
  };
}

/**
 * Convert list node to Notion blocks (returns array since lists are flattened)
 */
function convertList(node) {
  const type = node.ordered ? 'numbered_list_item' : 'bulleted_list_item';

  return node.children.map(item => {
    const richText = convertInlineContent(item.children);

    return {
      object: 'block',
      type,
      [type]: {
        rich_text: richText,
        color: 'default'
      }
    };
  });
}

/**
 * Convert list item node to Notion block
 */
function convertListItem(node) {
  // This is handled by convertList
  return null;
}

/**
 * Convert code block to Notion block
 */
function convertCode(node) {
  return {
    object: 'block',
    type: 'code',
    code: {
      rich_text: [{
        type: 'text',
        text: { content: node.value || '' }
      }],
      language: node.lang || 'plain text'
    }
  };
}

/**
 * Convert blockquote to Notion block
 */
function convertBlockquote(node) {
  const richText = convertInlineContent(node.children);

  return {
    object: 'block',
    type: 'quote',
    quote: {
      rich_text: richText,
      color: 'default'
    }
  };
}

/**
 * Convert table to Notion table block
 */
function convertTable(node) {
  // Notion tables are complex - for now, convert to code block with markdown table
  const tableMarkdown = reconstructTableMarkdown(node);

  return {
    object: 'block',
    type: 'code',
    code: {
      rich_text: [{
        type: 'text',
        text: { content: tableMarkdown }
      }],
      language: 'markdown'
    }
  };
}

/**
 * Reconstruct markdown table from AST
 */
function reconstructTableMarkdown(node) {
  let markdown = '';

  if (node.children && node.children.length > 0) {
    node.children.forEach((row, rowIndex) => {
      const cells = row.children.map(cell =>
        cell.children.map(c => extractTextFromNode(c)).join('')
      );
      markdown += '| ' + cells.join(' | ') + ' |\n';

      // Add separator after header row
      if (rowIndex === 0) {
        markdown += '| ' + cells.map(() => '---').join(' | ') + ' |\n';
      }
    });
  }

  return markdown;
}

/**
 * Convert HTML to Notion block (handle <details> tags)
 */
function convertHtml(node) {
  const html = node.value || '';

  // Check if it's a <details> tag for spoilers
  if (html.includes('<details>')) {
    return {
      object: 'block',
      type: 'toggle',
      toggle: {
        rich_text: [{
          type: 'text',
          text: { content: 'Detalhes' }
        }],
        color: 'default'
      }
    };
  }

  // For other HTML, convert to paragraph with plain text
  const textContent = html.replace(/<[^>]*>/g, '').trim();
  if (!textContent) return null;

  return {
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: [{
        type: 'text',
        text: { content: textContent }
      }]
    }
  };
}

/**
 * Convert inline content (text, links, emphasis, etc.) to Notion rich_text array
 */
function convertInlineContent(nodes) {
  if (!nodes || nodes.length === 0) return [];

  const richText = [];

  for (const node of nodes) {
    if (node.type === 'text') {
      richText.push({
        type: 'text',
        text: { content: node.value },
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: 'default'
        }
      });
    } else if (node.type === 'strong') {
      // Bold text
      const content = extractTextFromNode(node);
      richText.push({
        type: 'text',
        text: { content },
        annotations: {
          bold: true,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: 'default'
        }
      });
    } else if (node.type === 'emphasis') {
      // Italic text
      const content = extractTextFromNode(node);
      richText.push({
        type: 'text',
        text: { content },
        annotations: {
          bold: false,
          italic: true,
          strikethrough: false,
          underline: false,
          code: false,
          color: 'default'
        }
      });
    } else if (node.type === 'inlineCode') {
      // Inline code
      richText.push({
        type: 'text',
        text: { content: node.value },
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: true,
          color: 'default'
        }
      });
    } else if (node.type === 'link') {
      // Link
      const content = extractTextFromNode(node);
      richText.push({
        type: 'text',
        text: {
          content,
          link: { url: node.url }
        },
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: 'default'
        }
      });
    } else if (node.type === 'break') {
      // Line break
      richText.push({
        type: 'text',
        text: { content: '\n' }
      });
    } else if (node.children) {
      // Recursively process children
      richText.push(...convertInlineContent(node.children));
    }
  }

  // Merge consecutive text nodes with same formatting
  return mergeConsecutiveTextNodes(richText);
}

/**
 * Extract plain text from AST node
 */
function extractTextFromNode(node) {
  if (node.type === 'text') {
    return node.value;
  } else if (node.children) {
    return node.children.map(extractTextFromNode).join('');
  }
  return '';
}

/**
 * Merge consecutive text nodes with identical formatting
 */
function mergeConsecutiveTextNodes(richText) {
  if (richText.length <= 1) return richText;

  const merged = [];
  let current = richText[0];

  for (let i = 1; i < richText.length; i++) {
    const next = richText[i];

    // Check if both are text and have same annotations
    if (
      current.type === 'text' &&
      next.type === 'text' &&
      !current.text.link &&
      !next.text.link &&
      JSON.stringify(current.annotations) === JSON.stringify(next.annotations)
    ) {
      // Merge
      current.text.content += next.text.content;
    } else {
      merged.push(current);
      current = next;
    }
  }

  merged.push(current);
  return merged;
}

/**
 * Parse markdown and convert to Notion blocks with position tracking
 * @param {string} markdown - Raw markdown content
 * @returns {Array<{block: Object, position: Object}>}
 */
function markdownToNotionBlocks(markdown) {
  const ast = parseMarkdownToAST(markdown);
  const blocks = [];

  function traverse(node, lineOffset = 0) {
    const notionBlock = astNodeToNotionBlock(node);

    if (notionBlock) {
      // Handle list nodes that return arrays
      if (Array.isArray(notionBlock)) {
        notionBlock.forEach((block, index) => {
          blocks.push({
            block,
            position: node.position ? {
              start: node.position.start.line,
              end: node.position.end.line
            } : null,
            type: node.type,
            listIndex: index
          });
        });
      } else {
        blocks.push({
          block: notionBlock,
          position: node.position ? {
            start: node.position.start.line,
            end: node.position.end.line
          } : null,
          type: node.type
        });
      }
    }

    // Traverse children for non-list nodes (lists are handled above)
    if (node.children && node.type !== 'list') {
      node.children.forEach(child => traverse(child, lineOffset));
    }
  }

  if (ast.children) {
    ast.children.forEach(child => traverse(child));
  }

  return blocks;
}

module.exports = {
  parseMarkdownToAST,
  astNodeToNotionBlock,
  markdownToNotionBlocks,
  convertInlineContent,
  extractTextFromNode
};
