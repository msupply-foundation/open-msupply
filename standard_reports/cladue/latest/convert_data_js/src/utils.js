// Helper function to calculate months of stock
function calculateMonthsOfStock(stockOnHand, averageMonthlyConsumption) {
  if (!averageMonthlyConsumption || averageMonthlyConsumption === 0) {
    return null;
  }
  return stockOnHand / averageMonthlyConsumption;
}

// Helper function to determine stock status
function getStockStatus(stockOnHand, monthsOfStock, lowThreshold, highThreshold) {
  if (stockOnHand <= 0) {
    return { class: 'none', text: 'No Stock' };
  }

  if (monthsOfStock === null || isNaN(monthsOfStock)) {
    return { class: 'none', text: 'N/A' };
  }

  if (monthsOfStock < lowThreshold) {
    return { class: 'low', text: 'Low' };
  }

  if (monthsOfStock > highThreshold) {
    return { class: 'high', text: 'High' };
  }

  return { class: 'ok', text: 'OK' };
}

// Export helpers
export { calculateMonthsOfStock, getStockStatus };
