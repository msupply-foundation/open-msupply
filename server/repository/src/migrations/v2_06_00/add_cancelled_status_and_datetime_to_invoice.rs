use crate::migrations::*;
pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_cancelled_status_and_datetime_to_invoice"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'CANCELLED';
                "#,
            )?;
        }

        if cfg!(not(feature = "postgres")) {
            sql!(
                connection,
                r#"
                CREATE TABLE invoice_new (
                    id TEXT NOT NULL PRIMARY KEY,
                    -- For outbound shipments, the id of the receiving customer.
                    -- For inbound shipments, the id of the sending supplier.
                    name_store_id TEXT REFERENCES store (id),
                    -- Change to reference user_accoun once users are syncing
                    user_id TEXT,
                    -- For outbound shipments, the id of the issuing store.
                    -- For inbound shipments, the id of the receiving store.
                    store_id TEXT NOT NULL REFERENCES store (id),
                    invoice_number integer NOT NULL,
                    on_hold BOOLEAN NOT NULL,
                    comment TEXT,
                    their_reference TEXT,
                    transport_reference TEXT,
                    created_datetime TEXT NOT NULL,
                    allocated_datetime TEXT,
                    picked_datetime TEXT,
                    shipped_datetime TEXT,
                    delivered_datetime TEXT,
                    verified_datetime TEXT,
                    colour TEXT,
                    requisition_id TEXT,
                    linked_invoice_id TEXT,
                    tax_percentage REAL,
                    status NOT NULL DEFAULT 'NEW',
                    type NOT NULL DEFAULT 'OUTBOUND_SHIPMENT',
                    currency_id TEXT REFERENCES currency(id),
                    currency_rate REAL NOT NULL DEFAULT 1.0,
                    name_link_id TEXT NOT NULL DEFAULT 'temp_for_migration' REFERENCES name_link(id),
                    clinician_link_id TEXT REFERENCES clinician_link (id),
                    original_shipment_id TEXT,
                    backdated_datetime TIMESTAMP,
                    diagnosis_id TEXT REFERENCES diagnosis(id),
                    program_id TEXT REFERENCES program (id)
                );

                INSERT INTO invoice_new SELECT id, name_store_id, user_id, store_id, invoice_number, on_hold, 
                comment, their_reference, transport_reference, created_datetime, allocated_datetime, picked_datetime, 
                shipped_datetime, delivered_datetime, verified_datetime, colour, requisition_id, linked_invoice_id, 
                tax_percentage, status, "type", currency_id, currency_rate, name_link_id, clinician_link_id, 
                original_shipment_id, backdated_datetime, diagnosis_id, program_id FROM invoice;
                
                PRAGMA foreign_keys=off;
                DROP TABLE invoice;
                ALTER TABLE invoice_new RENAME TO invoice;
                PRAGMA foreign_keys=on;
                "#,
            )?;
        }

          Ok(())
    }
}