use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_vaccine_course_item_deleted_datetime"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE vaccine_course_item ADD COLUMN deleted_datetime {DATETIME};
            "#
        )?;

        Ok(())
    }
}
