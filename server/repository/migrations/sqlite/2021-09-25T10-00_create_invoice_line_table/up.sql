CREATE TABLE invoice_line (
    id TEXT NOT NULL PRIMARY KEY,
    invoice_id TEXT NOT NULL REFERENCES invoice(id),
    item_id TEXT NOT NULL REFERENCES item(id),
    item_name TEXT NOT NULL,
    item_code TEXT NOT NULL,
    stock_line_id TEXT REFERENCES stock_line(id),
    location_id TEXT REFERENCES location(id),
    batch TEXT,
    expiry_date TEXT,
    cost_price_per_pack REAL NOT NULL,
    -- sell price without tax
    sell_price_per_pack REAL NOT NULL,
    total_before_tax REAL NOT NULL,
    total_after_tax REAL NOT NULL,
    tax REAL,
    type TEXT CHECK (type IN ('STOCK_IN', 'STOCK_OUT', 'UNALLOCATED_STOCK', 'SERVICE')) NOT NULL,
    number_of_packs INTEGER NOT NULL,
    pack_size INTEGER NOT NULL,
    note TEXT
);

