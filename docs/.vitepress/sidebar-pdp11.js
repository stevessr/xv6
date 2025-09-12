function gen(prefix, start, end, pad = 3) {
  return Array.from({ length: end - start + 1 }, (_, i) => {
    const page = String(start + i).padStart(pad, '0');
    return { text: `${prefix}-${page}`, link: `/mit6.1810/pdp11/${prefix}-${page}` };
  });
}

function gen40(prefix, start, end, pad = 6) {
  return Array.from({ length: end - start + 1 }, (_, i) => {
    const page = String(start + i).padStart(pad, '0');
    return { text: `${prefix}-${page}`, link: `/mit6.1810/pdp11/${prefix}-${page}.html` };
  });
}

export default [
  {
    text: 'PDP-11 Documentation',
    items: [
      {
        text: 'PDP-11 Handbook',
        collapsed: true,
        items: [
          { text: 'Contents', link: '/mit6.1810/pdp11/pdp-contents' },
          ...Array.from({ length: 10 }, (_, i) => ({
            text: `Pages ${i * 100 + 1}-${(i + 1) * 100 -1}`,
            collapsed: true,
            items: gen('pdp11', i * 100 + 1, (i + 1) * 100 - 1, 3)
          })),
          { text: 'Glossary', link: '/mit6.1810/pdp11/pdp-glossary' },
          { text: 'Index', link: '/mit6.1810/pdp11/pdp-index' },
        ]
      },
      {
        text: 'PDP-11/40 Processor Handbook',
        collapsed: false,
        items: [
            { "text": "Cover", "link": "/mit6.1810/pdp11/pdp11-40-000001.html" },
            { "text": "Table of Contents", "link": "/mit6.1810/pdp11/pdp11-40-000005.html" },
            { "text": "Chapter 1: Introduction", "link": "/mit6.1810/pdp11/pdp11-40-000009.html" },
            { "text": "Chapter 2: System Architecture", "link": "/mit6.1810/pdp11/pdp11-40-000017.html" },
            { "text": "Chapter 3: Addressing Modes", "link": "/mit6.1810/pdp11/pdp11-40-000029.html" },
            {
                "text": "Chapter 4: Instruction Set",
                "link": "/mit6.1810/pdp11/pdp11-40-000047.html",
                "collapsed": true,
                "items": [
                    { "text": "List of Instructions", "link": "/mit6.1810/pdp11/pdp11-40-000050.html" },
                    { "text": "CLR", "link": "/mit6.1810/pdp11/pdp11-40-000052.html" },
                    { "text": "COM", "link": "/mit6.1810/pdp11/pdp11-40-000053.html" },
                    { "text": "INC", "link": "/mit6.1810/pdp11/pdp11-40-000054.html" },
                    { "text": "DEC", "link": "/mit6.1810/pdp11/pdp11-40-000055.html" },
                    { "text": "NEG", "link": "/mit6.1810/pdp11/pdp11-40-000056.html" },
                    { "text": "TST", "link": "/mit6.1810/pdp11/pdp11-40-000057.html" },
                    { "text": "ASR", "link": "/mit6.1810/pdp11/pdp11-40-000059.html" },
                    { "text": "ASL", "link": "/mit6.1810/pdp11/pdp11-40-000060.html" },
                    { "text": "ROR", "link": "/mit6.1810/pdp11/pdp11-40-000061.html" },
                    { "text": "ROL", "link": "/mit6.1810/pdp11/pdp11-40-000062.html" },
                    { "text": "ADC", "link": "/mit6.1810/pdp11/pdp11-40-000065.html" },
                    { "text": "SXT", "link": "/mit6.1810/pdp11/pdp11-40-000067.html" },
                    { "text": "MOV", "link": "/mit6.1810/pdp11/pdp11-40-000069.html" },
                    { "text": "CMP", "link": "/mit6.1810/pdp11/pdp11-40-000070.html" },
                    { "text": "ADD", "link": "/mit6.1810/pdp11/pdp11-40-000071.html" },
                    { "text": "BIT", "link": "/mit6.1810/pdp11/pdp11-40-000074.html" },
                    { "text": "BIC", "link": "/mit6.1810/pdp11/pdp11-40-000075.html" },
                    { "text": "BIS", "link": "/mit6.1810/pdp11/pdp11-40-000076.html" },
                    { "text": "XOR", "link": "/mit6.1810/pdp11/pdp11-40-000081.html" },
                    { "text": "BR", "link": "/mit6.1810/pdp11/pdp11-40-000083.html" },
                    { "text": "BNE", "link": "/mit6.1810/pdp11/pdp11-40-000084.html" },
                    { "text": "BPL", "link": "/mit6.1810/pdp11/pdp11-40-000086.html" },
                    { "text": "BGE", "link": "/mit6.1810/pdp11/pdp11-40-000093.html" },
                    { "text": "BLT", "link": "/mit6.1810/pdp11/pdp11-40-000094.html" },
                    { "text": "BGT", "link": "/mit6.1810/pdp11/pdp11-40-000095.html" },
                    { "text": "BLE", "link": "/mit6.1810/pdp11/pdp11-40-000096.html" },
                    { "text": "BHIS", "link": "/mit6.1810/pdp11/pdp11-40-000100.html" },
                    { "text": "BLO", "link": "/mit6.1810/pdp11/pdp11-40-000101.html" },
                    { "text": "JMP", "link": "/mit6.1810/pdp11/pdp11-40-000102.html" },
                    { "text": "JSR", "link": "/mit6.1810/pdp11/pdp11-40-000104.html" },
                    { "text": "RTS", "link": "/mit6.1810/pdp11/pdp11-40-000106.html" },
                    { "text": "MARK", "link": "/mit6.1810/pdp11/pdp11-40-000107.html" },
                    { "text": "EMT", "link": "/mit6.1810/pdp11/pdp11-40-000111.html" },
                    { "text": "TRAP", "link": "/mit6.1810/pdp11/pdp11-40-000112.html" },
                    { "text": "BPT", "link": "/mit6.1810/pdp11/pdp11-40-000113.html" },
                    { "text": "IOT", "link": "/mit6.1810/pdp11/pdp11-40-000114.html" },
                    { "text": "RTT", "link": "/mit6.1810/pdp11/pdp11-40-000116.html" },
                    { "text": "HALT", "link": "/mit6.1810/pdp11/pdp11-40-000120.html" },
                    { "text": "WAIT", "link": "/mit6.1810/pdp11/pdp11-40-000121.html" },
                    { "text": "RESET", "link": "/mit6.1810/pdp11/pdp11-40-000122.html" }
                ]
            },
            { "text": "Chapter 5: Programming Techniques", "link": "/mit6.1810/pdp11/pdp11-40-000127.html" },
            { "text": "Chapter 6: Memory Management", "link": "/mit6.1810/pdp11/pdp11-40-000145.html" },
            { "text": "Chapter 7: Internal Processor Options", "link": "/mit6.1810/pdp11/pdp11-40-000153.html" },
            { "text": "Chapter 8: Console Operation", "link": "/mit6.1810/pdp11/pdp11-40-000161.html" },
            { "text": "Chapter 9: Specifications", "link": "/mit6.1810/pdp11/pdp11-40-000165.html" },
            { "text": "Appendix A: Instruction Set Processor", "link": "/mit6.1810/pdp11/pdp11-40-000169.html" },
            { "text": "Appendix B: Memory Map", "link": "/mit6.1810/pdp11/pdp11-40-000183.html" },
            { "text": "Appendix C: PDP-11/40 Instruction Timing", "link": "/mit6.1810/pdp11/pdp11-40-000191.html" },
            { "text": "Appendix D: Instruction Index", "link": "/mit6.1810/pdp11/pdp11-40-000197.html" },
            { "text": "Appendix E: Summary of PDP11 Instructions", "link": "/mit6.1810/pdp11/pdp11-40-000199.html" }
        ]
      },
      {
        text: 'KB11 CPU (PDP-11/40)',
        collapsed: true,
        items: [
          { text: 'Contents', link: '/mit6.1810/pdp11/kb-contents' },
          ...Array.from({ length: 10 }, (_, i) => ({
            text: `Pages ${i * 100 + 1}-${(i + 1) * 100 -1}`,
            collapsed: true,
            items: gen('kb11', i * 100 + 1, (i + 1) * 100 - 1, 3)
          })),
          { text: 'Glossary', link: '/mit6.1810/pdp11/kb-glossary' },
          { text: 'Index', link: '/mit6.1810/pdp11/kb-index' },
        ]
      },
      {
        text: 'KA6 CPU (VAX-11/780)',
        collapsed: true,
        items: [
          { text: 'Contents', link: '/mit6.1810/pdp11/ka-contents' },
          ...Array.from({ length: 4 }, (_, i) => ({
            text: `Pages ${i * 100 + 1}-${(i + 1) * 100 -1}`,
            collapsed: true,
            items: gen('ka6', i * 100 + 1, (i + 1) * 100 - 1, 3)
          })),
          { text: 'Glossary', link: '/mit6.1810/pdp11/ka-glossary' },
          { text: 'Index', link: '/mit6.1810/pdp11/ka-index' },
        ]
      }
    ]
  }
];