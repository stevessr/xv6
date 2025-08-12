const fs = require("fs");
const path = require("path");
const { sourceDir, targetDir } = require("./config.cjs");
const { getLanguage } = require("./function-extractor.cjs");
const { escapeHtml, renderMarkdown } = require("./utils.cjs");

/**
 * Cleans the text extracted from a multi-line comment block.
 * It removes common leading asterisks (*) and extra whitespace from each line.
 * @param {string} commentText - The raw text from a multi-line comment.
 * @returns {string} The cleaned comment text.
 */
function clean_multiline_comment(comment_text) {
  const lines = comment_text.split("\n");
  const cleaned_lines = [];

  for (const line of lines) {
    const trimmed_line = line.trim();
    if (trimmed_line.startsWith("*")) {
      const cleaned_line = trimmed_line.substring(1).trimStart();
      cleaned_lines.push(cleaned_line);
    } else {
      cleaned_lines.push(trimmed_line);
    }
  }

  const meaningful_lines = cleaned_lines.filter((line) => line.length > 0);
  const result = meaningful_lines.join("\n");

  // Escape HTML characters in the comment text to prevent Vue parsing issues
  return result
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * 处理代码内容，分离行内注释和块注释
 * @param {string} content - 原始代码内容
 * @returns {object} - 包含处理后的代码、行注释映射和块注释的对象
 */
function processInlineComments(content) {
  const lines = content.split('\n');
  const processedLines = [];
  const lineComments = new Map(); // 使用处理后的行号作为key
  const blockComments = [];
  
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    
    // 检查是否是纯注释行（以 // 开头，前面只有空白字符）
    const pureCommentMatch = line.match(/^\s*\/\/(.*)$/);
    if (pureCommentMatch) {
      // 这是一个纯注释行，收集连续的注释行形成块
      const commentBlock = [];
      let j = i;
      
      while (j < lines.length) {
        const currentLine = lines[j];
        const commentMatch = currentLine.match(/^\s*\/\/(.*)$/);
        if (commentMatch) {
          const commentText = commentMatch[1].trim();
          if (commentText) {
            commentBlock.push(commentText);
          }
          j++;
        } else {
          break;
        }
      }
      
      // 将注释块转换为VitePress tip
      if (commentBlock.length > 0) {
        const commentText = commentBlock.join('\n');
        blockComments.push({
          startLine: processedLines.length,
          content: commentText
        });
      }
      
      // 跳过这些注释行，不保留它们
      i = j;
      continue;
    }
    
    // 检查同行注释
    const inlineCommentMatch = line.match(/^(.+?)\/\/(.*)$/);
    if (inlineCommentMatch) {
      // 同行注释
      const codePart = inlineCommentMatch[1].trimEnd();
      const commentPart = inlineCommentMatch[2].trim();
      
      // 先记录即将添加的行的索引
      const currentLineIndex = processedLines.length;
      processedLines.push(codePart);
      if (commentPart) {
        // 使用正确的行号索引
        lineComments.set(currentLineIndex, commentPart);
      }
    } else {
      // 非注释行，保持原样
      processedLines.push(line);
    }
    
    i++;
  }

  return {
    processedContent: processedLines.join('\n'),
    lineComments: lineComments,
    blockComments: blockComments
  };
}


function createTransformer(functionDefinitions, currentFilePath, lineComments = new Map(), processedContent = "") {
  let lineNum = 0;
  const commentPlaceholders = new Map();
  let placeholderIndex = 0;

  // C语言保留字列表
  const cKeywords = new Set([
    "0",
    "auto",
    "break",
    "case",
    "char",
    "const",
    "continue",
    "default",
    "do",
    "double",
    "else",
    "enum",
    "extern",
    "float",
    "for",
    "goto",
    "if",
    "inline",
    "int",
    "long",
    "register",
    "restrict",
    "return",
    "short",
    "signed",
    "sizeof",
    "static",
    "struct",
    "switch",
    "typedef",
    "union",
    "unsigned",
    "void",
    "volatile",
    "while",
    "_Bool",
    "_Complex",
    "_Imaginary",
    // 常见的类型和修饰符
    "uint",
    "uint8",
    "uint16",
    "uint32",
    "uint64",
    "int8",
    "int16",
    "int32",
    "int64",
    "size_t",
    "ssize_t",
    "ptrdiff_t",
    "uintptr_t",
    "intptr_t",
    // 注释符号和其他不应该作为函数的符号
    "//",
    "/*",
    "*/",
    "#include",
    "#define",
    "#ifdef",
    "#ifndef",
    "#endif"
  ]);

  return {
    name: "xv6-docs-transformer",
    line(node) {
      let hasDocComment = false;

      // 获取当前行的文本内容
      const lineText = node.children.map(child => 
        child.children ? child.children.map(c => c.value || '').join('') : (child.value || '')
      ).join('').trim();

      // 检查是否有同行注释 - 使用内容匹配而不是行号
      let inlineComment = null;
      
      // 遍历lineComments，找到匹配的注释
      for (const [storedLineIndex, comment] of lineComments.entries()) {
        // 获取处理后内容的对应行
        const processedLines = processedContent.split('\n');
        if (processedLines[storedLineIndex] && processedLines[storedLineIndex].trim() === lineText) {
          inlineComment = comment;
          break;
        }
      }
      
      // 调试信息：查看特定行的内容
      if (currentFilePath.includes('uart.c') && lineText.includes('IER_')) {
        console.log(`=== Content Match Debug ===`);
        console.log(`Line text: "${lineText}"`);
        console.log(`Found comment:`, inlineComment);
        console.log(`========================`);
      }
      
      if (inlineComment) {
        node.properties.class = `${node.properties.class || ""} with-inline-comment`.trim();
        node.properties["data-inline-comment"] = escapeHtml(inlineComment);
      }

      lineNum++; // 在处理完当前行后递增

      for (const [, defs] of functionDefinitions.entries()) {
        const anchorDef = defs.find(
          (d) => d.filePath === currentFilePath && d.startLine === lineNum + 1  // function definitions use 1-based line numbers
        );
        if (anchorDef) {
          node.properties.id = anchorDef.anchor;
        }

        const commentDef = defs.find(
          (d) =>
            d.filePath === currentFilePath && d.docCommentStartLine === lineNum + 1  // function definitions use 1-based line numbers
        );
        if (commentDef && commentDef.docComment) {
          hasDocComment = true;
          const renderedComment = renderMarkdown(commentDef.docComment);
          const finalComment = escapeHtml(renderedComment);
          node.properties.class = `${
            node.properties.class || ""
          } with-tooltip`.trim();
          node.properties["data-comment"] = finalComment;
        }
      }

      if (hasDocComment) {
        // Remove comment tokens from this line, so they only appear in the tooltip
        node.children = node.children.filter((child) => {
          if (child.type === "element" && child.tagName === "span") {
            // A token is a comment if shiki gave it the 'comment' class.
            return !child.properties.class?.includes("comment");
          }
          return true;
        });
      }
    },
    span(node) {
      const tokenContent = node.children[0]?.value?.trim();
      if (!tokenContent) return;

      // 检查是否是函数调用，并且有样式（说明是被高亮的代码token）
      // 但要排除C语言保留字
      if (
        functionDefinitions.has(tokenContent) &&
        node.properties.style &&
        !cKeywords.has(tokenContent)
      ) {
        const defs = functionDefinitions.get(tokenContent);
        const def = defs[0];

        // 只有当函数定义在不同文件时才添加链接
        if (def.filePath !== currentFilePath) {
          node.properties.class =
            (node.properties.class || "") + " function-call";
          node.properties["data-function-name"] = tokenContent;
          node.properties.href = `${def.file}#${def.anchor}`;
          node.tagName = "a";
        }
      }

      if (node.properties.class?.includes("comment")) {
        const commentText = node.children[0]?.value?.trim();
        if (commentText) {
          node.properties.class =
            (node.properties.class || "") + " with-tooltip";
          node.properties["data-comment"] = escapeHtml(
            renderMarkdown(commentText)
          );
        }
      }

      return node;
    },
  };
}

async function processFile(filePath, highlighter, functionDefinitions) {
  const relativePath = path.relative(sourceDir, filePath);
  const targetPath = path.join(targetDir, `${relativePath}.md`);
  const language = getLanguage(filePath);

  console.log(`[+] Processing: ${relativePath}`);

  const targetFileDir = path.dirname(targetPath);
  if (!fs.existsSync(targetFileDir)) {
    fs.mkdirSync(targetFileDir, { recursive: true });
  }

  let content = fs.readFileSync(filePath, "utf-8");
  const filename = path.basename(filePath);
  let finalContent;

  if (language === "c" || language === "asm") {
    // 处理同行注释和块注释
    const { processedContent, lineComments, blockComments } = processInlineComments(content);
    
    // 调试：打印处理后的内容的相关行
    if (filename.includes('uart.c')) {
      const lines = processedContent.split('\n');
      console.log('=== Processed Content Debug for uart.c ===');
      for (let i = 13; i <= 18; i++) {
        if (lines[i]) {
          console.log(`Line ${i}: ${lines[i]}`);
        }
      }
      console.log('=== End Debug ===');
    }
    
    const transformer = createTransformer(functionDefinitions, filePath, lineComments, processedContent);

    // 将代码按块注释分割
    const codeLines = processedContent.split('\n');
    const finalParts = [];
    let lastEnd = 0;

    for (const block of blockComments) {
      // 添加块注释之前的代码
      if (block.startLine > lastEnd) {
        const codePart = codeLines.slice(lastEnd, block.startLine).join('\n');
        if (codePart.trim()) {
          try {
            const highlightedCode = await highlighter.codeToHtml(codePart, {
              lang: language,
              themes: { light: "vitesse-light", dark: "vitesse-dark" },
              transformers: [transformer],
            });
            finalParts.push(highlightedCode);
          } catch (e) {
            finalParts.push(`<pre><code>${escapeHtml(codePart)}</code></pre>`);
          }
        }
      }

      // 添加注释块
      finalParts.push(`::: tip\n${escapeHtml(block.content)}\n:::`);
      
      // 跳过被注释占用的行
      let skipLines = 0;
      for (let i = block.startLine; i < codeLines.length; i++) {
        if (!codeLines[i].trim()) {
          skipLines++;
        } else {
          break;
        }
      }
      lastEnd = block.startLine + skipLines;
    }

    // 添加剩余的代码
    if (lastEnd < codeLines.length) {
      const remainingCode = codeLines.slice(lastEnd).join('\n');
      if (remainingCode.trim()) {
        try {
          const highlightedCode = await highlighter.codeToHtml(remainingCode, {
            lang: language,
            themes: { light: "vitesse-light", dark: "vitesse-dark" },
            transformers: [transformer],
          });
          finalParts.push(highlightedCode);
        } catch (e) {
          finalParts.push(`<pre><code>${escapeHtml(remainingCode)}</code></pre>`);
        }
      }
    }

    // 如果没有块注释，直接高亮整个文件
    if (blockComments.length === 0) {
      try {
        finalContent = await highlighter.codeToHtml(processedContent, {
          lang: language,
          themes: { light: "vitesse-light", dark: "vitesse-dark" },
          transformers: [transformer],
        });
      } catch (e) {
        finalContent = `<pre><code>${escapeHtml(processedContent)}</code></pre>`;
      }
    } else {
      finalContent = finalParts.join('\n\n');
    }
  } else {
    const transformer = createTransformer(functionDefinitions, filePath);
    try {
      finalContent = await highlighter.codeToHtml(content, {
        lang: language,
        themes: { light: "vitesse-light", dark: "vitesse-dark" },
        transformers: [transformer],
      });
    } catch (e) {
      console.error(
        `[Error] Shiki failed to highlight ${filePath}: ${e.message}`
      );
      finalContent = `<pre><code>${escapeHtml(content)}</code></pre>`; // Fallback
    }
  }

  const finalOutput = `<h1>${filename}</h1>\n\n${finalContent}`;
  fs.writeFileSync(targetPath, finalOutput);
}

module.exports = { processFile };
