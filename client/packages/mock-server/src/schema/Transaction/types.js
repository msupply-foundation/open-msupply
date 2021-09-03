export const TransactionTypes = `
    type Transaction {
        id: String
        date: String
        customer: String
        supplier: String
        total: String
    }
    type TransactionResponse { 
      data: [Transaction],
      totalLength: Int
    }
  `;
