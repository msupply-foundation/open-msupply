import { calculateStockAtRisk } from "./convert_data";
import { processStockLines, addDaysUntilExpired } from "./convert_data";
import inputData from './input.json' assert { type: 'json' };
import outputData from './output.json' assert { type: 'json' };

const newExpiry = new Date(Date.now() + 25 * 24 * 60 * 60 * 1000);

// convert expiry date to be 25 days from now
inputData.stockLines.nodes.forEach((line) => {
  const year = newExpiry.getFullYear();
  const month = String(newExpiry.getMonth() + 1).padStart(2, '0');  
  const day = String(newExpiry.getDate()).padStart(2, '0');

  const formattedDate = `${year}-${month}-${day}`;
  line.expiryDate = formattedDate
})

describe('testProcessing', () => {
    it('test set up', () => {
      expect(true).toBe(true);
    });
    it('tests adding days until expired to line', () => {
      let line = inputData.stockLines.nodes[0];
      expect(Math.round(addDaysUntilExpired(line).daysUntilExpired)).toBe(25);
    })
    it('calculate stock at risk when monthly consumption provided and expiryDate > now', () => {
      let line = inputData.stockLines.nodes[0];
      line = addDaysUntilExpired(line);
      line = calculateStockAtRisk(line);
      expect(Math.round(line.stockAtRisk)).toBe(958);
      expect(Math.round(line.expectedUsage)).toBe(42);
      
      let line2 = inputData.stockLines.nodes[1];
      line2 = addDaysUntilExpired(line2);
      line2 = calculateStockAtRisk(line2);
      expect(Math.round(line2.stockAtRisk)).toBe(233);
      expect(Math.round(line2.expectedUsage)).toBe(17);
    })


})

