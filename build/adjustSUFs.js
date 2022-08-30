const fs = require('fs');
const SUFlocation = process.env.SUFlocation;

const files = fs.readdirSync(SUFlocation);

files.forEach(fileName => {
    if(fileName.endsWith('.suf')) {
        const sufFileName = `${SUFlocation}\\${fileName}`;
        const fileContent = fs.readFileSync(sufFileName, 'utf8');
        fs.writeFileSync(fileName, replaceVersion(adjustOutputFolder(fileContent)));
    }
});

function replaceVersion(fileContent) {
    return fileContent.replace(/replace with version/g, process.env.versionTag);
}

function adjustOutputFolder(fileContent) {
    return fileContent.replace(/<OutputFolder>.*<\/OutputFolder>/g, 
        `<OutputFolder>${process.env.installersOutputFolder}</OutputFolder>`);
}