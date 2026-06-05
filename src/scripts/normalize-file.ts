// tmp/normalize-file.ts
import { normalizeString } from '../lib/string-normalization';
import * as fs from 'fs';
import * as readline from 'readline';

async function processFile({
  inputFile,
  outputFile,
}: {
  inputFile: string;
  outputFile: string;
}): Promise<void> {
  const fileStream = fs.createReadStream(inputFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const outputStream = fs.createWriteStream(outputFile);

  for await (const line of rl) {
    const normalizedLine = normalizeString({ text: line });
    outputStream.write(`${normalizedLine}
`);
  }

  outputStream.end();
  console.log(`Normalization complete. Output written to ${outputFile}`);
}

const inputFile = 'tmp/ru/ru_corp.txt';
const outputFile = 'tmp/ru/ru_corp_2.txt';

processFile({ inputFile, outputFile }).catch((err) => {
  console.error('Error during file processing:', err);
  process.exit(1);
});
