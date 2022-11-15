CREATE TABLE location_movement (
    id TEXT NOT NULL PRIMARY KEY,
    store_id TEXT REFERENCES store(id),
    location_id TEXT REFERENCES location(id),
    stock_line_id TEXT REFERENCES stock_line(id),
    enter_datetime TIMESTAMP,
    exit_datetime TIMESTAMP
)