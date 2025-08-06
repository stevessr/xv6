const fs = require('fs');
const path = require('path');

const docsDir = path.resolve(__dirname, '../docs');

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

    // Strip any existing .md extensions, which seem to be the source of the problem.
    let cleanLinkPath = linkPath.replace(/(\.md)+$/, '');

    let absoluteLinkPath;
    // In vitepress, links starting with / are relative to the docs root.
    if (cleanLinkPath.startsWith('/')) {
        absoluteLinkPath = path.join(docsDir, cleanLinkPath);
    } else {
        // Link is relative to the current file
        const currentDir = path.dirname(filePath);
        absoluteLinkPath = path.resolve(currentDir, cleanLinkPath);
    }

    // Make the link a root-relative path for vitepress
    let vitepressPath = '/' + path.relative(docsDir, absoluteLinkPath);
    vitepressPath = vitepressPath.replace(/\\/g, '/'); // for Windows paths

    // Now, ensure it ends with .md
    let finalLink = `${vitepressPath}.md${fragment}`;
    
    const newLink = `[${text}](${finalLink})`;

    if (match !== newLink) {
        console.log(`Fixing link in ${path.relative(docsDir, filePath)}: "${url}" -> "${finalLink}"`);
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
