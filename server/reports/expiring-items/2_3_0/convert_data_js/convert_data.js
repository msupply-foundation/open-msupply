// const { sql } = Host.getFunctions();
function convert_data() {
  let res = JSON.parse(Host.inputString());
  res.stockLines.nodes = processStockLines(res.stockLines.nodes);
  Host.outputString(JSON.stringify(resProcessed));
}

const processStockLines = (nodes) => {
    nodes.forEach((line) => {
        line.daysUntilExpired = calculateDaysUntilExpired(line.expiryDate);
        line.expectedUsage = addExpectedUsage(line);
        line.stockAtRisk = addStockAtRisk(line);
        line.daysUntilExpired = roundDaysToInteger(line.daysUntilExpired)
    });
    return nodes;
}

const calculateDaysUntilExpired = (expiryDateString) => {
    let daysUntilExpired = undefined;
    if (!!expiryDateString) {
        let now = Date.now();
        daysUntilExpired = (new Date(expiryDateString) - now) / 1000 / 60 / 60 / 24;
    } 
    return daysUntilExpired
}

const addExpectedUsage = (line) => {
    return undefined;
}

const addStockAtRisk = (line) => {
    return undefined;
}

const calculateStockAtRisk = (line) => {
    if (line.item.stats.averageMonthlyConsumption && !!line.expiryDate) {
        if (line.daysUntilExpired > 0) {
            line.expectedUsage = line.item.stats.averageMonthlyConsumption * (line.daysUntilExpired / 30);
            line.stockAtRisk = line.totalNumberOfPacks * line.packSize - line.expectedUsage;
        } else {
            line.stockAtRisk = line.totalNumberOfPacks * line.packSize;
        }
    }
    return line
}
const calculateStockAtRiskIfNoMonthlyConsumption = (line) => {        
    if (line && line.expiryDate && !line.item.stats.averageMonthlyConsumption) {
        if (line.daysUntilExpired && line.daysUntilExpired < 0) {
            line.stockAtRisk = line.totalNumberOfPacks * line.packSize;
        }
    } ;
    return line
}
const roundDaysToInteger = (daysUntilExpired) => {
    let rounded = undefined;
    if (!!daysUntilExpired) {
        rounded = Math.round(daysUntilExpired);
    }
    return rounded
}

module.exports = { convert_data, processStockLines, calculateDaysUntilExpired, calculateStockAtRisk, calculateStockAtRiskIfNoMonthlyConsumption, roundDaysToInteger };

