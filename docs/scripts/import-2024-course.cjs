const fs = require('fs-extra');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..', '..');
const courseSourceDir = path.join(projectRoot, '2024');
const courseTargetDir = path.join(projectRoot, 'docs', 'mit6.1810');
const publicDir = path.join(projectRoot, 'docs', 'public', 'assets', 'mit6.1810');

async function importCourse() {
    console.log('Starting course import...');
    try {
        await fs.ensureDir(courseTargetDir);
        await fs.ensureDir(publicDir);
        await traverseDir(courseSourceDir, courseTargetDir);
        console.log('Course import completed successfully.');
    } catch (error) {
        console.error('Error during course import:', error);
    }
}

async function traverseDir(source, target) {
    const entries = await fs.readdir(source, { withFileTypes: true });
    for (const entry of entries) {
        const sourcePath = path.join(source, entry.name);
        const targetPath = path.join(target, entry.name.replace(/\.html$/, '.md'));

        if (entry.isDirectory()) {
            await fs.ensureDir(targetPath);
            await traverseDir(sourcePath, targetPath);
        } else if (entry.isFile()) {
            await processFile(sourcePath, targetPath);
        }
    }
}

async function processFile(sourcePath, targetPath) {
    const ext = path.extname(sourcePath);
    if (ext === '.pdf') {
        const publicPath = path.join(publicDir, path.basename(sourcePath));
        await fs.copy(sourcePath, publicPath);
        const relativePath = path.relative(path.dirname(targetPath), publicPath).replace(/\\/g, '/');
        const markdownContent = `---
title: ${path.basename(sourcePath, '.pdf')}
---

# ${path.basename(sourcePath, '.pdf')}

<iframe src="${relativePath}" width="100%" height="800px"></iframe>
`;
        await fs.writeFile(targetPath, markdownContent);
    } else if (['.txt', '.c'].includes(ext)) {
        const content = await fs.readFile(sourcePath, 'utf8');
        const markdownContent = `---
title: ${path.basename(sourcePath)}
---

\`\`\`${ext === '.c' ? 'c' : 'text'}
${content}
\`\`\`
`;
        await fs.writeFile(targetPath, markdownContent);
    } else if (ext === '.html') {
        const content = await fs.readFile(sourcePath, 'utf8');
        const markdownContent = `---
title: ${path.basename(sourcePath, '.html')}
---

${content}
`;
        await fs.writeFile(targetPath, markdownContent);
    } else {
        console.log(`Skipping unsupported file type: ${sourcePath}`);
    }
}

importCourse();
