// common.typ — Shared utilities for open-msupply Typst reports

// --- Helper functions ---

/// Format a datetime string (ISO 8601) as dd/mm/yyyy, or "N/A" if empty/none
#let fmt-date(dt) = {
  if dt == none or dt == "" { "N/A" }
  else {
    let d = str(dt)
    if d.len() >= 10 {
      d.slice(8, 10) + "/" + d.slice(5, 7) + "/" + d.slice(0, 4)
    } else { d }
  }
}

/// Format a number with rounding, or "0" if none/zero
#let fmt-num(n, digits: 2) = {
  if n == none or n == 0 { "0" }
  else { str(calc.round(n, digits: digits)) }
}

// --- Page setup ---

/// Standard page footer with page numbers
#let page-footer() = [
  #set text(8pt, fill: rgb("#888"))
  #h(1fr)
  Page #context counter(page).display("1 / 1", both: true)
  #h(1fr)
]

// --- HTML styling ---

/// Standard HTML stylesheet for report pages (ignored in PDF mode)
#let html-styles(max-width: "960px") = {
  html.elem("style", "
    body { font-family: -apple-system, system-ui, 'Segoe UI', sans-serif; color: #333; max-width: " + max-width + "; margin: 0 auto; padding: 24px; }
    h2 { font-size: 22px; margin: 0 0 16px; }
    p { margin: 2px 0; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; }
    /* Layout tables (no thead) — minimal styling */
    table td { padding: 2px 0; font-size: 13px; vertical-align: top; }
    table:not(:has(thead)) td:last-child { text-align: right; }
    /* First layout table is the title row — make it big */
    table:first-of-type td { font-size: 22px; font-weight: bold; }
    /* Data tables (with thead) — full styling */
    table:has(thead) { margin-top: 12px; }
    thead th { background: #f0f0f0; text-align: left; padding: 6px 8px; font-size: 12px; font-weight: 600; border-bottom: 2px solid #333; }
    table:has(thead) tbody td { padding: 5px 8px; font-size: 12px; border-bottom: 1px solid #f0f0f0; }
    table:has(thead) tbody tr:nth-child(odd) { background: #fafafa; }
    hr { border: none; border-top: 1px solid #ccc; margin: 12px 0; }
    @media print { body { max-width: none; padding: 0; } }
  ")
}

// --- Table defaults ---

/// Standard table fill pattern: header grey, alternating rows
#let table-fill(col, row) = {
  if row == 0 { rgb("#f0f0f0") }
  else if calc.odd(row) { rgb("#fafafa") }
  else { white }
}
