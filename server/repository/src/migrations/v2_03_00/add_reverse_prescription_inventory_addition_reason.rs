use crate::migrations::*;
use util::constants::REVERSE_PRESCRIPTION_REASON_ID;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_reverse_prescription_inventory_addition_reason"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
               INSERT INTO inventory_adjustment_reason (id, type, is_active, reason) 
                VALUES ('{REVERSE_PRESCRIPTION_REASON_ID}', 'POSITIVE', TRUE, '{REVERSE_PRESCRIPTION_REASON_ID}');
            "#
        )?;

        Ok(())
    }
}
