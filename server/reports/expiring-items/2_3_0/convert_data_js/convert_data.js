// const { sql } = Host.getFunctions();
function convert_data() {
  const res = JSON.parse(Host.inputString());
  resProcessed = processStockLines(res);
  Host.outputString(JSON.stringify(resProcessed));
}

const processStockLines = (res) => {
    res.stockLines.nodes.forEach((line) => {
        line = addDaysUntilExpired(line);
        line = calculateStockAtRisk(line);
        line = calculateStockAtRiskIfNoMonthlyConsumption(line);
        line.daysUntilExpired = roundDaysToInteger(line.daysUntilExpired)
    });
    return res;
}

const addDaysUntilExpired = (line) => {
    if (line && line.expiryDate != undefined) {
        let now = Date.now();
        line.daysUntilExpired = (new Date(line.expiryDate) - now) / 1000 / 60 / 60 / 24;
    } 
    return line
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

module.exports = { convert_data, processStockLines, addDaysUntilExpired, calculateStockAtRisk, calculateStockAtRiskIfNoMonthlyConsumption, roundDaysToInteger };

