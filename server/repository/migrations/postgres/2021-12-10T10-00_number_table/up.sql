CREATE TYPE number_type AS ENUM (
  'INBOUND_SHIPMENT',
  'OUTBOUND_SHIPMENT',
  'INVENTORY_ADJUSTMENT',
  'STOCKTAKE',
  'REQUEST_REQUISITION',
  'RESPONSE_REQUISITION'
);

-- Numbering table holding a list of typed counters
CREATE TABLE number (
    id TEXT NOT NULL PRIMARY KEY,
    -- current counter value
    value BIGINT NOT NULL,
    store_id TEXT NOT NULL REFERENCES store(id),
    type TEXT NOT NULL
  );

CREATE UNIQUE INDEX ix_number_store_type_unique ON number(store_id, type);