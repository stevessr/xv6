const fs = require('fs');
const path = require('path');
const { sourceDir, targetDir } = require('./config');
const { getLanguage } = require('./function-extractor');
const { escapeHtml, renderMarkdown } = require('./utils');

/**
 * Transforms C-style comments into VitePress tip containers.
 * @param {string} content - The source code.
 * @returns {string} - The transformed code.
 */
function transformComments(content) {
    // Process multi-line comments: /* ... */
    content = content.replace(/\/\*([\s\S]*?)\*\//g, (match, commentBody) => {
        const tipContent = commentBody.replace(/^\s*\**/gm, '').trim();
        return `:::tip\n${tipContent}\n:::`;
    });

    // Process single-line comments: // ...
    content = content.replace(/\/\/(.*)/g, (match, commentBody) => {
        return `:::tip\n${commentBody.trim()}\n:::`;
    });

    return content;
}


function createTransformer(functionDefinitions, currentFilePath) {
    let lineNum = 0;

    return {
        name: 'xv6-docs-transformer',
        line(node) {
            lineNum++; // 1-based line number

            let hasDocComment = false;

            for (const [, defs] of functionDefinitions.entries()) {
                const anchorDef = defs.find(d => d.filePath === currentFilePath && d.startLine === lineNum);
                if (anchorDef) {
                    node.properties.id = anchorDef.anchor;
                }

                const commentDef = defs.find(d => d.filePath === currentFilePath && d.docCommentStartLine === lineNum);
                if (commentDef && commentDef.docComment) {
                    hasDocComment = true;
                    const renderedComment = renderMarkdown(commentDef.docComment);
                    const finalComment = escapeHtml(renderedComment);
                    node.properties.class = `${node.properties.class || ''} with-tooltip`.trim();
                    node.properties['data-comment'] = finalComment;
                }
            }

            if (hasDocComment) {
                // Remove comment tokens from this line, so they only appear in the tooltip
                node.children = node.children.filter(child => {
                    if (child.type === 'element' && child.tagName === 'span') {
                        // A token is a comment if shiki gave it the 'comment' class.
                        return !child.properties.class?.includes('comment');
                    }
                    return true;
                });
            }
        },
        span(node) {
            const tokenContent = node.children[0]?.value?.trim();
            if (!tokenContent) return;

            if (functionDefinitions.has(tokenContent)) {
                // Heuristic: If shiki gives a token a specific color via a style attribute,
                // it's likely a meaningful token like a function call, not a plain type
                // that might have been mistakenly added to functionDefinitions.
                if (node.properties.style) {
                    const defs = functionDefinitions.get(tokenContent);
                    const def = defs[0];
                    
                    if (def.filePath !== currentFilePath) {
                        node.properties.class = (node.properties.class || '') + ' function-call';
                        node.properties['data-function-name'] = tokenContent;
                        node.properties.href = `${def.file}#${def.anchor}`;
                        node.tagName = 'a';
                    }
                }
            }
            
            if (node.properties.class?.includes('comment')) {
                 node.properties.class = (node.properties.class || '') + ' comment-token';
            }

            return node;
        },
    };
}

async function processFile(filePath, highlighter, functionDefinitions) {
    const relativePath = path.relative(sourceDir, filePath);
    const targetPath = path.join(targetDir, `${relativePath}.md`);
    const language = getLanguage(filePath);

    console.log(`[+] Processing: ${relativePath}`);

    const targetFileDir = path.dirname(targetPath);
    if (!fs.existsSync(targetFileDir)) {
        fs.mkdirSync(targetFileDir, { recursive: true });
    }

    let content = fs.readFileSync(filePath, 'utf-8');
    const filename = path.basename(filePath);

    if (language === 'c' || language === 'asm') {
        content = transformComments(content);
    }

    const transformer = createTransformer(functionDefinitions, filePath);
    
    let highlightedCode;
    try {
        highlightedCode = await highlighter.codeToHtml(content, {
            lang: language,
            themes: { light: 'vitesse-light', dark: 'vitesse-dark' },
            transformers: [transformer]
        });
    } catch (e) {
        console.error(`[Error] Shiki failed to highlight ${filePath}: ${e.message}`);
        highlightedCode = `<pre><code>${escapeHtml(content)}</code></pre>`; // Fallback
    }
    
    const finalOutput = `<h1>${filename}</h1>\n\n${highlightedCode}`;
    fs.writeFileSync(targetPath, finalOutput);
}

module.exports = { processFile };
