// const { sql } = Host.getFunctions();
function convert_data() {
  let res = JSON.parse(Host.inputString());
  res.stockLines.nodes = processStockLines(res.stockLines.nodes);
  Host.outputString(JSON.stringify(resProcessed));
}

const processStockLines = (nodes) => {
  nodes.forEach((line) => {
    line.daysUntilExpired = calculateDaysUntilExpired(line.expiryDate);
    line.expectedUsage = calculateExpectedUsage(
      line.daysUntilExpired,
      line.averageMonthlyConsumption
    );
    line.stockAtRisk = addStockAtRisk(line);
    line.daysUntilExpired = roundDaysToInteger(line.daysUntilExpired);
  });
  return nodes;
};

const calculateDaysUntilExpired = (expiryDateString) => {
  let daysUntilExpired = undefined;
  if (!!expiryDateString) {
    let now = Date.now();
    daysUntilExpired = (new Date(expiryDateString) - now) / 1000 / 60 / 60 / 24;
  }
  return daysUntilExpired;
};

const calculateExpectedUsage = (
  daysUntilExpired,
  averageMonthlyConsumption
) => {
  let expectedUsage = undefined;
  if (!!daysUntilExpired && !!averageMonthlyConsumption) {
    expectedUsage = daysUntilExpired * averageMonthlyConsumption;
  }
  return expectedUsage;
};

const calculateStockAtRisk = (
  packSize,
  totalNumberOfPacks,
  averageMonthlyConsumption,
  daysUntilExpired
) => {
  let stockAtRisk = undefined;
  if (!!packSize && !!totalNumberOfPacks && !!daysUntilExpired) {
    const totalStock = packSize * totalNumberOfPacks;
    if (!!averageMonthlyConsumption) {
      stockAtRisk = Math.round(
        totalStock - averageMonthlyConsumption * (daysUntilExpired / 30)
      );
    }
    if (!averageMonthlyConsumption) {
      if (daysUntilExpired <= 0) {
        stockAtRisk = Math.round(totalStock);
      }
    }
  }
  return stockAtRisk;
};

const roundDaysToInteger = (daysUntilExpired) => {
  let rounded = undefined;
  if (!!daysUntilExpired) {
    rounded = Math.round(daysUntilExpired);
  }
  return rounded;
};

module.exports = {
  calculateExpectedUsage,
  convert_data,
  processStockLines,
  calculateDaysUntilExpired,
  calculateStockAtRisk,
  calculateStockAtRiskIfNoMonthlyConsumption,
  roundDaysToInteger,
};
