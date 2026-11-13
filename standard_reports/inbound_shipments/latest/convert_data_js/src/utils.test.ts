import { processInvoiceLines } from "./utils";
import { InvoiceConnector } from "./types";

type Invoice = InvoiceConnector["nodes"][number];
type InvoiceLine = Invoice["lines"]["nodes"][number];

const createLine = (overrides: Partial<InvoiceLine> = {}): InvoiceLine =>
  ({
    id: "line-1",
    item: { id: "item-1", code: "ABC123", name: "Paracetamol 500mg" },
    batch: "B1",
    expiryDate: "2027-01-01",
    numberOfPacks: 10,
    packSize: 2,
    costPricePerPack: 1.5,
    ...overrides,
  }) as InvoiceLine;

const createInvoice = (
  overrides: Partial<Invoice> = {},
  lines: InvoiceLine[] = [createLine()]
): Invoice => ({
  id: "invoice-1",
  otherPartyName: "Supplier A",
  invoiceNumber: 1,
  receivedDatetime: "2024-03-14T10:00:00",
  lines: { nodes: lines },
  ...overrides,
});

describe("processInvoiceLines", () => {
  it("returns no data when there are no invoices", () => {
    expect(processInvoiceLines(undefined)).toEqual({ data: undefined });
  });

  it("copies the invoice number and received date onto every line", () => {
    const { data } = processInvoiceLines({
      nodes: [
        createInvoice({ invoiceNumber: 7 }, [
          createLine({ id: "a" }),
          createLine({
            id: "b",
            item: { id: "item-2", code: "XYZ", name: "Amoxicillin" },
          }),
        ]),
      ],
    });

    expect(
      data?.lines.map((l) => [l.invoiceNumber, l.receivedDatetime])
    ).toEqual([
      [7, "2024-03-14T10:00:00"],
      [7, "2024-03-14T10:00:00"],
    ]);
  });

  it("passes a null received date through", () => {
    const { data } = processInvoiceLines({
      nodes: [createInvoice({ receivedDatetime: null })],
    });

    expect(data?.lines[0].receivedDatetime).toBeNull();
  });

  it("orders an item/supplier group by date and puts the total on its last row", () => {
    const { data } = processInvoiceLines({
      nodes: [
        createInvoice(
          { id: "i1", invoiceNumber: 1, receivedDatetime: "2024-03-14T10:00:00" },
          [createLine({ id: "march" })]
        ),
        createInvoice(
          { id: "i2", invoiceNumber: 2, receivedDatetime: "2024-01-02T10:00:00" },
          [createLine({ id: "january-2" })]
        ),
        createInvoice(
          { id: "i3", invoiceNumber: 3, receivedDatetime: "2024-01-02T10:00:00" },
          [createLine({ id: "january-3" })]
        ),
        createInvoice(
          { id: "i4", invoiceNumber: 4, otherPartyName: "Supplier B" },
          [createLine({ id: "other-supplier", numberOfPacks: 4 })]
        ),
      ],
    });

    expect(data?.lines.map((l) => [l.id, l.totalCost])).toEqual([
      ["january-2", "-"],
      ["january-3", "-"],
      ["march", "45.00"],
      ["other-supplier", "6.00"],
    ]);
  });
});
