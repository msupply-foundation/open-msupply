use crate::{migrations::*, StorageConnection};

pub(crate) struct Migrate;
impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "temperature_breach"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                UPDATE temperature_breach SET acknowledged = not acknowledged;
                ALTER TABLE temperature_breach RENAME COLUMN acknowledged TO unacknowledged;
                ALTER TABLE temperature_breach ADD COLUMN comment TEXT
            "#,
        )?;

        Ok(())
    }
}
