const fs = require('fs');
const path = require('path');
const { projectRoot, sourceDir, targetDir, allowedExtensions, allowedFilenames, ignoredDirs } = require('./config.cjs');

function generateSidebarItems(dir) {
    return scanDirectory(dir, dir);
}

function scanDirectory(dir, rootDir) {
    const items = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    entries.sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
    });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (ignoredDirs.includes(entry.name)) continue;
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

function generateTreeWithLinks(dir, rootDir = dir, prefix = '') {
    let result = '';
    const entries = fs.readdirSync(dir, { withFileTypes: true });

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
            if (ignoredDirs.includes(entry.name)) return;
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

function generate() {
    const sidebarItems = generateSidebarItems(sourceDir);
    const sidebarPath = path.join(projectRoot, 'docs', '.vitepress', 'sidebar-source.js');
    const sidebarContent = `export default ${JSON.stringify(sidebarItems, null, 2)};`;
    fs.writeFileSync(sidebarPath, sidebarContent);
    console.log(`✅ Source sidebar generated at ${sidebarPath}`);

    const treeOutput = generateTreeWithLinks(sourceDir);
    const indexContent = `# xv6-riscv 源码\n\n## 项目目录结构\n\n<pre><code>${treeOutput}</code></pre>\n`;
    fs.writeFileSync(path.join(targetDir, 'index.md'), indexContent);
    console.log('✅ index.md with full project tree generated.');
}

module.exports = {
    generate,
};
