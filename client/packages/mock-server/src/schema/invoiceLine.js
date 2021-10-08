const Types = `
    type InvoiceLine {
      id: String 
      itemName: String 
      itemCode: String
      stockLine: StockLine 
      item: Item
      quantity: Int
      batchName: String
      expiry: String
    }
  `;

export const InvoiceLine = { Types };
