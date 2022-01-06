CREATE TABLE stock_take_line (
    id TEXT NOT NULL PRIMARY KEY,
    stock_take_id TEXT NOT NULL REFERENCES stock_take(id),
    stock_line_id TEXT REFERENCES stock_line(id),
    location_id TEXT REFERENCES location(id),
    comment	TEXT,
    snapshot_number_of_packs INTEGER NOT NULL,
    counted_number_of_packs INTEGER,
    item_id TEXT REFERENCES item(id),
    batch TEXT,
    expiry_date DATE,
    pack_size INTEGER,
    cost_price_per_pack DOUBLE PRECISION,
    sell_price_per_pack DOUBLE PRECISION,
    note TEXT 
)
