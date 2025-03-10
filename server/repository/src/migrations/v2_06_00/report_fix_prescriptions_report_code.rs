use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "report_fix_prescriptions_report_code_updated"
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

        // remove records of report from changelog to make sure we don't have issues trying to sync missing reports
        // This is safe to do (this time) as we're removing all reports from the system in the reinitialise_reports migration
        sql!(
            connection,
            r#"
                DELETE FROM changelog WHERE table_name = 'report';
            "#
        )?;

        Ok(())
    }
}
