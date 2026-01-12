use crate::migrations::*;

pub(crate) struct Migrate;
impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_tetum"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"ALTER TYPE language_type ADD VALUE IF NOT EXISTS 'TETUM'"#
            )?;
        }

        Ok(())
    }
}
