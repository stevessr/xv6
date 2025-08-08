const path = require('path');

// The script is in /scripts, so we go up one level to the project root.
const projectRoot = path.resolve(__dirname, '..', '..', '..');

const sourceDir = path.join(projectRoot, 'xv6-riscv');
const targetDir = path.join(projectRoot, 'docs', 'source', 'xv6-riscv');

const allowedExtensions = ['.c', '.h', '.S', '.ld'];
const allowedFilenames = ['Makefile'];

const cKeywords = [
    'auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do',
    'double', 'else', 'enum', 'extern', 'float', 'for', 'goto', 'if',
    'int', 'long', 'register', 'return', 'short', 'signed', 'sizeof', 'static',
    'struct', 'switch', 'typedef', 'union', 'unsigned', 'void', 'volatile', 'while'
];

module.exports = {
    projectRoot,
    sourceDir,
    targetDir,
    allowedExtensions,
    allowedFilenames,
    cKeywords,
};
