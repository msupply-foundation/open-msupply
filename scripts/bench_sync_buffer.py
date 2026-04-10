import json

# ─── Mock data ───────────────────────────────────────────────────────────────
MOCK_TABLE_NAMES = [
    "name", "store", "transact", "trans_line", "item",
    "item_line", "list_master", "list_master_line", "unit", "stocktake",
]


def mock_trans_line_json(record_id: str) -> str:
    return json.dumps({
        "ID": record_id, "Weight": 0, "barcodeID": "",
        "batch": "batch_abc_123", "box_number": "", "cost_price": 10.5,
        "custom_data": None, "expiry_date": "2026-06-30",
        "foreign_currency_price": 0, "goods_received_lines_ID": "",
        "isVVMPassed": "", "is_from_inventory_adjustment": False,
        "item_ID": f"item_{record_id}", "item_line_ID": f"item_line_{record_id}",
        "item_name": "Amoxicillin 250mg Caps", "line_number": 1,
        "linked_trans_line_ID": "", "linked_transact_id": "",
        "local_charge_line_total": 0, "location_ID": "", "manufacturer_ID": "",
        "medicine_administrator_ID": "", "note": "standard supply for facility",
        "optionID": "", "order_lines_ID": "", "pack_inners_in_outer": 0,
        "pack_size": 100, "pack_size_inner": 0, "prescribedQuantity": 0,
        "price_extension": 105.0, "quantity": 10, "repeat_ID": "",
        "sell_price": 12.5, "sentQuantity": 0, "sent_pack_size": 100,
        "source_backorder_id": "", "spare": 0, "supp_trans_line_ID_ns": "",
        "transaction_ID": f"trans_{record_id}", "type": "stock_in",
        "user_1": "", "user_2": "", "user_3": "", "user_4": "",
        "user_5_ID": "", "user_6_ID": "", "user_7_ID": "", "user_8_ID": "",
        "vaccine_vial_monitor_status_ID": "", "volume_per_pack": 10,
        "om_item_variant_id": "", "donor_id": "", "oms_fields": "",
    }, separators=(",", ": "))

# ─── Schema ──────────────────────────────────────────────────────────────────
SCHEMA_ENUM = """\
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sync_action') THEN
        CREATE TYPE sync_action AS ENUM ('UPSERT', 'DELETE', 'MERGE');
    END IF;
END $$
"""

SCHEMA_STANDARD = """\
CREATE TABLE IF NOT EXISTS sync_buffer (
    record_id            TEXT NOT NULL PRIMARY KEY,
    received_datetime    TIMESTAMP NOT NULL,
    integration_datetime TIMESTAMP,
    integration_error    TEXT,
    table_name           TEXT NOT NULL,
    action               sync_action NOT NULL,
    data                 TEXT NOT NULL,
    source_site_id       INTEGER
);
CREATE INDEX IF NOT EXISTS index_sync_buffer_action
    ON sync_buffer (action);
CREATE INDEX IF NOT EXISTS index_sync_buffer_combined_index
    ON sync_buffer (action, table_name, integration_datetime, source_site_id);
CREATE INDEX IF NOT EXISTS index_sync_buffer_integration_datetime
    ON sync_buffer (integration_datetime);
CREATE INDEX IF NOT EXISTS index_sync_buffer_integration_error
    ON sync_buffer (integration_error)
"""

SCHEMA_PARTITIONED = """\
DROP TABLE IF EXISTS sync_buffer_pt CASCADE;
CREATE TABLE sync_buffer_pt (
    record_id            TEXT NOT NULL,
    received_datetime    TIMESTAMP NOT NULL,
    is_integrated        BOOLEAN NOT NULL DEFAULT FALSE,
    integration_datetime TIMESTAMP,
    integration_error    TEXT,
    table_name           TEXT NOT NULL,
    action               sync_action NOT NULL,
    data                 TEXT NOT NULL,
    source_site_id       INTEGER,
    PRIMARY KEY (record_id, is_integrated)
) PARTITION BY LIST (is_integrated);
CREATE TABLE sync_buffer_pt_pending PARTITION OF sync_buffer_pt FOR VALUES IN (FALSE);
CREATE TABLE sync_buffer_pt_done    PARTITION OF sync_buffer_pt FOR VALUES IN (TRUE);
CREATE INDEX idx_pt_pending_combined
    ON sync_buffer_pt_pending (action, table_name, source_site_id);
CREATE INDEX idx_pt_done_combined
    ON sync_buffer_pt_done (action, table_name, integration_datetime, source_site_id)
"""

UPSERT_STD = (
    "INSERT INTO sync_buffer "
    "(record_id, received_datetime, integration_datetime, integration_error, "
    "table_name, action, data, source_site_id) "
    "VALUES (%s, '2025-06-01', NULL, NULL, %s, 'UPSERT', %s, %s) "
    "ON CONFLICT (record_id) DO UPDATE SET "
    "received_datetime=EXCLUDED.received_datetime, "
    "integration_datetime=EXCLUDED.integration_datetime, "
    "integration_error=EXCLUDED.integration_error, "
    "table_name=EXCLUDED.table_name, action=EXCLUDED.action, "
    "data=EXCLUDED.data, source_site_id=EXCLUDED.source_site_id"
)

# Delete-then-insert to avoid duplicate record_ids across partitions.
# The conflict key (record_id, is_integrated) won't match across partitions,
# so we delete any integrated row first.
UPSERT_PT = (
    "WITH moved AS ("
    "  DELETE FROM sync_buffer_pt"
    "  WHERE record_id = %s AND is_integrated = TRUE"
    "  RETURNING record_id"
    ") "
    "INSERT INTO sync_buffer_pt "
    "(record_id, received_datetime, is_integrated, integration_datetime, "
    "integration_error, table_name, action, data, source_site_id) "
    "VALUES (%s, '2025-06-01', FALSE, NULL, NULL, %s, 'UPSERT', %s, %s) "
    "ON CONFLICT (record_id, is_integrated) DO UPDATE SET "
    "received_datetime=EXCLUDED.received_datetime, "
    "integration_datetime=EXCLUDED.integration_datetime, "
    "integration_error=EXCLUDED.integration_error, "
    "table_name=EXCLUDED.table_name, action=EXCLUDED.action, "
    "data=EXCLUDED.data, source_site_id=EXCLUDED.source_site_id"
)
