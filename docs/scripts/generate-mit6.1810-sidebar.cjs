const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..', '..');
const courseDir = path.join(projectRoot, 'docs', 'mit6.1810');

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
            items.push({
                text: entry.name,
                collapsed: true,
                items: scanDirectory(fullPath, rootDir)
            });
        } else if (entry.isFile()) {
            const relativePath = path.relative(rootDir, fullPath);
            const link = `/mit6.1810/${relativePath.replace(/\\/g, '/')}`;
            items.push({
                text: path.basename(entry.name, '.md'),
                link: link
            });
        }
    }
    return items;
}

function generate() {
    const sidebarItems = generateSidebarItems(courseDir);
    const sidebarPath = path.join(projectRoot, 'docs', '.vitepress', 'sidebar-mit6.1810.js');
    const sidebarContent = `export default ${JSON.stringify(sidebarItems, null, 2)};`;
    fs.writeFileSync(sidebarPath, sidebarContent);
    console.log(`✅ MIT 6.1810 sidebar generated at ${sidebarPath}`);
}

generate();
