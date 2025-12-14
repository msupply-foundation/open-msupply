import { InventoryAdjustmentsQuery } from "./generated-types/graphql";
import { Arguments } from "./generated-types/arguments";
import { InvoiceNodeType } from "../codegenTypes";

export type InvoiceNode = NonNullable<
  NonNullable<InventoryAdjustmentsQuery["invoices"]>["nodes"]
>[number];

export type InvoiceLineNode = NonNullable<
  NonNullable<InvoiceNode["lines"]>["nodes"]
>[number];

export type StocktakeNode = NonNullable<
  NonNullable<InventoryAdjustmentsQuery["stocktakes"]>["nodes"]
>[number];

export type StocktakeLineNode = NonNullable<
  NonNullable<StocktakeNode["lines"]>["nodes"]
>[number];

export type StocktakeLineWithDifferenceNode = StocktakeLineNode & {
  differenceNumberOfPacks: string;
};

export type AdjustmentLineNode = InvoiceLineNode & {
  invoiceId: string;
  invoiceType: InvoiceNodeType;
  verifiedDatetime: string | null;
  stocktakeId: string | null;
  isFromStocktake: boolean;
  snapshotPacks: number | null;
  countedPacks: number | null;
  adjustmentPacks: number | null;
};

export enum AdjustmentType {
  POSITIVE = "POSITIVE",
  NEGATIVE = "NEGATIVE",
}

export enum AdjustmentSource {
  FINALISED_STOCKTAKE = "FINALISED_STOCKTAKE",
  INVENTORY_ADJUSTMENT = "INVENTORY_ADJUSTMENT",
}

// Built own sort key type (but make sure to sync with arguments.json - Filter > sort type whenever changed)
export enum SortKey {
  ItemCode = "item.code",
  ItemName = "item.name",
  Batch = "batch",
  ExpiryDate = "expiryDate",
  LocationCode = "location.code",
  SnapshotNumberOfPacks = "snapshotNumberOfPacks",
  NumberOfPacks = "numberOfPacks",
  ReasonOptionReason = "inventoryAdjustmentReason.reason",
}
export type SortDirection = "asc" | "desc";

export type Data = InventoryAdjustmentsQuery;

export type Result = {
  data: {
    date: {
      from?: string | null;
      to?: string | null;
    };
    lines: AdjustmentLineNode[];
    store: InventoryAdjustmentsQuery["store"];
  };
};

export type ConvertData<D, A, R> = (input: { data: D; arguments: A }) => R;

export type { Arguments };
