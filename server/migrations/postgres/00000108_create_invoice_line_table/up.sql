CREATE TABLE invoice_line (
    id TEXT NOT NULL PRIMARY KEY,
    invoice_id TEXT NOT NULL REFERENCES invoice(id),
    item_id TEXT NOT NULL REFERENCES item(id),
    item_name TEXT NOT NULL,
    item_code TEXT NOT NULL,
    stock_line_id TEXT REFERENCES stock_line(id),
    batch TEXT,
    expiry_date DATE,
    cost_price_per_pack DOUBLE PRECISION NOT NULL,
    sell_price_per_pack DOUBLE PRECISION NOT NULL,
    total_after_tax DOUBLE PRECISION NOT NULL,
    number_of_packs INTEGER NOT NULL,
    pack_size INTEGER NOT NULL
);

