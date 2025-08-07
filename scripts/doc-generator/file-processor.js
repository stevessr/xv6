const fs = require('fs');
const path = require('path');
const { sourceDir, targetDir, cKeywords } = require('./config');
const { getLanguage } = require('./function-extractor');

function processFile(filePath, highlighter, functionDefinitions) {
    const relativePath = path.relative(sourceDir, filePath);
    const targetPath = path.join(targetDir, `${relativePath}.md`);

    console.log(`[+] Processing: ${relativePath}`);

    const targetFileDir = path.dirname(targetPath);
    if (!fs.existsSync(targetFileDir)) {
        fs.mkdirSync(targetFileDir, { recursive: true });
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const language = getLanguage(filePath);
    const filename = path.basename(filePath);

    let markdownContent = `# ${filename}\n\n`;

    const fileFunctions = Array.from(functionDefinitions.values())
        .flat()
        .filter(def => def.filePath === filePath)
        .sort((a, b) => a.startLine - b.startLine);

    const lines = content.split('\n');
    let lastProcessedLine = 0;

    const initialCommentMatch = content.match(/^\s*(\/\*[\s\S]*?\*\/|\/\/.*(?:\n\/\/.*)*)/);
    if (initialCommentMatch) {
        const isMultiLine = initialCommentMatch[0].includes('\n');
        const commentText = initialCommentMatch[0]
            .split('\n')
            .map(line => {
                let l = line.trim();
                if (l.startsWith('//')) {
                    l = l.substring(2);
                } else if (l.startsWith('/*') && l.endsWith('*/')) {
                    l = l.substring(2, l.length - 2);
                } else if (l.startsWith('/*')) {
                    l = l.substring(2);
                } else if (l.endsWith('*/')) {
                    l = l.substring(0, l.length - 2);
                } else if (l.startsWith('*')) {
                    l = l.substring(1);
                }
                
                if (l.startsWith(' ')) {
                    l = l.substring(1);
                }
                return l;
            })
            .join('<br>')
            .trim();

        if (commentText) {
            if (isMultiLine) {
                markdownContent += `\n:::tip\n${commentText}\n:::\n\n`;
            }
            lastProcessedLine = initialCommentMatch[0].split('\n').length;
        }
    }

    const createHighlightedCode = (segmentContent, definedFunctionName = null) => {
        const highlighed = highlighter.codeToHtml(segmentContent, {
            lang: language,
            bg: 'transparent',
            themes: { light: 'vitesse-light', dark: 'vitesse-dark' },
            transformers: [
                {
                    code(root) {
                        const newRootChildren = [];
                        for (const line of root.children) {
                            if (line.type !== 'element' || line.tagName !== 'span') {
                                newRootChildren.push(line);
                                continue;
                            };
                            
                            let hasCodeOnLine = false;
                            for (const t of line.children) {
                                if (!(t.properties?.style?.includes('color:#A0ADA0')) && (t.children[0]?.value || '').trim() !== '') {
                                    hasCodeOnLine = true;
                                    break;
                                }
                            }

                            const newLineChildren = [];
                            for (let i = 0; i < line.children.length; i++) {
                                const token = line.children[i];
                                
                                const style = token.properties?.style || '';
                                const isComment = style.includes('color:#A0ADA0');

                                if (isComment && hasCodeOnLine) {
                                    let commentText = (token.children[0]?.value || '').trim();
                                    if (commentText.startsWith('//')) {
                                        commentText = commentText.substring(2).trim();
                                    }
                                    if (commentText.startsWith('/*')) {
                                        commentText = commentText.substring(2).trim();
                                    }
                                    if (commentText.endsWith('*/')) {
                                        commentText = commentText.substring(0, commentText.length - 2).trim();
                                    }

                                    if (commentText) {
                                        // Instead of adding a complex structure, we just add the comment span.
                                        // The JS will handle placing it correctly.
                                        newLineChildren.push({
                                            type: 'element',
                                            tagName: 'span',
                                            properties: { 
                                                class: 'floating-comment-marker',
                                                'data-comment': commentText,
                                            },
                                            children: []
                                        });
                                        // We DON'T push the original token, as we want to hide it.
                                        continue;
                                    }
                                }

                                if (token.type !== 'element' || !token.children || token.children.length === 0 || token.children[0].type !== 'text') {
                                    newLineChildren.push(token);
                                    continue;
                                };
                                
                                const textNode = token.children[0];
                                const functionName = textNode.value.trim();

                                if (!functionName || functionName === definedFunctionName || /^\d+$/.test(functionName) || cKeywords.includes(functionName)) {
                                    newLineChildren.push(token);
                                    continue;
                                };

                                const definitions = functionDefinitions.get(functionName);
                                if (definitions) {
                                    let nextTokenIndex = i + 1;
                                    let nextToken = line.children[nextTokenIndex];
                                    while(nextToken && nextToken.type === 'element' && nextToken.children[0]?.type === 'text' && nextToken.children[0].value.trim() === '') {
                                        nextTokenIndex++;
                                        nextToken = line.children[nextTokenIndex];
                                    }

                                    if (nextToken && nextToken.type === 'element' && nextToken.children[0]?.type === 'text' && nextToken.children[0].value.trim().startsWith('(')) {
                                        const isKernel = filePath.startsWith(path.join(sourceDir, 'kernel'));
                                        const context = isKernel ? 'kernel' : 'user';

                                        let def = definitions[0];
                                        if (definitions.length > 1) {
                                            const contextDefs = definitions.filter(d => d.context === context);
                                            const localDef = contextDefs.find(d => d.filePath === filePath);
                                            
                                            if (localDef) {
                                                def = localDef;
                                            } else if (contextDefs.length > 0) {
                                                def = contextDefs[0];
                                                if (contextDefs.length > 1) {
                                                     const cFileDefs = contextDefs.filter(d => d.filePath.endsWith('.c'));
                                                     if(cFileDefs.length === 1){
                                                        def = cFileDefs[0];
                                                     } else if (cFileDefs.length > 1) {
                                                        console.log(`[!] Ambiguous function call "${functionName}" in ${filePath}. Multiple definitions in .c files. Linking to ${def.filePath}.`);
                                                     }
                                                }
                                            }
                                        }
                                        
                                        newLineChildren.push({
                                            type: 'element',
                                            tagName: 'a',
                                            properties: { href: `${def.file}#${def.anchor}` },
                                            children: [token]
                                        });
                                        continue;
                                    }
                                }
                                newLineChildren.push(token);
                            }
                            line.children = newLineChildren;
                            newRootChildren.push(line);
                        }
                        root.children = newRootChildren;
                    }
                }
            ]
        });
        return highlighed;
    }

    const processSegment = (start, end) => {
        if (start >= end) return;
        const segmentContent = lines.slice(start, end).join('\n');
        if (segmentContent.trim()) {
            markdownContent += createHighlightedCode(segmentContent, null) + '\n';
        }
    };

    if (language === 'c' && fileFunctions.length > 0) {
        fileFunctions.forEach(func => {
            const commentBlockStartLine = func.docCommentStartLine > 0 ? func.docCommentStartLine - 1 : -1;
            const segmentEndLine = commentBlockStartLine !== -1 ? commentBlockStartLine : func.startLine - 1;

            processSegment(lastProcessedLine, segmentEndLine);
            
            if (func.docComment && func.docComment.trim().length > 0) {
                const isMultiLine = func.docComment.includes('\n');
                const commentText = func.docComment
                    .split('\n')
                    .map(line => {
                        let l = line.trim();
                        if (l.startsWith('//')) {
                            l = l.substring(2);
                        } else if (l.startsWith('/*') && l.endsWith('*/')) {
                            l = l.substring(2, l.length - 2);
                        } else if (l.startsWith('/*')) {
                            l = l.substring(2);
                        } else if (l.endsWith('*/')) {
                            l = l.substring(0, l.length - 2);
                        } else if (l.startsWith('*')) {
                            l = l.substring(1);
                        }
                        
                        if (l.startsWith(' ')) {
                            l = l.substring(1);
                        }
                        return l;
                    })
                    .join('<br>')
                    .trim();

                if (commentText) {
                    if (isMultiLine) {
                        markdownContent += `\n:::tip\n${commentText}\n:::\n\n`;
                    }
                }
            }

            markdownContent += `<div id="${func.anchor}"></div>\n`;
            const funcContent = lines.slice(func.startLine - 1, func.endLine).join('\n');
            markdownContent += createHighlightedCode(funcContent, func.name) + '\n';
            lastProcessedLine = func.endLine;
        });
        processSegment(lastProcessedLine, lines.length);
    } else {
        processSegment(lastProcessedLine, lines.length);
    }


    fs.writeFileSync(targetPath, markdownContent);
}

module.exports = {
    processFile,
};
