// Test data — replaced with real data at report generation time
#let report_data = (
  data: (
    store: (
      storeName: "Store A - Site 2",
      logo: none,
      name: (
        address1: "123 Main Street",
        address2: "District 4",
        phone: "+1 234 567 890",
        email: "store@example.com",
      ),
    ),
    invoice: (
      invoiceNumber: 45,
      otherPartyName: "Apple Orchid Suppliers",
      otherParty: (
        code: "AOS",
        address1: "456 Supplier Road",
        address2: "",
      ),
      theirReference: "PO#4-A",
      createdDatetime: "2024-01-15T00:00:00Z",
      deliveredDatetime: "2024-01-16T00:00:00Z",
      shippedDatetime: none,
      purchaseOrder: none,
      user: (username: "Admin"),
      pricing: (
        totalBeforeTax: 8,
        taxPercentage: 0,
        totalAfterTax: 8,
      ),
    ),
    invoiceLines: (
      nodes: (
        (itemCode: "ACE100", itemName: "Acetylsalicylic Acid 200mg tabs", location: (code: ""), numberOfPacks: 1, packSize: 1, batch: "", expiryDate: none, costPricePerPack: 2),
        (itemCode: "047086", itemName: "Benzyl penicillin Injection 1000000 unit", location: (code: ""), numberOfPacks: 100, packSize: 1, batch: "SB_QA018", expiryDate: none, costPricePerPack: 0),
        (itemCode: "AZI250", itemName: "Azithromycin 250mg", location: (code: ""), numberOfPacks: 5, packSize: 1, batch: "", expiryDate: none, costPricePerPack: 3),
        (itemCode: "GPN1", itemName: "GPN1", location: (code: ""), numberOfPacks: 1, packSize: 1, batch: "", expiryDate: none, costPricePerPack: 0),
        (itemCode: "COT960", itemName: "Cotrimoxazole syrup 5ml", location: (code: ""), numberOfPacks: 1, packSize: 1, batch: "", expiryDate: none, costPricePerPack: 3),
      ),
    ),
  ),
  arguments: (timezone: "UTC"),
)

// --- Helpers ---
#let fmt-date(dt) = {
  if dt == none or dt == "" { "N/A" }
  else {
    let d = str(dt)
    if d.len() >= 10 {
      d.slice(8, 10) + "/" + d.slice(5, 7) + "/" + d.slice(0, 4)
    } else { d }
  }
}

#let fmt-num(n, digits: 2) = {
  if n == none or n == 0 { "0" }
  else { str(calc.round(n, digits: digits)) }
}

// --- Data ---
#let store = report_data.data.store
#let inv = report_data.data.invoice
#let lines = report_data.data.invoiceLines.nodes

// --- Page setup ---
#set page(
  paper: "a4",
  flipped: true,
  margin: (top: 1cm, bottom: 1cm, left: 1.5cm, right: 1.5cm),
  footer: [
    #set text(8pt, fill: rgb("#888"))
    #h(1fr)
    Page #context counter(page).display("1 / 1", both: true)
    #h(1fr)
  ],
)

#set text(font: "New Computer Modern", size: 9pt, fill: rgb("#333"))

// ============================================================
// HEADER
// ============================================================

// Store name + title row
#grid(
  columns: (1fr, 1fr),
  align: (left, right),
  [
    #text(12pt, weight: "bold")[#store.storeName]
    // #v(2pt)
    // #text(9pt)[#store.name.address1] \
    // #text(9pt)[#store.name.address2] \
    // #text(7pt)[Telephone: #store.name.phone] \
    // #text(7pt)[Email: #store.name.email]
  ],
  [
    #text(22pt, weight: "bold")[Inbound Shipment Form]
  ],
)

#v(0.4cm)

// Supplier info + invoice details
#grid(
  columns: (1fr, 1fr),
  align: (left, right),
  [
    #text(weight: "bold", size: 8pt)[Received from:] \
    #text(9pt)[#inv.otherPartyName] \
    #text(9pt)[#inv.otherParty.code]
    #{
      if inv.otherParty.address1 != none and inv.otherParty.address1 != "" [
        \ #text(9pt)[#inv.otherParty.address1]
      ]
    }
  ],
  [
    #set text(9pt)
    Number: #str(inv.invoiceNumber) \
    Printed date: #fmt-date(datetime.today().display("[year]-[month]-[day]")) \
    Their ref: #{if inv.theirReference != none and inv.theirReference != "" { inv.theirReference } else { "N/A" }} \
    Confirmed date: #fmt-date(inv.deliveredDatetime)
    #{
      if inv.purchaseOrder != none [
        \ Purchase Order: #str(inv.purchaseOrder.number)
      ]
    }
  ],
)

#v(0.2cm)

// Entered by / dates row
#grid(
  columns: (1fr, 1fr),
  align: (left, right),
  [
    #text(9pt)[Entered by: #inv.user.username] \
    #text(9pt)[Created date: #fmt-date(inv.createdDatetime)]
  ],
  [
    #text(9pt)[Shipped date: #fmt-date(inv.shippedDatetime)]
  ],
)

#v(0.3cm)
#line(length: 100%, stroke: 0.5pt + rgb("#ccc"))
#v(0.2cm)

// ============================================================
// LINE ITEMS TABLE
// ============================================================

#set table(
  stroke: none,
  inset: (x: 4pt, y: 4pt),
)

#table(
  columns: (40pt, 50pt, 1fr, 55pt, 50pt, 50pt, 0.5fr, 50pt, 55pt, 55pt, 45pt),
  fill: (_, row) => if row == 0 { rgb("#f0f0f0") } else if calc.odd(row) { rgb("#fafafa") } else { white },

  // Header
  table.cell(align: left)[#text(weight: "bold", size: 8pt)[Location]],
  table.cell(align: left)[#text(weight: "bold", size: 8pt)[Item code]],
  table.cell(align: left)[#text(weight: "bold", size: 8pt)[Item name]],
  table.cell(align: right)[#text(weight: "bold", size: 8pt)[Quantity]],
  table.cell(align: right)[#text(weight: "bold", size: 8pt)[Pack size]],
  table.cell(align: right)[#text(weight: "bold", size: 8pt)[Unit Qty]],
  table.cell(align: left)[#text(weight: "bold", size: 8pt)[Batch]],
  table.cell(align: left)[#text(weight: "bold", size: 8pt)[Expiry]],
  table.cell(align: right)[#text(weight: "bold", size: 8pt)[Cost price per pack]],
  table.cell(align: right)[#text(weight: "bold", size: 8pt)[Cost per unit]],
  table.cell(align: right)[#text(weight: "bold", size: 8pt)[Line total]],

  table.hline(stroke: 1.5pt + rgb("#333")),

  // Data rows
  ..lines.map(line => {
    let loc = if line.location != none and line.location.code != none and line.location.code != "" { line.location.code } else { "" }
    let qty = if line.numberOfPacks != none { line.numberOfPacks } else { 0 }
    let ps = if line.packSize != none { line.packSize } else { 1 }
    let unit-qty = qty * ps
    let cost = if line.costPricePerPack != none { line.costPricePerPack } else { 0 }
    let cost-per-unit = if ps > 0 { calc.round(cost / ps, digits: 2) } else { 0 }
    let line-total = qty * cost

    (
      text(size: 8pt)[#loc],
      text(size: 8pt)[#line.itemCode],
      text(size: 8pt)[#line.itemName],
      align(right, text(size: 8pt)[#str(qty)]),
      align(right, text(size: 8pt)[#str(ps)]),
      align(right, text(size: 8pt)[#str(unit-qty)]),
      text(size: 8pt)[#{if line.batch != none { line.batch } else { "" }}],
      text(size: 8pt)[#fmt-date(line.expiryDate)],
      align(right, text(size: 8pt)[#fmt-num(cost)]),
      align(right, text(size: 8pt)[#fmt-num(cost-per-unit)]),
      align(right, text(size: 8pt)[#fmt-num(line-total)]),
    )
  }).flatten(),
)

// ============================================================
// TOTALS
// ============================================================

#v(0.2cm)
#align(right)[
  #set text(9pt)
  #grid(
    columns: (auto, 60pt),
    column-gutter: 8pt,
    row-gutter: 4pt,
    align: (right, right),
    [*Sub total:*], [#fmt-num(inv.pricing.totalBeforeTax)],
    [*Tax:*], [#fmt-num(inv.pricing.taxPercentage)],
    [*Total:*], [#fmt-num(inv.pricing.totalAfterTax)],
  )
]
