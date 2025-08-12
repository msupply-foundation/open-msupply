export type Input = {
  arguments: {
    otherPartyId?: string;
    before?: string;
    after?: string;
  };
  data?: {
    invoices?: InvoiceConnector;
  };
};

export interface InvoiceConnector {
  nodes: {
    id: string;
    otherPartyName?: string;
    lines: InvoiceLine;
  }[];
}

export interface InvoiceLine {
  nodes: {
    id: string;
    item: Item;
    batch: string | null;
    expiryDate: string | null;
    numberOfPacks: number;
    packSize: number;
    costPricePerPack: number;
    totalBeforeTax: number;
  }[];
}

export interface Item {
  id: string;
  code: string;
  name: string;
}

export type Output = {
  data: {
    id: string;
    otherPartyName?: string;
    itemCode: string;
    itemName: string;
    batch?: string | null;
    expiryDate?: string | null;
    packSize: number;
    numberOfPacks: number;
    numberOfUnits: number;
    costPricePerPack: number;
    totalCost: number | string;
  }[];
};
