const fs = require('fs');
const path = require('path');

const docsDir = path.resolve(__dirname, '..');

function walkDir(dir, callback) {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        if (file !== 'node_modules' && file !== '.vitepress' && !file.startsWith('.')) {
          walkDir(filePath, callback);
        }
      } else {
        callback(filePath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }
}

function processFile(filePath) {
  if (path.extname(filePath) !== '.md') {
    return;
  }

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (readError) {
    console.error(`Error reading file ${filePath}:`, readError);
    return;
  }
  
  const originalContent = content;

  // Matches markdown links like [text](url), but ignores http, mailto, and anchor links.
  const linkRegex = /\[([^\]]*)\]\((?!https?:\/\/|mailto:|#)([^)]+)\)/g;

  content = content.replace(linkRegex, (match, text, url) => {
    const [linkPath, hash] = url.split('#');
    const fragment = hash ? `#${hash}` : '';

    // Ignore image files and other assets
    if (/\.(png|jpg|jpeg|gif|svg)$/i.test(linkPath)) {
        return match;
    }

    // Handle source code links, which are generated with a .md extension
    if (linkPath.startsWith('/source/xv6-riscv/')) {
        let finalLink = linkPath;
        if (!finalLink.endsWith('.md')) {
            finalLink += '.md';
        }
        finalLink += fragment;

        const newLink = `[${text}](${finalLink})`;
        if (match !== newLink) {
            // console.log(`Fixing source link in ${path.relative(docsDir, filePath)}: "${url}" -> "${finalLink}"`);
        }
        return newLink;
    }
    
    // Strip any existing .md extensions for other links
    let cleanLinkPath = linkPath.replace(/(\.md)+$/, '');

    let absoluteLinkPath;
    if (cleanLinkPath.startsWith('/')) {
        absoluteLinkPath = path.join(docsDir, cleanLinkPath);
    } else {
        const currentDir = path.dirname(filePath);
        absoluteLinkPath = path.resolve(currentDir, cleanLinkPath);
    }

    let vitepressPath = '/' + path.relative(docsDir, absoluteLinkPath);
    vitepressPath = vitepressPath.replace(/\\/g, '/');

    // Ensure it ends with .md for non-source links
    let finalLink = `${vitepressPath}.md${fragment}`;
    
    const newLink = `[${text}](${finalLink})`;

    if (match !== newLink) {
        // console.log(`Fixing link in ${path.relative(docsDir, filePath)}: "${url}" -> "${finalLink}"`);
    }
    
    return newLink;
  });

  if (content !== originalContent) {
    try {
      fs.writeFileSync(filePath, content, 'utf8');
    } catch (writeError) {
      console.error(`Error writing to file ${filePath}:`, writeError);
    }
  }
}

console.log(`Starting to fix dead links in markdown files under ${docsDir}...`);
walkDir(docsDir, processFile);
console.log('Finished fixing dead links.');
