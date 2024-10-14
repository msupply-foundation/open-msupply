const { sql } = Host.getFunctions();
function convert_data() {
  const res = JSON.parse(Host.inputString());
  let now = Date.now();
  res.stockLines.nodes.forEach((line) => {
    // add days until expired field
    if (line.expiryDate != undefined) {
        line.daysUntilExpired = (new Date(line.expiryDate) - now) / 1000 / 60 / 60 / 24;
    };
    //  calculate stock at risk field
    if (line.item.stats.averageMonthlyConsumption && line.expiryDate) {
        if (line.daysUntilExpired > 0) {
            line.expectedUsage = line.item.stats.averageMonthlyConsumption * (line.daysUntilExpired / 30);
            line.stockAtRisk = line.totalNumberOfPacks * line.packSize - line.expectedUsage;
        } else {
            line.stockAtRisk = line.totalNumberOfPacks * line.packSize;
        }
    };
    // calculate stock at risk if no monthly consumption provided
    if (line.expiryDate && !line.item.stats.averageMonthlyConsumption) {
        if (line.daysUntilExpired < 0) {
            line.stockAtRisk = line.totalNumberOfPacks * line.packSize;
        }
    };
    // round days to integer
    if (line.daysUntilExpired) {
        line.daysUntilExpired = Math.round(line.daysUntilExpired);
    }
  })



  Host.outputString(JSON.stringify(res));
}
module.exports = { convert_data };