const fs = require('fs');
const path = require('path');

const docsDir = path.resolve(__dirname, '../docs');
const sourceLinkPrefix = 'source/xv6-riscv/';

/**
 * Recursively walks a directory and calls a callback for each file.
 * @param {string} dir - The directory to walk.
 * @param {(filePath: string) => void} callback - The callback to execute for each file.
 */
function walkDir(dir, callback) {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        // Exclude node_modules and .vitepress directories from scanning
        if (file !== 'node_modules' && file !== '.vitepress') {
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

/**
 * Processes a single file to fix dead links.
 * @param {string} filePath - The path to the file to process.
 */
function processFile(filePath) {
  if (path.extname(filePath) !== '.md') {
    return;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    const linkRegex = /\]\(([^)]+)\)/g;
    
    content = content.replace(linkRegex, (match, fullPath) => {
      if (!fullPath.startsWith(sourceLinkPrefix) || fullPath.endsWith('.md')) {
        return match;
      }

      const [pathPart, hashPart] = fullPath.split('#');
      const hash = hashPart ? `#${hashPart}` : '';

      if (pathPart && !pathPart.endsWith('/')) {
        const newLink = `](${pathPart}.md${hash})`;
        console.log(`Fixing link in ${path.basename(filePath)}: "${fullPath}" -> "${pathPart}.md${hash}"`);
        return newLink;
      }

      return match;
    });

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${path.basename(filePath)}`);
    }
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
  }
}

console.log(`Starting to fix dead links in markdown files under ${docsDir}...`);
walkDir(docsDir, processFile);
console.log('Finished fixing dead links.');