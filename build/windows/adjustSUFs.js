const fs = require('fs');
const files = fs.readdirSync('.');

files.forEach((fileName) => {
  if (fileName.endsWith('.suf')) {
    const sufFileName = `${fileName}`;
    const fileContent = fs.readFileSync(sufFileName, 'utf8');
    fs.writeFileSync(fileName, replaceVersion(adjustOutputFolder(fileContent)));
  }
});

function replaceVersion(fileContent) {
  return fileContent.replace(/replace with version/g, process.env.versionTag);
}

function adjustOutputFolder(fileContent) {
  return fileContent.replace(
    /<OutputFolder>.*<\/OutputFolder>/g,
    `<OutputFolder>${process.env.installersOutputFolder}</OutputFolder>`
  );
}
