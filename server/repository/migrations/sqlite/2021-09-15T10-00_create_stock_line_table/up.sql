CREATE TABLE stock_line (
    id TEXT NOT NULL PRIMARY KEY,
    item_id TEXT NOT NULL REFERENCES item(id),
    store_id TEXT NOT NULL REFERENCES store(id),
    location_id TEXT REFERENCES location(id),
    batch TEXT,
    expiry_date TEXT,
    cost_price_per_pack REAL NOT NULL,
    sell_price_per_pack REAL NOT NULL,
    available_number_of_packs INTEGER NOT NULL,
    total_number_of_packs INTEGER NOT NULL,
    pack_size INTEGER NOT NULL,
    on_hold BOOLEAN NOT NULL,
    note TEXT
)
