CREATE TABLE invoice_line (
    id text NOT NULL PRIMARY KEY,
    invoice_id text NOT NULL REFERENCES invoice (id),
    item_id text NOT NULL REFERENCES item (id),
    item_name text NOT NULL,
    item_code text NOT NULL,
    stock_line_id text REFERENCES stock_line (id),
    batch text,
    expiry_date date,
    cost_price_per_pack double precision NOT NULL,
    sell_price_per_pack double precision NOT NULL,
    total_after_tax double precision NOT NULL,
    number_of_packs integer NOT NULL,
    pack_size integer NOT NULL
);

