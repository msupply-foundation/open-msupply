use crate::migrations::*;

/// Prescriber-authored prescription (distinct from the dispensing record,
/// which is an invoice of type PRESCRIPTION). When the prescriber sets the
/// order to READY_TO_DISPENSE a dispensing invoice is generated from it
/// (invoice.prescription_order_id points back here).
pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_prescription_order_tables"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        let status_type = if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                CREATE TYPE prescription_order_status AS ENUM ('NEW', 'READY_TO_DISPENSE', 'DISPENSED');
                "#
            )?;
            "prescription_order_status"
        } else {
            "TEXT"
        };

        sql!(
            connection,
            r#"
                CREATE TABLE prescription_order (
                    id TEXT NOT NULL PRIMARY KEY,
                    store_id TEXT NOT NULL REFERENCES store(id),
                    prescription_order_number BIGINT NOT NULL,
                    status {status_type} NOT NULL,
                    patient_link_id TEXT NOT NULL REFERENCES name_link(id),
                    clinician_link_id TEXT REFERENCES clinician_link(id),
                    diagnosis_id TEXT REFERENCES diagnosis(id),
                    program_id TEXT REFERENCES program(id),
                    created_datetime {DATETIME} NOT NULL,
                    prescription_datetime {DATETIME} NOT NULL,
                    ready_datetime {DATETIME},
                    dispensed_datetime {DATETIME},
                    created_by TEXT NOT NULL,
                    comment TEXT,
                    custom_fields {JSONB}
                );

                CREATE TABLE prescription_order_line (
                    id TEXT NOT NULL PRIMARY KEY,
                    prescription_order_id TEXT NOT NULL REFERENCES prescription_order(id),
                    item_link_id TEXT NOT NULL REFERENCES item_link(id),
                    quantity {DOUBLE} NOT NULL,
                    note TEXT
                );
            "#
        )?;

        Ok(())
    }
}
