import * as fs from 'fs';
import * as path from 'path';
// Corrected import path for symbolLayoutRu
import { symbolLayoutRu } from '../src/data/layouts/symbol-layout-ru.ts'; 

const sentencesFilePath = path.join(process.cwd(), 'all_extracted_sentences.txt');

// 1. Extract Allowed Symbols
const allowedSymbols = new Set();
symbolLayoutRu.forEach(item => {
    allowedSymbols.add(item.symbol);
});

// Helper function to check if all characters in a string are in the allowed set
function containsOnlyAllowedSymbols(line, allowed) {
    if (line.length === 0) {
        return true; // Keep truly empty lines.
    }
    for (const char of line) {
        if (!allowed.has(char)) {
            return false;
        }
    }
    return true;
}

// 2. Read and Filter all_extracted_sentences.txt
let lines;
try {
    lines = fs.readFileSync(sentencesFilePath, 'utf8').split('\n');
} catch (error) {
    console.error(`Error reading ${sentencesFilePath}:`, error);
    process.exit(1);
}

const filteredLines = lines.filter(line => {
    // Remove '\r' if present from Windows line endings before checking characters
    const charsToCheck = line.endsWith('\r') ? line.slice(0, -1) : line;
    
    // An empty line or a line with only whitespace characters should be kept if the whitespace characters are allowed.
    // The `containsOnlyAllowedSymbols` function handles this.
    return containsOnlyAllowedSymbols(charsToCheck, allowedSymbols);
});

// 3. Overwrite File
try {
    // Ensure the output retains the original line ending style by joining with '\n'
    // This will implicitly handle '\r\n' if the original file had it, as split('\n') would create lines ending in '\r'.
    // If the original file ended with '\n' and not '\r\n', then charsToCheck already handled it correctly.
    const outputContent = filteredLines.join('\n');
    fs.writeFileSync(sentencesFilePath, outputContent, 'utf8');
    console.log(`Filtered sentences written to ${sentencesFilePath}. Kept ${filteredLines.length} lines.`);
} catch (error) {
    console.error(`Error writing to ${sentencesFilePath}:`, error);
    process.exit(1);
}