const fs = require("fs");
const path = require("path");
const {
  sourceDir,
  allowedExtensions,
  allowedFilenames,
} = require("./config.cjs");

const functionDefinitions = new Map();

function getLanguage(filePath) {
  const ext = path.extname(filePath);
  const filename = path.basename(filePath);

  if (ext === ".c" || ext === ".h") return "c";
  if (ext === ".S") return "asm"; // GNU Assembler Syntax
  if (ext === ".ld") return ""; // Linker Script - no highlighting for now
  if (allowedFilenames.includes(filename)) return "makefile";

  return ""; // Default to no language
}

function findMatchingBrace(lines, startLineIndex) {
  let openBraces = 0;
  let firstBraceFound = false;
  for (let i = startLineIndex; i < lines.length; i++) {
    for (const char of lines[i]) {
      if (char === "{") {
        openBraces++;
        firstBraceFound = true;
      } else if (char === "}") {
        openBraces--;
      }
    }
    if (firstBraceFound && openBraces === 0) {
      return i;
    }
  }
  return -1; // Not found
}

function extractFunctionDefinitions(filePath, content) {
  const relativePath = path.relative(sourceDir, filePath);
  const language = getLanguage(filePath);
  const link = `/source/xv6-riscv/${relativePath}`;
  const lines = content.split("\n");

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

  if (language !== "c") {
    return;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Basic check for a function definition pattern
    const parenIndex = line.indexOf("(");
    if (
      parenIndex > 0 &&
      !line.endsWith(";") &&
      !line.startsWith("#") &&
      !line.startsWith("if") &&
      !line.startsWith("for") &&
      !line.startsWith("while")
    ) {
      const signature = line.substring(0, parenIndex).trim();
      const parts = signature.split(" ").filter((p) => p);
      const functionName = parts.pop().replace("*", "");

      // 跳过C保留字
      if (!functionName || cKeywords.has(functionName)) continue;

      let bodyStartIndex = -1;
      for (let j = i; j < lines.length; j++) {
        if (lines[j].includes("{")) {
          bodyStartIndex = j;
          break;
        }
      }

      if (bodyStartIndex === -1) continue;

      const endLineIndex = findMatchingBrace(lines, bodyStartIndex);

      if (endLineIndex !== -1) {
        const definitionLineIndex = i;
        const docCommentLines = [];
        let docCommentStartLine = -1;

        let j = definitionLineIndex - 1;
        while (j >= 0 && lines[j].trim() === "") {
          j--;
        }

        while (j >= 0) {
          const trimmedLine = lines[j].trim();
          const isComment =
            trimmedLine.startsWith("//") ||
            trimmedLine.endsWith("*/") ||
            trimmedLine.startsWith("/*") ||
            (trimmedLine.startsWith("*") && !trimmedLine.startsWith("*/"));

          if (isComment) {
            docCommentLines.unshift(lines[j]);
            docCommentStartLine = j;
          } else {
            break;
          }
          j--;
        }

        const docComment = docCommentLines.join("\n");
        const anchor = `${functionName}-${relativePath.replace(
          /[\/\.]/g,
          "-"
        )}`;

        const definition = {
          file: link,
          filePath: filePath,
          startLine: definitionLineIndex + 1,
          endLine: endLineIndex + 1,
          name: functionName,
          anchor: anchor,
          docComment: docComment,
          docCommentStartLine: docComment ? docCommentStartLine + 1 : -1,
          context: filePath.startsWith(path.join(sourceDir, "kernel"))
            ? "kernel"
            : "user",
        };

        if (!functionDefinitions.has(functionName)) {
          functionDefinitions.set(functionName, []);
        }
        const definitions = functionDefinitions.get(functionName);
        if (filePath.endsWith(".c")) {
          definitions.unshift(definition);
        } else {
          definitions.push(definition);
        }
        i = endLineIndex;
      }
    }
  }
}

function buildFunctionMap(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== ".git") {
        buildFunctionMap(fullPath);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (
        allowedExtensions.includes(ext) ||
        allowedFilenames.includes(entry.name)
      ) {
        const content = fs.readFileSync(fullPath, "utf-8");
        extractFunctionDefinitions(fullPath, content);
      }
    }
  }
}

function run() {
  console.log("Building function definition map...");
  buildFunctionMap(sourceDir);

  // Convert Map to a plain object for JSON serialization
  const definitionsObject = {};
  for (const [key, value] of functionDefinitions.entries()) {
    definitionsObject[key] = value;
  }

  const outputPath = path.join(__dirname, "function-map.json");
  fs.writeFileSync(outputPath, JSON.stringify(definitionsObject, null, 2));

  console.log(
    `✅ Found ${functionDefinitions.size} function definitions and saved to ${outputPath}.`
  );
  return functionDefinitions;
}

module.exports = {
  run,
  getLanguage,
};
