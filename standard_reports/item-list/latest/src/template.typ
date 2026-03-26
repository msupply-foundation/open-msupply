// Test data — replaced with real data at report generation time
#let report_data = (
  data: (
    items: (
      nodes: (
        (code: "ABC001", name: "Acetylsalicylic Acid 100mg tabs", venCategory: "V", locationName: "Shelf A1", SOH: 1250.0, categoryName: "Analgesics"),
        (code: "IBU200", name: "Ibuprofen 200mg tablets", venCategory: "E", locationName: "Shelf A2", SOH: 830.0, categoryName: "Analgesics"),
        (code: "PAR500", name: "Paracetamol 500mg tablets", venCategory: "V", locationName: "Shelf A3", SOH: 0.0, categoryName: "Analgesics"),
        (code: "AMX250", name: "Amoxicillin 250mg capsules", venCategory: "V", locationName: "Shelf B1", SOH: 450.0, categoryName: "Antibiotics"),
        (code: "AMX500", name: "Amoxicillin 500mg capsules", venCategory: "V", locationName: "Shelf B1", SOH: 920.0, categoryName: "Antibiotics"),
        (code: "AZI250", name: "Azithromycin 250mg tablets", venCategory: "E", locationName: "Shelf B2", SOH: 310.0, categoryName: "Antibiotics"),
        (code: "CIP500", name: "Ciprofloxacin 500mg tablets", venCategory: "E", locationName: "Shelf B3", SOH: 0.0, categoryName: "Antibiotics"),
        (code: "DOX100", name: "Doxycycline 100mg capsules", venCategory: "N", locationName: "Shelf B4", SOH: 175.0, categoryName: "Antibiotics"),
        (code: "MET500", name: "Metformin 500mg tablets", venCategory: "V", locationName: "Shelf C1", SOH: 2100.0, categoryName: "Antidiabetics"),
        (code: "GLI5MG", name: "Glibenclamide 5mg tablets", venCategory: "E", locationName: "Shelf C1", SOH: 560.0, categoryName: "Antidiabetics"),
        (code: "INS100", name: "Insulin Soluble 100 IU/ml", venCategory: "V", locationName: "Cold Room", SOH: 88.0, categoryName: "Antidiabetics"),
        (code: "ORS001", name: "Oral Rehydration Salts", venCategory: "V", locationName: "", SOH: 340.0, categoryName: "Electrolytes"),
        (code: "ZNC20", name: "Zinc Sulfate 20mg dispersible tabs", venCategory: "E", locationName: "Shelf D1", SOH: 1500.0, categoryName: "Electrolytes"),
        (code: "FER200", name: "Ferrous Sulfate 200mg tablets", venCategory: "E", locationName: "Shelf D2", SOH: 0.0, categoryName: "Vitamins & Minerals"),
        (code: "FOL5MG", name: "Folic Acid 5mg tablets", venCategory: "E", locationName: "Shelf D2", SOH: 2400.0, categoryName: "Vitamins & Minerals"),
        (code: "VITA50", name: "Vitamin A 50000 IU capsules", venCategory: "V", locationName: "Shelf D3", SOH: 800.0, categoryName: "Vitamins & Minerals"),
      ),
    ),
  ),
)

#import "/standard_reports/common.typ": *

// --- Page setup (PDF only, ignored in HTML) ---
#set page(
  paper: "a4",
  margin: (top: 2.5cm, bottom: 2cm, left: 1.5cm, right: 1.5cm),
  header: context {
    if counter(page).get().first() > 1 [
      #set text(8pt, fill: rgb("#888"))
      Item List Report
      #h(1fr)
      #datetime.today().display("[day] [month repr:long] [year]")
    ]
  },
  footer: page-footer(),
)

#set text(font: "New Computer Modern", size: 9pt, fill: rgb("#333"))

// --- HTML styling (ignored in PDF mode) ---
#html-styles()

// --- Data ---
#let items = report_data.data.items.nodes

// --- Title ---
= Item List

Showing *#items.len()* items

#v(0.3cm)

// --- Table ---
#set table(
  stroke: none,
  inset: (x: 4pt, y: 4pt),
  align: left,
)

#table(
  columns: (auto, 1fr, auto, auto, 1fr),
  fill: table-fill,

  table.header(
    [*Code*], [*Item name*], [*Location*], [*SOH*], [*Category*],
  ),

  // Data rows
  ..items.map(item => (
    [#item.code],
    [#item.name],
    [#item.locationName],
    [#str(calc.round(item.SOH, digits: 1))],
    [#item.categoryName],
  )).flatten(),
)
