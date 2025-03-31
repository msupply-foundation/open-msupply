function convert_data(res) {
  // Make a deep copy of the original response to avoid mutation issues
  const result = { ...res };
  const { data, arguments: args } = result;

  // Default values for arguments if not provided
  const lowStockThreshold = args.lowStockThreshold || 3.0;
  const highStockThreshold = args.highStockThreshold || 6.0;

  // Initialize the items array
  let processedItems = [];

  // Safely process the items
  if (data && data.items && data.items.nodes && Array.isArray(data.items.nodes)) {
    processedItems = data.items.nodes.map((item) => {
      // Extract and default stats values to prevent undefined
      const stats = item.stats || {};
      const stockOnHand = typeof stats.stockOnHand === 'number' ? stats.stockOnHand : 0;
      const availableStockOnHand =
        typeof stats.availableStockOnHand === 'number' ? stats.availableStockOnHand : 0;
      const averageMonthlyConsumption =
        typeof stats.averageMonthlyConsumption === 'number' ? stats.averageMonthlyConsumption : 0;
      const monthsOfStock =
        typeof stats.monthsOfStockOnHand === 'number' ? stats.monthsOfStockOnHand : null;

      // Calculate stock status
      let stockStatusClass = 'none';
      let stockStatusText = 'No Stock';

      if (stockOnHand > 0) {
        if (monthsOfStock === null) {
          stockStatusClass = 'none';
          stockStatusText = 'N/A';
        } else if (monthsOfStock < lowStockThreshold) {
          stockStatusClass = 'low';
          stockStatusText = 'Low';
        } else if (monthsOfStock > highStockThreshold) {
          stockStatusClass = 'high';
          stockStatusText = 'High';
        } else {
          stockStatusClass = 'ok';
          stockStatusText = 'OK';
        }
      }

      // Process batches
      const availableBatches = item.availableBatches || {};
      const batchNodes = availableBatches.nodes || [];

      // Create an object for batches instead of an array
      const batchData = {
        count: 0,
        items: [],
      };

      // Process each batch and add to the items array
      if (Array.isArray(batchNodes)) {
        batchNodes.forEach((batch) => {
          const packSize = typeof batch.packSize === 'number' ? batch.packSize : 0;
          const totalNumberOfPacks =
            typeof batch.totalNumberOfPacks === 'number' ? batch.totalNumberOfPacks : 0;

          batchData.items.push({
            id: batch.id || '',
            batch: batch.batch || '',
            expiryDate: batch.expiryDate || null,
            locationCode: batch.location && batch.location.code ? batch.location.code : '',
            onHold: !!batch.onHold, // Ensure boolean
            packSize,
            totalNumberOfPacks,
            totalQuantity: packSize * totalNumberOfPacks,
          });
        });

        batchData.count = batchData.items.length;
      }

      // Return a processed item with all necessary fields
      return {
        id: item.id || '',
        code: item.code || '',
        name: item.name || '',
        unitName: item.unitName || '',
        type: item.type || '',
        isVaccine: !!item.isVaccine,
        stats: {
          stockOnHand,
          availableStockOnHand,
          averageMonthlyConsumption,
          monthsOfStockOnHand: monthsOfStock,
        },
        stockStatusClass,
        stockStatusText,
        batchData, // Use the object structure for batches
      };
    });
  }

  // Sort items based on arguments
  if (args.sort) {
    const sortDirection = args.dir === 'desc' ? -1 : 1;

    processedItems.sort((a, b) => {
      let valueA, valueB;

      switch (args.sort) {
        case 'name':
          valueA = (a.name || '').toLowerCase();
          valueB = (b.name || '').toLowerCase();
          return sortDirection * valueA.localeCompare(valueB);

        case 'code':
          valueA = (a.code || '').toLowerCase();
          valueB = (b.code || '').toLowerCase();
          return sortDirection * valueA.localeCompare(valueB);

        case 'availableStockOnHand':
          valueA =
            a.stats && typeof a.stats.availableStockOnHand === 'number'
              ? a.stats.availableStockOnHand
              : 0;
          valueB =
            b.stats && typeof b.stats.availableStockOnHand === 'number'
              ? b.stats.availableStockOnHand
              : 0;
          return sortDirection * (valueA - valueB);

        case 'monthsOfStock':
          valueA =
            a.stats && typeof a.stats.monthsOfStockOnHand === 'number'
              ? a.stats.monthsOfStockOnHand
              : 0;
          valueB =
            b.stats && typeof b.stats.monthsOfStockOnHand === 'number'
              ? b.stats.monthsOfStockOnHand
              : 0;
          return sortDirection * (valueA - valueB);

        default:
          return 0;
      }
    });
  }

  // Calculate summary statistics
  const summaryStats = {
    totalItems: processedItems.length,
    itemsWithStock: processedItems.filter((item) => item.stats.stockOnHand > 0).length,
    itemsNoStock: processedItems.filter((item) => item.stats.stockOnHand <= 0).length,
    itemsLowStock: processedItems.filter(
      (item) =>
        item.stats.stockOnHand > 0 &&
        item.stats.monthsOfStockOnHand !== null &&
        item.stats.monthsOfStockOnHand < lowStockThreshold
    ).length,
    itemsHighStock: processedItems.filter(
      (item) =>
        item.stats.stockOnHand > 0 &&
        item.stats.monthsOfStockOnHand !== null &&
        item.stats.monthsOfStockOnHand > highStockThreshold
    ).length,
  };

  // Create a clean data structure for the template
  return {
    data: {
      items: processedItems,
      summaryStats,
    },
    arguments: args,
  };
}

export { convert_data };
