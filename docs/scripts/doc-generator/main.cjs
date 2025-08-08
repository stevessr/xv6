const fs = require('fs');
const path = require('path');
const { sourceDir, targetDir, allowedExtensions, allowedFilenames } = require('./config.cjs');
const functionExtractor = require('./function-extractor.cjs');
const { processFile } = require('./file-processor.cjs');
const sidebarGenerator = require('./sidebar.cjs');

async function traverseDir(dir, highlighter, functionDefinitions) {
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (entry.name !== '.git') {
                    await traverseDir(fullPath, highlighter, functionDefinitions);
                }
            } else if (entry.isFile()) {
                const ext = path.extname(entry.name);
                if (allowedExtensions.includes(ext) || allowedFilenames.includes(entry.name)) {
                    await processFile(fullPath, highlighter, functionDefinitions);
                }
            }
        }
    } catch (error) {
        console.error(`Error reading directory ${dir}: ${error.message}`);
        throw error;
    }
}

async function main() {
    try {
        const { createHighlighter } = await import('shiki/bundle/full');
        
        console.log('Starting source documentation generation...');

        const highlighter = await createHighlighter({
            themes: ['vitesse-light', 'vitesse-dark'],
            langs: ['c', 'asm', 'makefile'],
        });
        
        // Step 1: Generate the function map JSON
        functionExtractor.run();

        // Step 2: Load the function map from JSON
        const functionMapPath = path.join(__dirname, 'function-map.json');
        if (!fs.existsSync(functionMapPath)) {
            throw new Error(`Function map not found at ${functionMapPath}. Run the extractor first.`);
        }
        const functionDefinitionsJson = fs.readFileSync(functionMapPath, 'utf-8');
        const functionDefinitionsData = JSON.parse(functionDefinitionsJson);
        
        // Convert the plain object back to a Map for the processor
        const functionDefinitions = new Map(Object.entries(functionDefinitionsData));


        console.log(`Source directory: ${sourceDir}`);
        console.log(`Target directory: ${targetDir}`);

        if (!fs.existsSync(sourceDir)) {
            throw new Error(`Source directory not found: ${sourceDir}`);
        }

        if (fs.existsSync(targetDir)) {
            console.log('Cleaning up target directory...');
            fs.rmSync(targetDir, { recursive: true, force: true });
        }
        fs.mkdirSync(targetDir, { recursive: true });

        sidebarGenerator.generate();

        await traverseDir(sourceDir, highlighter, functionDefinitions);

        console.log('✅ Source documentation generation complete.');
    } catch (error) {
        console.error(`❌ An error occurred: ${error.message}`);
        console.error(error.stack);
        process.exit(1);
    }
}

main();
