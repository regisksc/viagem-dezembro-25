const MarkdownIt = require('markdown-it');

// Initialize markdown-it with GFM support
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true
});

/**
 * Parse Markdown to tokens with position tracking
 * @param {string} markdown - Raw markdown content
 * @returns {Array} - Token array with position information
 */
function parseMarkdownToTokens(markdown) {
  const tokens = md.parse(markdown, {});
  return tokens;
}

/**
 * Convert markdown-it token to Notion block format
 * @param {Object} token - markdown-it token
 * @param {Array} tokens - All tokens (for context)
 * @param {number} index - Current token index
 * @returns {Object|null} - Notion block or null if not convertible
 */
function tokenToNotionBlock(token, tokens, index) {
  if (!token.type) return null;

  // Skip closing tags
  if (token.nesting === -1) return null;

  switch (token.type) {
    case 'heading_open':
      return convertHeading(token, tokens, index);

    case 'paragraph_open':
      return convertParagraph(token, tokens, index);

    case 'bullet_list_open':
    case 'ordered_list_open':
      return convertList(token, tokens, index);

    case 'code_block':
    case 'fence':
      return convertCodeBlock(token);

    case 'blockquote_open':
      return convertBlockquote(token, tokens, index);

    case 'hr':
      return {
        object: 'block',
        type: 'divider',
        divider: {}
      };

    case 'html_block':
      return convertHtmlBlock(token);

    default:
      return null;
  }
}

/**
 * Convert heading token to Notion block
 */
function convertHeading(token, tokens, index) {
  const level = Math.min(parseInt(token.tag.substring(1)), 3);
  const type = `heading_${level}`;

  // Find the inline token with content
  const inlineToken = tokens[index + 1];
  const richText = inlineToken ? convertInlineToken(inlineToken) : [];

  return {
    object: 'block',
    type,
    [type]: {
      rich_text: richText,
      color: 'default'
    }
  };
}

/**
 * Convert paragraph token to Notion block
 */
function convertParagraph(token, tokens, index) {
  // Find the inline token with content
  const inlineToken = tokens[index + 1];
  const richText = inlineToken ? convertInlineToken(inlineToken) : [];

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
 * Convert list token to Notion blocks
 */
function convertList(token, tokens, index) {
  const isOrdered = token.type === 'ordered_list_open';
  const type = isOrdered ? 'numbered_list_item' : 'bulleted_list_item';
  const blocks = [];

  // Find all list items
  let i = index + 1;
  while (i < tokens.length && tokens[i].type !== 'bullet_list_close' && tokens[i].type !== 'ordered_list_close') {
    if (tokens[i].type === 'list_item_open') {
      // Find the inline content
      let j = i + 1;
      let richText = [];

      while (j < tokens.length && tokens[j].type !== 'list_item_close') {
        if (tokens[j].type === 'inline') {
          richText = convertInlineToken(tokens[j]);
          break;
        } else if (tokens[j].type === 'paragraph_open' && tokens[j + 1] && tokens[j + 1].type === 'inline') {
          richText = convertInlineToken(tokens[j + 1]);
          break;
        }
        j++;
      }

      blocks.push({
        object: 'block',
        type,
        [type]: {
          rich_text: richText.length > 0 ? richText : [{ type: 'text', text: { content: '' } }],
          color: 'default'
        }
      });
    }
    i++;
  }

  return blocks;
}

/**
 * Convert code block token to Notion block
 */
function convertCodeBlock(token) {
  return {
    object: 'block',
    type: 'code',
    code: {
      rich_text: [{
        type: 'text',
        text: { content: token.content || '' }
      }],
      language: token.info || 'plain text'
    }
  };
}

/**
 * Convert blockquote token to Notion block
 */
function convertBlockquote(token, tokens, index) {
  // Find inline content inside blockquote
  let richText = [];
  let i = index + 1;

  while (i < tokens.length && tokens[i].type !== 'blockquote_close') {
    if (tokens[i].type === 'inline') {
      richText = convertInlineToken(tokens[i]);
      break;
    } else if (tokens[i].type === 'paragraph_open' && tokens[i + 1] && tokens[i + 1].type === 'inline') {
      richText = convertInlineToken(tokens[i + 1]);
      break;
    }
    i++;
  }

  return {
    object: 'block',
    type: 'quote',
    quote: {
      rich_text: richText.length > 0 ? richText : [{ type: 'text', text: { content: '' } }],
      color: 'default'
    }
  };
}

/**
 * Convert HTML block to Notion block
 */
function convertHtmlBlock(token) {
  const html = token.content || '';

  // Check if it's a <details> tag for spoilers/toggles
  if (html.includes('<details>')) {
    // Extract summary if present
    const summaryMatch = html.match(/<summary>(.*?)<\/summary>/s);
    const summary = summaryMatch ? summaryMatch[1].trim() : 'Detalhes';

    return {
      object: 'block',
      type: 'toggle',
      toggle: {
        rich_text: [{
          type: 'text',
          text: { content: summary }
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
 * Convert inline token to Notion rich_text array
 */
function convertInlineToken(token) {
  if (!token.children || token.children.length === 0) {
    return [{
      type: 'text',
      text: { content: token.content || '' },
      annotations: {
        bold: false,
        italic: false,
        strikethrough: false,
        underline: false,
        code: false,
        color: 'default'
      }
    }];
  }

  const richText = [];

  for (const child of token.children) {
    if (child.type === 'text') {
      richText.push({
        type: 'text',
        text: { content: child.content },
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: 'default'
        }
      });
    } else if (child.type === 'strong_open') {
      // Find the text inside strong tags
      const nextChild = token.children[token.children.indexOf(child) + 1];
      if (nextChild && nextChild.type === 'text') {
        richText.push({
          type: 'text',
          text: { content: nextChild.content },
          annotations: {
            bold: true,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default'
          }
        });
      }
    } else if (child.type === 'em_open') {
      // Find the text inside em tags
      const nextChild = token.children[token.children.indexOf(child) + 1];
      if (nextChild && nextChild.type === 'text') {
        richText.push({
          type: 'text',
          text: { content: nextChild.content },
          annotations: {
            bold: false,
            italic: true,
            strikethrough: false,
            underline: false,
            code: false,
            color: 'default'
          }
        });
      }
    } else if (child.type === 'code_inline') {
      richText.push({
        type: 'text',
        text: { content: child.content },
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: true,
          color: 'default'
        }
      });
    } else if (child.type === 'link_open') {
      // Find the text inside link
      const nextChild = token.children[token.children.indexOf(child) + 1];
      if (nextChild && nextChild.type === 'text') {
        richText.push({
          type: 'text',
          text: {
            content: nextChild.content,
            link: { url: child.attrGet('href') || '' }
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
      }
    } else if (child.type === 'softbreak' || child.type === 'hardbreak') {
      richText.push({
        type: 'text',
        text: { content: '\n' }
      });
    }
  }

  // Merge consecutive text nodes with same formatting
  return mergeConsecutiveTextNodes(richText);
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
  const tokens = parseMarkdownToTokens(markdown);
  const blocks = [];

  // Calculate line positions from markdown
  const lines = markdown.split('\n');
  let currentLine = 1;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // Calculate approximate position based on token map
    const position = token.map ? {
      start: token.map[0] + 1,
      end: token.map[1] + 1
    } : null;

    const notionBlock = tokenToNotionBlock(token, tokens, i);

    if (notionBlock) {
      // Handle list nodes that return arrays
      if (Array.isArray(notionBlock)) {
        notionBlock.forEach((block, index) => {
          blocks.push({
            block,
            position,
            type: token.type,
            listIndex: index
          });
        });
      } else {
        blocks.push({
          block: notionBlock,
          position,
          type: token.type
        });
      }
    }
  }

  return blocks;
}

module.exports = {
  parseMarkdownToTokens,
  tokenToNotionBlock,
  markdownToNotionBlocks,
  convertInlineToken
};
