use crate::migrations::*;

pub(crate) struct Migrate;
impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "program_requisition"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            CREATE TABLE program (
                id TEXT NOT NULL PRIMARY KEY,
                master_list_id TEXT NOT NULL REFERENCES master_list(id),
                name TEXT NOT NULL
            );
            "#
        )?;

        sql!(
            connection,
            r#"
            CREATE TABLE program_requisition_settings (
                id TEXT NOT NULL PRIMARY KEY,
                name_tag_id TEXT NOT NULL REFERENCES name_tag(id),
                program_id TEXT NOT NULL REFERENCES program(id),
                period_schedule_id TEXT NOT NULL REFERENCES period_schedule(id)
            );
            "#
        )?;

        sql!(
            connection,
            r#"
            CREATE TABLE program_requisition_order_type (
                id TEXT NOT NULL PRIMARY KEY,
                program_requisition_settings_id TEXT NOT NULL REFERENCES program_requisition_settings(id),
                name TEXT NOT NULL,
                threshold_mos {DOUBLE} NOT NULL,
                max_mos {DOUBLE} NOT NULL,
                max_order_per_period INTEGER NOT NULL
            );
            "#
        )?;

        Ok(())
    }
}
