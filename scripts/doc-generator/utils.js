const markdownit = require('markdown-it')();

function escapeHtml(text) {
    return text
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function renderMarkdown(text) {
    // Remove comment markers like `//`, `/*`, `*/`, and `*` from the beginning of each line
    const cleanedText = text.split('\n').map(line => {
        return line.trim().replace(/^(?:\/\/\s?|\/\*\*?\s?|\*\s?\/?|\*?\*\/)/, '');
    }).join('\n');
    
    return markdownit.render(cleanedText);
}

module.exports = {
    escapeHtml,
    renderMarkdown,
};
