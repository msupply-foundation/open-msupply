use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "report_fix_prescriptions_report_code"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // rename code prescriptions to prescription-receipt
        sql!(
            connection,
            r#"
            UPDATE report SET code = 'prescription-receipt' WHERE code = 'prescriptions';
            UPDATE report SET id = 'prescription-receipt_2_6_0_false' where id = 'prescriptions_2_6_0_false';
            "#
        )?;

        Ok(())
    }
}
