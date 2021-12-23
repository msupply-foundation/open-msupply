CREATE TABLE stock_take_line (
    id TEXT NOT NULL PRIMARY KEY,
    stock_take_id TEXT NOT NULL REFERENCES stock_take(id),
    stock_line_id TEXT NOT NULL REFERENCES stock_line(id),
    location_id TEXT REFERENCES location(id),
    batch TEXT,
    comment	TEXT,
    cost_price_pack REAL NOT NULL,
    sell_price_pack REAL NOT NULL,
    snapshot_number_of_packs INTEGER NOT NULL,
    counted_number_of_packs INTEGER NOT NULL
)