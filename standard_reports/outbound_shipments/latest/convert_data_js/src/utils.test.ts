import { processInvoiceLines } from "./utils";
import { InvoiceConnector } from "./types";

type Invoice = InvoiceConnector["nodes"][number];
type InvoiceLine = Invoice["lines"]["nodes"][number];

const createLine = (overrides: Partial<InvoiceLine> = {}): InvoiceLine => ({
  id: "line-1",
  item: { id: "item-1", code: "ABC123", name: "Paracetamol 500mg" },
  batch: "B1",
  expiryDate: "2027-01-01",
  numberOfPacks: 10,
  packSize: 2,
  costPricePerPack: 1.5,
  totalBeforeTax: 15,
  ...overrides,
});

const createInvoice = (
  overrides: Partial<Invoice> = {},
  lines: InvoiceLine[] = [createLine()]
): Invoice => ({
  id: "invoice-1",
  otherPartyName: "Clinic A",
  invoiceNumber: 1,
  shippedDatetime: "2024-03-14T10:00:00",
  lines: { nodes: lines },
  ...overrides,
});

describe("processInvoiceLines", () => {
  it("returns no data when there are no invoices", () => {
    expect(processInvoiceLines(undefined)).toEqual({ data: undefined });
  });

  it("copies the invoice number and shipped date onto every line", () => {
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

    expect(data?.lines.map((l) => [l.invoiceNumber, l.shippedDatetime])).toEqual(
      [
        [7, "2024-03-14T10:00:00"],
        [7, "2024-03-14T10:00:00"],
      ]
    );
  });

  it("passes a null shipped date through", () => {
    const { data } = processInvoiceLines({
      nodes: [createInvoice({ shippedDatetime: null })],
    });

    expect(data?.lines[0].shippedDatetime).toBeNull();
  });

  it("orders an item/customer group by date and puts the total on its last row", () => {
    const { data } = processInvoiceLines({
      nodes: [
        createInvoice(
          { id: "i1", invoiceNumber: 1, shippedDatetime: "2024-03-14T10:00:00" },
          [createLine({ id: "march" })]
        ),
        createInvoice({ id: "i2", invoiceNumber: 2, shippedDatetime: null }, [
          createLine({ id: "unshipped" }),
        ]),
        createInvoice(
          { id: "i3", invoiceNumber: 3, shippedDatetime: "2024-01-02T10:00:00" },
          [createLine({ id: "january" })]
        ),
        createInvoice(
          { id: "i4", invoiceNumber: 4, otherPartyName: "Clinic B" },
          [createLine({ id: "other-customer", numberOfPacks: 4 })]
        ),
      ],
    });

    expect(data?.lines.map((l) => [l.id, l.totalCost])).toEqual([
      ["january", "-"],
      ["march", "-"],
      ["unshipped", "45.00"],
      ["other-customer", "6.00"],
    ]);
  });
});
