const fs = require('fs');
fs.readFile('../../../package.json', (err, rootPackageJson) => {
  if (err) throw err;
  const rootPackage = JSON.parse(rootPackageJson);

  fs.readFile('./package.json', (err, packageJson) => {
    if (err) throw err;

    const package = JSON.parse(packageJson);
    package.version = rootPackage.version;

    fs.writeFile('./package.json', JSON.stringify(package, 2), err => {
      if (err) throw err;
      console.info('Package version updated.');
    });
  });
});
