const fs = require('fs');
const path = require('path');

// Paths
const repoRoot = path.resolve(__dirname, '..');
const sourceDoc = path.join(repoRoot, 'source', 'xv6-riscv', 'user', 'initcode.S.md');
const xv6UserInitAsm = path.join(repoRoot, '..', 'xv6-riscv', 'user', 'initcode');
const xv6UserInitAsmAlt = path.join(repoRoot, '..', 'xv6-riscv', 'user', 'initcode.asm');

function generateDocFromAsm(asmPath) {
  try {
    const asm = fs.readFileSync(asmPath, 'utf8');
    // include only the first ~200 lines to keep the doc small
    const lines = asm.split(/\r?\n/).slice(0, 200).join('\n');
    const content = `# initcode.S

这段汇编（\`initcode.S\`）是 xv6 启动时内核放到用户地址 0 的那段小程序；它会调用 exec 运行 \`/init\`。

\n\n\`\`\`asm
${lines}
\`\`\`

（此页面由 \`check-initcode-doc.cjs\` 自动生成）
`;
    return content;
  } catch (e) {
    return null;
  }
}

function main() {
  if (fs.existsSync(sourceDoc)) {
    console.log('initcode doc exists, nothing to do.');
    return 0;
  }

  console.log('initcode doc missing — attempting to generate...');
  let src = null;
  if (fs.existsSync(xv6UserInitAsm)) src = xv6UserInitAsm;
  else if (fs.existsSync(xv6UserInitAsmAlt)) src = xv6UserInitAsmAlt;

  if (!src) {
    console.error('Could not find source initcode (tried:', xv6UserInitAsm, 'and', xv6UserInitAsmAlt, ').');
    process.exit(1);
  }

  const doc = generateDocFromAsm(src);
  if (!doc) {
    console.error('Failed to read source initcode file.');
    process.exit(1);
  }

  // Ensure target dir exists
  const targetDir = path.dirname(sourceDoc);
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(sourceDoc, doc, 'utf8');
  console.log('Generated', sourceDoc);
  return 0;
}

process.exit(main());
