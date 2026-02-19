const fs = require('fs/promises');
const path = require('path');

const root = './packages/common/src/intl/locales';
const [outputLocale, modeArg] = process.argv.slice(2);

if (!outputLocale) {
  throw new Error(
    'Usage: node translate_locale.js <locale_code> [insert|update]'
  );
}

const mode = modeArg ?? 'insert';
if (!['insert', 'update'].includes(mode)) {
  throw new Error(
    `Invalid mode "${mode}". Use "insert" (default) or "update".`
  );
}
console.log(`Translating locale with mode "${mode}"...`);
const targetLanguage = outputLocale;
const sourceDir = path.join(root, 'en');
const outputDir = path.join(root, outputLocale);

const placeholderRegex = /(\{\{[^{}]+\}\}|\$t\([^\)]+\))/g;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const maskPlaceholders = text => {
  const tokens = [];
  const masked = text.replace(placeholderRegex, match => {
    const token = `__PH_${tokens.length}__`;
    tokens.push(match);
    return token;
  });
  return { masked, tokens };
};

const unmaskPlaceholders = (text, tokens) => {
  let output = text;
  for (let index = 0; index < tokens.length; index += 1) {
    output = output.replaceAll(`__PH_${index}__`, tokens[index]);
  }
  return output;
};

const cache = new Map();

const listJsonFiles = async directory => {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listJsonFiles(fullPath)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(fullPath);
    }
  }

  return files;
};

const sortKeys = value => {
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, nestedValue]) => [key, sortKeys(nestedValue)])
  );
};

const translateText = async text => {
  if (cache.has(text)) return cache.get(text);
  if (!text) {
    cache.set(text, text);
    return text;
  }

  const { masked, tokens } = maskPlaceholders(text);
  if (!masked.trim()) {
    cache.set(text, text);
    return text;
  }

  let translated = text;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${encodeURIComponent(targetLanguage)}&dt=t&q=${encodeURIComponent(masked)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.json();
      translated = body?.[0]?.map(part => part?.[0] ?? '').join('') || text;
      translated = unmaskPlaceholders(translated, tokens);
      break;
    } catch {
      if (attempt === 3) translated = text;
      await sleep((attempt + 1) * 600);
    }
  }

  cache.set(text, translated);
  return translated;
};

const main = async () => {
  const sourceJsonFiles = await listJsonFiles(sourceDir);
  let totalChangedCount = 0;
  let filesProcessed = 0;

  for (const sourcePath of sourceJsonFiles) {
    console.log(`processing file: ${path.relative(sourceDir, sourcePath)}...`);
    const relativePath = path.relative(sourceDir, sourcePath);
    const outputPath = path.join(outputDir, relativePath);

    const source = JSON.parse(await fs.readFile(sourcePath, 'utf8'));
    let destination = {};
    let destinationExists = true;

    try {
      destination = JSON.parse(await fs.readFile(outputPath, 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') {
        destinationExists = false;
        destination = {};
      } else {
        throw error;
      }
    }

    const output = { ...destination };
    const entries = Object.entries(source);
    let changedCount = 0;

    for (let index = 0; index < entries.length; index += 1) {
      const [key, value] = entries[index];

      const existsInDestination = Object.hasOwn(output, key);
      // In "insert" mode, only translate if the key doesn't exist in the destination.
      const shouldTranslate = mode === 'update' || !existsInDestination;

      if (shouldTranslate) {
        const translatedValue =
          typeof value === 'string' ? await translateText(value) : value;

        if (translatedValue !== output[key]) {
          changedCount += 1;
          totalChangedCount += 1;
        }
        output[key] = translatedValue;
      }

      if ((index + 1) % 250 === 0) {
        console.log(
          `translated ${relativePath}: ${index + 1}/${entries.length}`
        );
      }
      await sleep(40);
    }

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    const sortedOutput = sortKeys(output);
    await fs.writeFile(
      outputPath,
      `${JSON.stringify(sortedOutput, null, 2)}\n`,
      'utf8'
    );
    filesProcessed += 1;
    console.log(
      `done file: ${relativePath} (${changedCount} keys ${mode === 'insert' ? 'inserted' : 'updated'})`
    );
  }

  console.log(
    `done: ${totalChangedCount} keys ${mode === 'insert' ? 'inserted' : 'updated'} across ${filesProcessed}/${sourceJsonFiles.length} files in ${outputDir} (sl=en, tl=${targetLanguage}, mode=${mode})`
  );
};

main().catch(error => {
  console.error(error);
  process.exit(1);
});
