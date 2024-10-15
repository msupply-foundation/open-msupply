// const { sql } = Host.getFunctions();
function convert_data() {
  let res = JSON.parse(Host.inputString());
  res.stockLines.nodes = processStockLines(res.stockLines.nodes);
  Host.outputString(JSON.stringify(resProcessed));
}

const processStockLines = (nodes) => {
  nodes.forEach((line) => {
    const daysUntilExpiredFloat = calculateDaysUntilExpired(line.expiryDate);
    const expectedUsage = calculateExpectedUsage(
      daysUntilExpiredFloat,
      line.item.stats.averageMonthlyConsumption
    );
    if (!!expectedUsage) {
      line.expectedUsage = expectedUsage;
    }
    const stockAtRisk = calculateStockAtRisk(
      line.packSize,
      line.totalNumberOfPacks,
      line.item.stats.averageMonthlyConsumption,
      daysUntilExpiredFloat
    );
    if (!!stockAtRisk) {
      line.stockAtRisk = stockAtRisk;
    }
    line.daysUntilExpired = roundDaysToInteger(daysUntilExpiredFloat);
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
    if (daysUntilExpired >= 0) {
    expectedUsage = Math.round(daysUntilExpired * (averageMonthlyConsumption / 30));
    }
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
      if (daysUntilExpired >= 0) {
        stockAtRisk = Math.round(
          totalStock - averageMonthlyConsumption * (daysUntilExpired / 30)
        );
      } else {
        stockAtRisk = Math.round(totalStock);
      }
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
  roundDaysToInteger,
};
