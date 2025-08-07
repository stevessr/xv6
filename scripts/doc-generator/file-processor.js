const fs = require('fs');
const path = require('path');
const { sourceDir, targetDir } = require('./config');
const { getLanguage } = require('./function-extractor');
const { escapeHtml, renderMarkdown } = require('./utils');

function createTransformer(functionDefinitions, currentFilePath) {
    return {
        name: 'xv6-docs-transformer',
        preprocess(code) {
            let lineCounter = 0;
            const lines = code.split('\n');
            const newLines = [];

            for (const line of lines) {
                lineCounter++;
                for (const [funcName, defs] of functionDefinitions.entries()) {
                    const def = defs.find(d => d.filePath === currentFilePath && d.startLine === lineCounter);
                    if (def) {
                        newLines.push(`<div id="${def.anchor}"></div>`);
                    }
                }
                newLines.push(line);
            }
            return newLines.join('\n');
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
                        node.properties.href = `${def.file}.md#${def.anchor}`;
                        node.tagName = 'a';
                    }
                }
            }
            
            if (node.properties.class?.includes('comment')) {
                 node.properties.class = (node.properties.class || '') + ' comment-token';
            }

            return node;
        },
        postprocess(html) {
            const lines = html.split('\n');
            const newLines = [];
            let lineNum = 1;
            
            for (const line of lines) {
                if (line.includes('class="line"')) {
                    let modifiedLine = line;
                    let docCommentContent = '';

                    for (const [funcName, defs] of functionDefinitions.entries()) {
                        const def = defs.find(d => d.filePath === currentFilePath && d.docCommentStartLine === lineNum);
                        if (def && def.docComment) {
                           docCommentContent += def.docComment;
                        }
                    }

                    if (docCommentContent) {
                        const renderedComment = renderMarkdown(docCommentContent);
                        modifiedLine = line.replace('class="line"', `class="line with-tooltip" data-comment="${escapeHtml(renderedComment)}"`);
                    }
                    newLines.push(modifiedLine);
                    lineNum++;
                } else {
                    newLines.push(line);
                }
            }
            return newLines.join('\n');
        }
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

    const content = fs.readFileSync(filePath, 'utf-8');
    const filename = path.basename(filePath);

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
