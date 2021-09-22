CREATE TABLE invoice_line (
    id TEXT NOT NULL PRIMARY KEY,
    invoice_id TEXT NOT NULL REFERENCES invoice(id),
    item_id TEXT NOT NULL REFERENCES item(id),
    stock_line_id TEXT REFERENCES stock_line(id),
    batch TEXT,
    expiry_date TEXT,
    cost_price_per_pack DECIMAL NOT NULL,
    sell_price_per_pack DECIMAL NOT NULL,
    total_after_tax DECIMAL NOT NULL,
    available_number_of_packs INTEGER NOT NULL,
    total_number_of_packs INTEGER NOT NULL,
    pack_size INTEGER NOT NULL
);

CREATE VIEW invoice_line_stats AS
    SELECT invoice.id as invoice_id, SUM(invoice_line.total_after_tax) as total_after_tax FROM invoice
    LEFT JOIN invoice_line ON (invoice_line.invoice_id = invoice.id)
    GROUP BY invoice.id;
