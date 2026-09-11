use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_prescription_request_id_to_invoice"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Deliberately no FK: dispensing invoices are patient-distributed and can
        // land on sites that never receive the (remote-owned) prescription_request,
        // same reason invoice.requisition_id is a soft reference.
        sql!(
            connection,
            r#"
            ALTER TABLE invoice ADD COLUMN prescription_request_id TEXT;

            -- PARTIAL: only a dispensation generated from a prescription
            -- request carries one, which is a vanishing fraction of a table
            -- that is among the largest we have. A plain index would hold an
            -- entry per invoice, nearly all of them null, for the sake of the
            -- few thousand that aren't. The only query is an equality on the
            -- id, which implies IS NOT NULL, so the planner can still use it.
            CREATE INDEX index_invoice_prescription_request_id
                ON invoice (prescription_request_id)
                WHERE prescription_request_id IS NOT NULL;
            "#
        )?;

        Ok(())
    }
}
