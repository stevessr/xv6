const markdownit = require('markdown-it')();

function escapeHtml(text) {
    if (typeof text !== 'string') {
        return '';
    }
    return text
         .replace(/&/g, '&amp;')
         .replace(/</g, '&lt;')
         .replace(/>/g, '&gt;')
         .replace(/"/g, '&quot;')
         .replace(/'/g, '&#039;')
         .replace(/\n/g, '&#10;');
}

function renderMarkdown(text) {
    const cleaned = text
        .replace(/^\s*\/\*\*?/, '') 
        .replace(/\s*\*\/$/, '')     
        .split('\n')
        .map(line => line.replace(/^\s*\*\s?/, ''))
        .map(line => line.replace(/^\s*\/\/\s?/, ''))
        .join('\n')
        .trim();
    
    if (!cleaned) {
        return '';
    }
    
    return markdownit.render(cleaned);
}

module.exports = {
    escapeHtml,
    renderMarkdown,
};