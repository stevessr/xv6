const fs = require('fs');
const path = require('path');
const { sourceDir, allowedExtensions, allowedFilenames } = require('./config');

const functionDefinitions = new Map();

function getLanguage(filePath) {
    const ext = path.extname(filePath);
    const filename = path.basename(filePath);

    if (ext === '.c' || ext === '.h') return 'c';
    if (ext === '.S') return 'asm'; // GNU Assembler Syntax
    if (ext === '.ld') return ''; // Linker Script - no highlighting for now
    if (allowedFilenames.includes(filename)) return 'makefile';
    
    return ''; // Default to no language
}

function findMatchingBrace(lines, startLineIndex) {
    let openBraces = 0;
    let firstBraceFound = false;
    for (let i = startLineIndex; i < lines.length; i++) {
        for (const char of lines[i]) {
            if (char === '{') {
                openBraces++;
                firstBraceFound = true;
            } else if (char === '}') {
                openBraces--;
            }
        }
        if (firstBraceFound && openBraces === 0) {
            return i;
        }
    }
    return -1; // Not found
}

function extractFunctionDefinitions(filePath, content) {
    const relativePath = path.relative(sourceDir, filePath);
    const language = getLanguage(filePath);
    const link = `/source/xv6-riscv/${relativePath}`;
    const lines = content.replace(/\r\n/g, '\n').split('\n');

    if (language !== 'c') {
        return;
    }

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        let definitionLineIndex = i;

        if (i > 0 &&
            lines[i - 1].match(/^\s*(?:static\s|inline\s)?(?:[\w\s\*]+)\s*$/) &&
            line.match(/^\s*\w+\s*\(/) &&
            !lines[i - 1].includes(';') && !line.includes(';')) {
            
            line = lines[i - 1].trim() + " " + line.trim();
            definitionLineIndex = i - 1;
        }

        const definitionRegex = /^(?:static\s|inline\s)*(?:[\w\s\*]+)\s+(\w+)\s*\([^)]*\)\s*/;
        const match = line.match(definitionRegex);

        let bodyStartIndex = -1;
        if(match) {
            if (lines[definitionLineIndex].includes('{')) {
                bodyStartIndex = definitionLineIndex;
            } else if (definitionLineIndex + 1 < lines.length && lines[definitionLineIndex + 1].trim() === '{') {
                bodyStartIndex = definitionLineIndex + 1;
            }
        }

        if (match && bodyStartIndex !== -1 && !line.includes(';')) {
            const functionName = match[1];
            const endLineIndex = findMatchingBrace(lines, bodyStartIndex);
            
            if (endLineIndex !== -1) {
                const docCommentLines = [];
                let docCommentStartLine = -1;
                
                let j = definitionLineIndex - 1;
                while (j >= 0 && lines[j].trim() === '') {
                    j--;
                }

                while (j >= 0) {
                    const trimmedLine = lines[j].trim();
                    const isComment = trimmedLine.startsWith('//') || trimmedLine.endsWith('*/') || trimmedLine.startsWith('/*') || (trimmedLine.startsWith('*') && !trimmedLine.startsWith('*/'));
                    
                    if (isComment) {
                        docCommentLines.unshift(lines[j]);
                        docCommentStartLine = j;
                    } else {
                        break;
                    }
                    j--;
                }

                const docComment = docCommentLines.join('\n');
                const anchor = `${functionName}-${relativePath.replace(/[\/\.]/g, '-')}`;
                
                const definition = {
                    file: link,
                    filePath: filePath,
                    startLine: definitionLineIndex + 1,
                    endLine: endLineIndex + 1,
                    name: functionName,
                    anchor: anchor,
                    docComment: docComment,
                    docCommentStartLine: docComment ? docCommentStartLine + 1 : -1,
                    context: filePath.startsWith(path.join(sourceDir, 'kernel')) ? 'kernel' : 'user',
                };

                if (!functionDefinitions.has(functionName)) {
                    functionDefinitions.set(functionName, []);
                }
                const definitions = functionDefinitions.get(functionName);
                if (filePath.endsWith('.c')) {
                    definitions.unshift(definition);
                } else {
                    definitions.push(definition);
                }
                i = endLineIndex;
            }
        }
    }
}

async function buildFunctionMap(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name !== '.git') {
                await buildFunctionMap(fullPath);
            }
        } else if (entry.isFile()) {
            const ext = path.extname(entry.name);
            if (allowedExtensions.includes(ext) || allowedFilenames.includes(entry.name)) {
                const content = fs.readFileSync(fullPath, 'utf-8');
                extractFunctionDefinitions(fullPath, content);
            }
        }
    }
}

async function run() {
    console.log('Building function definition map...');
    await buildFunctionMap(sourceDir);
    console.log(`✅ Found ${functionDefinitions.size} function definitions.`);
    return functionDefinitions;
}

module.exports = {
    run,
    getLanguage,
};
