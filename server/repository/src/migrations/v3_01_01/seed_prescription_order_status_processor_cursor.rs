use crate::migrations::*;

/// Seed the prescription-order status processor's cursor at the current
/// changelog head. No invoice can reference a prescription_order before this
/// migration (the table is new), so nothing behind the head needs processing —
/// and without the seed the processor's first run would walk the entire
/// historical changelog synchronously (the #12547 trap that got
/// AssignPrescriptionNumber disabled).
///
/// Runs as its own fragment (own transaction) after the key_type enum value is
/// added, so Postgres can use the new enum value.
pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "seed_prescription_order_status_processor_cursor"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            INSERT INTO key_value_store (id, value_int)
            SELECT 'PRESCRIPTION_ORDER_STATUS_PROCESSOR_CURSOR', COALESCE(MAX(cursor), 0)
            FROM changelog;
            "#
        )?;

        Ok(())
    }
}
