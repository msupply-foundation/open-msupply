use crate::{migrations::*, StorageConnection};

pub(crate) struct Migrate;
impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "name_is_deceased"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
        UPDATE name set is_deceased = false WHERE is_deceased is null;
      "#
        )?;

        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TABLE name ALTER COLUMN is_deceased SET NOT NULL;
                    ALTER TABLE name ALTER COLUMN is_deceased SET DEFAULT false;
                "#
            )?;
        }

        Ok(())
    }
}
