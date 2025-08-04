const fs = require('fs');
const path = require('path');

const C_SOURCE_DIRS = ['xv6-riscv/kernel/', 'xv6-riscv/user/'];
const DOCS_DIR = 'docs/';
const FUNCTION_REGEX = /^(?:(?:\w+\s+)+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*(?:;|\{)/gm;
const FUNCTION_CALL_REGEX = /`([a-zA-Z_][a-zA-Z0-9_]*)`/g;

/**
 * Recursively finds all files with a given extension in a directory.
 * @param {string} startPath - The directory to search.
 * @param {string} filter - The file extension to look for (e.g., '.c').
 * @returns {string[]} A list of file paths.
 */
function fromDir(startPath, filter) {
    if (!fs.existsSync(startPath)) {
        console.log("Directory not found: ", startPath);
        return [];
    }

    const files = fs.readdirSync(startPath);
    let result = [];
    for (let i = 0; i < files.length; i++) {
        const filename = path.join(startPath, files[i]);
        const stat = fs.lstatSync(filename);
        if (stat.isDirectory()) {
            result = result.concat(fromDir(filename, filter));
        } else if (filename.endsWith(filter)) {
            result.push(filename);
        }
    }
    return result;
}


/**
 * Parses C source code to find function definitions.
 * @param {string} filePath - The path to the C file.
 * @returns {string[]} A list of function names found in the file.
 */
function extractFunctionsFromFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const functions = new Set();
    let match;
    while ((match = FUNCTION_REGEX.exec(content)) !== null) {
        functions.add(match[1]);
    }
    return Array.from(functions);
}

/**
 * Builds an index of function names to their source file paths.
 * @returns {Object.<string, string>} The function index.
 */
function buildFunctionIndex() {
    const index = Object.create(null);
    const sourceFiles = C_SOURCE_DIRS.flatMap(dir => {
        const cFiles = fromDir(dir, '.c');
        const hFiles = fromDir(dir, '.h');
        return [...cFiles, ...hFiles];
    });


    for (const file of sourceFiles) {
        const functions = extractFunctionsFromFile(file);
        for (const func of functions) {
            if (index[func]) {
                // console.warn(`Warning: Duplicate function '${func}' found in ${file} and ${index[func]}`);
            }
            index[func] = file;
        }
    }
    return index;
}

/**
 * Updates a single Markdown file by adding links to function calls.
 * @param {string} mdFile - The path to the Markdown file.
 * @param {Object.<string, string>} funcIndex - The function index.
 */
function updateMarkdownFile(mdFile, funcIndex) {
    let content = fs.readFileSync(mdFile, 'utf8');
    let changed = false;
    let linkCount = 0;

    const parts = content.split('```');
    const newParts = parts.map((part, index) => {
        if (index % 2 === 0) { // Only process parts outside of code blocks
            return part.replace(FUNCTION_CALL_REGEX, (match, funcName) => {
                const sourcePath = funcIndex[funcName];
                if (sourcePath) {
                    const relativePath = path.relative(path.dirname(mdFile), sourcePath);
                    changed = true;
                    linkCount++;
                    return `[\`${funcName}\`](${relativePath})`;
                }
                return match;
            });
        }
        return part;
    });

    if (changed) {
        const newContent = newParts.join('\n```\n');
        fs.writeFileSync(mdFile, newContent, 'utf8');
        console.log(`Updated ${mdFile} with ${linkCount} links.`);
    }
    return linkCount;
}

/**
 * Main function to run the script.
 */
function main() {
    console.log('Building function index...');
    const funcIndex = buildFunctionIndex();
    console.log(`Index built with ${Object.keys(funcIndex).length} functions.`);

    console.log('\nUpdating Markdown files...');
    const mdFiles = fromDir(DOCS_DIR, '.md');
    let totalLinks = 0;

    for (const file of mdFiles) {
        totalLinks += updateMarkdownFile(file, funcIndex);
    }

    console.log(`\nFinished. Total links added: ${totalLinks}.`);
}

main();