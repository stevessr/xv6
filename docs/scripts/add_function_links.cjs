const fs = require('fs');
const path = require('path');

const DOCS_DIR = '.';
const FUNCTION_MAP_PATH = path.join(__dirname, 'doc-generator/function-map.json');

/**
 * Recursively finds all files with a given extension in a directory.
 * @param {string} startPath - The directory to search.
 * @param {string} filter - The file extension to look for (e.g., '.md').
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
 * Updates a single Markdown file by adding links to function calls.
 * @param {string} mdFile - The path to the Markdown file.
 * @param {Object} funcIndex - The function index loaded from function-map.json.
 */
function updateMarkdownFile(mdFile, funcIndex) {
    let content = fs.readFileSync(mdFile, 'utf8');
    let changed = false;
    let linkCount = 0;

    // Split by code blocks, keeping the delimiters
    const parts = content.split(/(```[\s\S]*?```)/);
    const newParts = parts.map((part, index) => {
        // Only process parts outside of code blocks
        if (index % 2 === 0) {
            let newPart = part;
            for (const funcName in funcIndex) {
                const definitions = funcIndex[funcName];
                if (definitions && definitions.length > 0) {
                    // Use the first definition which has priority
                    const def = definitions[0];
                    // Construct the link using the 'file' field directly
                    const linkUrl = `${def.file}#${def.anchor}`;

                    // Regex to find `funcName` or `funcName()` not already in a markdown link.
                    // This avoids replacing text in [already linked `funcName`](...)
                    const regex = new RegExp(`(?<!\\[)\`(${funcName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})(\\(\\))?\`(?!\\]\\()`, 'g');
                    
                    let match;
                    let lastIndex = 0;
                    const segments = [];
                    
                    while ((match = regex.exec(newPart)) !== null) {
                        segments.push(newPart.slice(lastIndex, match.index));
                        const link = `[\`${match[1]}${match[2] || ''}\`](${linkUrl})`;
                        segments.push(link);
                        lastIndex = match.index + match[0].length;
                        changed = true;
                        linkCount++;
                    }
                    segments.push(newPart.slice(lastIndex));
                    newPart = segments.join('');
                }
            }
            return newPart;
        }
        return part;
    });

    if (changed) {
        const newContent = newParts.join('');
        fs.writeFileSync(mdFile, newContent, 'utf8');
        console.log(`Updated ${mdFile} with ${linkCount} links.`);
    }
    return linkCount;
}

/**
 * Main function to run the script.
 */
function main() {
    console.log('Loading function index from a central map...');
    if (!fs.existsSync(FUNCTION_MAP_PATH)) {
        console.error(`Error: Function map not found at ${FUNCTION_MAP_PATH}`);
        console.error("Please run the 'docs/scripts/doc-generator/main.cjs' script first to generate the map.");
        process.exit(1);
    }
    const funcIndex = JSON.parse(fs.readFileSync(FUNCTION_MAP_PATH, 'utf8'));
    console.log(`Index loaded with ${Object.keys(funcIndex).length} functions.`);

    console.log('\nUpdating Markdown files...');
    const mdFiles = fromDir(DOCS_DIR, '.md');
    let totalLinks = 0;

    for (const file of mdFiles) {
        totalLinks += updateMarkdownFile(file, funcIndex);
    }

    console.log(`\nFinished. Total links added: ${totalLinks}.`);
}

main();