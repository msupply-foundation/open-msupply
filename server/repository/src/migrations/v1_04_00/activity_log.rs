use crate::{migrations::*, StorageConnection};

pub(crate) struct Migrate;
impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "activity_log"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
        ALTER TABLE activity_log ADD COLUMN changed_to TEXT;
        ALTER TABLE activity_log RENAME COLUMN event TO changed_from;
        "#,
        )?;

        Ok(())
    }
}
