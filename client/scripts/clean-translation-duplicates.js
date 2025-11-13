const fs = require('fs');

function cleanDuplicates(inputFile, outputFile) {
  // Read the file content
  let content = fs.readFileSync(inputFile, 'utf8');

  // Check for merge conflict markers
  const hasMergeConflicts =
    content.includes('<<<<<<<') ||
    content.includes('>>>>>>>') ||
    content.includes('=======');

  if (hasMergeConflicts) {
    console.log('\n⚠️  WARNING: Git merge conflict markers detected!');
    console.log('Attempting to remove merge conflict markers...\n');

    // Remove merge conflict markers and keep the content from HEAD
    const lines = content.split('\n');
    const cleanedLines = [];
    let inConflict = false;
    let skipUntilEnd = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.includes('<<<<<<<')) {
        inConflict = true;
        continue;
      } else if (line.includes('=======') && inConflict) {
        skipUntilEnd = true;
        continue;
      } else if (line.includes('>>>>>>>')) {
        inConflict = false;
        skipUntilEnd = false;
        continue;
      }

      if (!skipUntilEnd) {
        cleanedLines.push(line);
      }
    }

    content = cleanedLines.join('\n');
    console.log('✓ Merge conflict markers removed\n');
  }

  // Now find duplicates
  const lines = content.split('\n');
  const seen = new Map(); // Track keys and their line numbers
  const duplicates = [];

  // Find all duplicates
  lines.forEach((line, index) => {
    const match = line.match(/^\s*"([^"]+)":/);
    if (match) {
      const key = match[1];
      if (seen.has(key)) {
        duplicates.push({
          key,
          firstLine: seen.get(key),
          duplicateLine: index + 1,
        });
      } else {
        seen.set(key, index + 1);
      }
    }
  });

  // Report duplicates
  if (duplicates.length > 0) {
    console.log('=== Found Duplicates ===');
    console.log(`Total: ${duplicates.length} duplicate keys\n`);

    // Show first 10 as examples
    const samplesToShow = Math.min(10, duplicates.length);
    console.log(`Showing first ${samplesToShow} duplicates:\n`);
    duplicates
      .slice(0, samplesToShow)
      .forEach(({ key, firstLine, duplicateLine }) => {
        console.log(`  "${key}"`);
        console.log(
          `    First: line ${firstLine}, Duplicate: line ${duplicateLine}`
        );
      });

    if (duplicates.length > samplesToShow) {
      console.log(
        `\n  ... and ${duplicates.length - samplesToShow} more duplicates`
      );
    }
    console.log();
  }

  // Parse and reconstruct JSON keeping only last occurrence of each key
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    console.error('❌ Error parsing JSON after cleaning merge conflicts:');
    console.error(error.message);

    // Try to find the problematic area
    const lines = content.split('\n');
    const errorMatch = error.message.match(/position (\d+)/);
    if (errorMatch) {
      const pos = parseInt(errorMatch[1]);
      let currentPos = 0;
      for (let i = 0; i < lines.length; i++) {
        currentPos += lines[i].length + 1; // +1 for newline
        if (currentPos >= pos) {
          console.error(`\nError likely around line ${i + 1}:`);
          console.error(`${i}: ${lines[i - 1]}`);
          console.error(`${i + 1}: ${lines[i]}`);
          console.error(`${i + 2}: ${lines[i + 1]}`);
          break;
        }
      }
    }
    throw error;
  }

  const cleanedData = {};

  // This automatically handles duplicates by keeping the last value
  Object.keys(parsed).forEach(key => {
    cleanedData[key] = parsed[key];
  });

  // Write cleaned JSON
  const cleanedJson = JSON.stringify(cleanedData, null, 2);
  fs.writeFileSync(outputFile, cleanedJson, 'utf8');

  console.log('=== Summary ===');
  console.log(`Original unique keys: ${seen.size}`);
  console.log(`Duplicate keys found: ${duplicates.length}`);
  console.log(`Keys in cleaned file: ${Object.keys(cleanedData).length}`);
  console.log(`\n✓ Cleaned file written to: ${outputFile}`);

  if (inputFile === outputFile) {
    console.log('\n⚠️  Original file has been overwritten!');
  }
}

// Usage
const inputFile = process.argv[2] || './common.json';
const outputFile = process.argv[3] || inputFile; // Default to overwriting if no output specified

try {
  cleanDuplicates(inputFile, outputFile);
} catch (error) {
  console.error('\n❌ Failed to clean duplicates:', error.message);
  process.exit(1);
}
