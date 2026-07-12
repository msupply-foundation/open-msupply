const match = process.env.versionTag.match(/\d+\.\d+\.\d+/);
let version = !match
  ? '0.0.0'
  : match[0]
      .split('.')
      .map((part) => String(parseInt(part, 10)))
      .join('.');

console.log(version);
