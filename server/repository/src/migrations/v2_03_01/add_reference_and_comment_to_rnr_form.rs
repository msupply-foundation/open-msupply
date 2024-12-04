use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_reference_and_comment_to_rnr_form"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE rnr_form ADD COLUMN their_reference TEXT;
                ALTER TABLE rnr_form ADD COLUMN comment TEXT;
            "#
        )?;

        Ok(())
    }
}
