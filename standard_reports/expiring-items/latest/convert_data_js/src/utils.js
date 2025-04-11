import { cleanUpNodes, sortNodes, getNestedValue } from '../../../../utils';

const processStockLines = (nodes, sort, dir) => {
  nodes.forEach((line) => {
    if (Object.keys(line).length == 0) {
      return;
    }
    const daysUntilExpiredFloat = calculateDaysUntilExpired(line?.expiryDate);
    const expectedUsage = calculateExpectedUsage(daysUntilExpiredFloat, line);
    if (!!expectedUsage) {
      line.expectedUsage = expectedUsage;
    }
    const stockAtRisk = calculateStockAtRisk(
      line?.packSize,
      line?.totalNumberOfPacks,
      line?.item?.stats?.averageMonthlyConsumption,
      daysUntilExpiredFloat
    );
    if (!!stockAtRisk) {
      line.stockAtRisk = stockAtRisk;
    }
    line.daysUntilExpired = roundDaysToInteger(daysUntilExpiredFloat);
    line.averageMonthlyConsumption =
      Math.round((line?.item?.stats?.averageMonthlyConsumption ?? 0) * 10) / 10;
  });

  let cleanNodes = cleanUpNodes(nodes);
  let sortedNodes = sortNodes(cleanNodes, sort, dir);
  return sortedNodes;
};

const calculateDaysUntilExpired = (expiryDateString) => {
  let daysUntilExpired = undefined;
  if (!!expiryDateString) {
    let now = Date.now();
    daysUntilExpired = (new Date(expiryDateString) - now) / 1000 / 60 / 60 / 24;
  }
  return daysUntilExpired;
};

const calculateExpectedUsage = (daysUntilExpired, line) => {
  let averageMonthlyConsumption = line?.item?.stats?.averageMonthlyConsumption;
  let totalStock = line?.totalNumberOfPacks * line?.packSize;

  let expectedUsage = undefined;
  if (!!daysUntilExpired && !!averageMonthlyConsumption && !!totalStock) {
    if (daysUntilExpired >= 0) {
      const usage = Math.round(daysUntilExpired * (averageMonthlyConsumption / (365.25 / 12.0)));
      expectedUsage = Math.min(usage, totalStock ?? usage);
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
          totalStock - averageMonthlyConsumption * (daysUntilExpired / (365.25 / 12.0))
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
  if (stockAtRisk < 0) {
    return 0;
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

export {
  calculateExpectedUsage,
  processStockLines,
  calculateDaysUntilExpired,
  calculateStockAtRisk,
  roundDaysToInteger,
  sortNodes,
  getNestedValue,
};
