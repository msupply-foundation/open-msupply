import { sortNodes } from '../../../../utils';

const processStockLines = (nodes, sort, dir) => {
  // Filter out empty objects first
  const filteredNodes = nodes.filter(line => Object.keys(line).length > 0);

  filteredNodes.forEach(line => {
    const daysUntilExpiredFloat = calculateDaysUntilExpired(line?.expiryDate);
    // null rather than undefined when there's no figure, so the template can tell it from 0
    line.expectedUsage =
      calculateExpectedUsage(daysUntilExpiredFloat, line) ?? null;
    line.stockAtRisk =
      calculateStockAtRisk(
        line?.packSize,
        line?.totalNumberOfPacks,
        line?.item?.stats?.averageMonthlyConsumption,
        daysUntilExpiredFloat
      ) ?? null;
    // null rather than undefined when there's no expiry date, so the template can tell it from 0
    line.daysUntilExpired = roundDaysToInteger(daysUntilExpiredFloat) ?? null;
    line.averageMonthlyConsumption =
      Math.round((line?.item?.stats?.averageMonthlyConsumption ?? 0) * 10) / 10;
  });

  let sortedNodes = sortNodes(filteredNodes, sort, dir);
  return sortedNodes;
};

// Whole days from today to the expiry date. Today is the local date, which on the server is the
// report's timezone: subtracting now from the expiry date's UTC midnight gave the day before or
// after, depending on the hour and the timezone.
const calculateDaysUntilExpired = expiryDateString => {
  if (!expiryDateString) return undefined;
  const [year, month, day] = expiryDateString.split('-').map(Number);
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return (Date.UTC(year, month - 1, day) - today) / 1000 / 60 / 60 / 24;
};

const calculateExpectedUsage = (daysUntilExpired, line) => {
  let averageMonthlyConsumption = line?.item?.stats?.averageMonthlyConsumption;
  let totalStock = line?.totalNumberOfPacks * line?.packSize;

  let expectedUsage = undefined;
  if (daysUntilExpired != null && !!averageMonthlyConsumption && !!totalStock) {
    if (daysUntilExpired >= 0) {
      const usage = Math.round(
        daysUntilExpired * (averageMonthlyConsumption / (365.25 / 12.0))
      );
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
  if (!!packSize && !!totalNumberOfPacks && daysUntilExpired != null) {
    const totalStock = packSize * totalNumberOfPacks;
    if (!!averageMonthlyConsumption) {
      if (daysUntilExpired >= 0) {
        stockAtRisk = Math.round(
          totalStock -
            averageMonthlyConsumption * (daysUntilExpired / (365.25 / 12.0))
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

const roundDaysToInteger = daysUntilExpired => {
  let rounded = undefined;
  if (daysUntilExpired != null) {
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
};
