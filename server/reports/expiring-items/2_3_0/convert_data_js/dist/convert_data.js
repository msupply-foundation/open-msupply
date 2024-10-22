// src/convert_data.js
function convert_data() {
  let res = JSON.parse(Host.inputString());
  Host.outputString(JSON.stringify(res));
}
module.exports = {
  // calculateExpectedUsage,
  convert_data
  // processStockLines,
  // calculateDaysUntilExpired,
  // calculateStockAtRisk,
  // roundDaysToInteger,
};
//# sourceMappingURL=convert_data.js.map
