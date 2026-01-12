use crate::{migrations::*, StorageConnection};

pub(crate) struct Migrate;
impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "encounter_status"
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                _connection,
                r#"
                ALTER TYPE encounter_status ADD VALUE 'DELETED' AFTER 'CANCELLED';
            "#,
            )?;
        }

        Ok(())
    }
}
