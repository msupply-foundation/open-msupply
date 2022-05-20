CREATE TABLE stocktake_line (
    id TEXT NOT NULL PRIMARY KEY,
    stocktake_id TEXT NOT NULL REFERENCES stocktake(id),
    stock_line_id TEXT REFERENCES stock_line(id),
    location_id TEXT REFERENCES location(id),
    comment	TEXT,
    snapshot_number_of_packs INTEGER NOT NULL,
    counted_number_of_packs INTEGER,
    item_id TEXT NOT NULL REFERENCES item(id),
    batch TEXT,
    expiry_date DATE,
    pack_size INTEGER,
    cost_price_per_pack DOUBLE PRECISION,
    sell_price_per_pack DOUBLE PRECISION,
    note TEXT 
)
