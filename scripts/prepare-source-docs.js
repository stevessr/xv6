const fs = require('fs');
const path = require('path');

// The script is in /scripts, so we go up one level to the project root.
const projectRoot = path.resolve(__dirname, '..');

const sourceDir = path.join(projectRoot, 'xv6-riscv');
const targetDir = path.join(projectRoot, 'docs', 'source', 'xv6-riscv');

const allowedExtensions = ['.c', '.h', '.S', '.ld'];
const allowedFilenames = ['Makefile'];

/**
 * Determines the programming language for syntax highlighting in Markdown.
 * @param {string} filePath - The path to the file.
 * @returns {string} The language identifier for Markdown.
 */
function getLanguage(filePath) {
    const ext = path.extname(filePath);
    const filename = path.basename(filePath);

    if (ext === '.c' || ext === '.h') return 'c';
    if (ext === '.S') return 'gas'; // GNU Assembler Syntax
    if (ext === '.ld') return 'ld'; // Linker Script
    if (allowedFilenames.includes(filename)) return 'makefile';
    
    return ''; // Default to no language
}

/**
 * Processes a single source file: reads its content, creates a corresponding
 * directory structure in the target, and writes the content into a Markdown file.
 * @param {string} filePath - The full path to the source file.
 */
function processFile(filePath) {
    const relativePath = path.relative(sourceDir, filePath);
    const targetPath = path.join(targetDir, `${relativePath}.md`);

    console.log(`[+] Processing: ${relativePath}`);

    // Ensure the target directory exists.
    const targetFileDir = path.dirname(targetPath);
    if (!fs.existsSync(targetFileDir)) {
        fs.mkdirSync(targetFileDir, { recursive: true });
    }

    // Read the source file content.
    const content = fs.readFileSync(filePath, 'utf-8');

    // Determine the language for the Markdown code block.
    const language = getLanguage(filePath);
    const filename = path.basename(filePath);

    // Create the Markdown content.
    const markdownContent = `# ${filename}\n\n\`\`\`${language}\n${content}\n\`\`\`\n`;

    // Write the content to the new Markdown file.
    fs.writeFileSync(targetPath, markdownContent);
}

/**
 * Recursively traverses a directory and processes files that match the criteria.
 * @param {string} dir - The directory to traverse.
 */
function traverseDir(dir) {
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (entry.name === '.git') {
                    continue;
                }
                traverseDir(fullPath);
            } else if (entry.isFile()) {
                const ext = path.extname(entry.name);
                if (allowedExtensions.includes(ext) || allowedFilenames.includes(entry.name)) {
                    processFile(fullPath);
                }
            }
        }
    } catch (error) {
        console.error(`Error reading directory ${dir}: ${error.message}`);
    }
}

// Main execution
try {
    console.log('Starting source documentation generation...');
    console.log(`Source directory: ${sourceDir}`);
    console.log(`Target directory: ${targetDir}`);

    if (!fs.existsSync(sourceDir)) {
        throw new Error(`Source directory not found: ${sourceDir}`);
    }

    // Clean up the target directory before generation
    if (fs.existsSync(targetDir)) {
        console.log('Cleaning up target directory...');
        fs.rmSync(targetDir, { recursive: true, force: true });
    }
    fs.mkdirSync(targetDir, { recursive: true });

    // Generate and write the sidebar
    // Generate and write the sidebar
    const sidebarItems = generateSidebarItems(sourceDir);
    const sidebarPath = path.join(projectRoot, 'docs', '.vitepress', 'sidebar-source.js');
    const sidebarContent = `export default ${JSON.stringify(sidebarItems, null, 2)};`;
    fs.writeFileSync(sidebarPath, sidebarContent);
    console.log(`✅ Source sidebar generated at ${sidebarPath}`);

    // Generate and write the index page with the full project tree structure
    const treeOutput = generateTreeWithLinks(sourceDir);
    const indexContent = `# xv6-riscv 源码\n\n## 项目目录结构\n\n<pre><code>${treeOutput}</code></pre>\n`;
    fs.writeFileSync(path.join(targetDir, 'index.md'), indexContent);
    console.log('✅ index.md with full project tree generated.');

    traverseDir(sourceDir);

    console.log('✅ Source documentation generation complete.');
} catch (error) {
    console.error(`❌ An error occurred: ${error.message}`);
    process.exit(1);
}

/**
 * Generates the items for a VitePress sidebar from the directory structure.
 * @param {string} dir - The directory to scan.
 * @returns {object[]} An array of sidebar items.
 */
function generateSidebarItems(dir) {
    // We pass the source directory and itself as the root to build the relative paths correctly.
    return scanDirectory(dir, dir);
}

/**
 * Recursively scans a directory to build a sidebar structure.
 * @param {string} dir - The current directory to scan.
 * @param {string} rootDir - The root directory of the source code.
 * @returns {object[]} An array of sidebar items.
 */
function scanDirectory(dir, rootDir) {
    const items = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    // Sort entries to have directories first, then files
    entries.sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
    });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            items.push({
                text: entry.name,
                collapsed: true,
                items: scanDirectory(fullPath, rootDir)
            });
        } else if (entry.isFile()) {
            const ext = path.extname(entry.name);
            if (allowedExtensions.includes(ext) || allowedFilenames.includes(entry.name)) {
                const relativePath = path.relative(rootDir, fullPath);
                const link = `/source/xv6-riscv/${relativePath}`;
                items.push({
                    text: entry.name,
                    link: link
                });
            }
        }
    }
    return items;
}

/**
 * Generates a tree-like Markdown string representing the directory structure with links.
 * @param {string} dir - The directory to start from.
 * @param {string} rootDir - The absolute root of the source, for link generation.
 * @param {string} prefix - The prefix for the current level.
 * @returns {string} The string representation of the directory tree in Markdown.
 */
function generateTreeWithLinks(dir, rootDir = dir, prefix = '') {
    let result = '';
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    // Sort entries to have directories first, then files
    entries.sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
    });

    entries.forEach((entry, index) => {
        const fullPath = path.join(dir, entry.name);
        const isLast = index === entries.length - 1;
        const entryPrefix = prefix + (isLast ? '└─ ' : '├─ ');

        if (entry.isDirectory()) {
            if (entry.name === '.git') return; // Skip .git directory
            result += `${entryPrefix}<strong>${entry.name}</strong>\n`;
            const newPrefix = prefix + (isLast ? '   ' : '│  ');
            result += generateTreeWithLinks(fullPath, rootDir, newPrefix);
        } else if (entry.isFile()) {
            const ext = path.extname(entry.name);
            if (allowedExtensions.includes(ext) || allowedFilenames.includes(entry.name)) {
                const relativePath = path.relative(rootDir, fullPath);
                const link = `/source/xv6-riscv/${relativePath}`;
                result += `${entryPrefix}<a href="${link}">${entry.name}</a>\n`;
            }
        }
    });

    return result;
}