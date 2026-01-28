use crate::{migrations::*, StorageConnection};

pub(crate) struct Migrate;
impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "master_list"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE master_list ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
            "#,
        )?;

        Ok(())
    }
}
