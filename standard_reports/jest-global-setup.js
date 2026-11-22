// Run every test in UTC, so a test's dates mean the same on every machine. A test file that needs
// another timezone sets it with jest-timezone-environment.js.
module.exports = () => {
  process.env.TZ = 'UTC';
};
