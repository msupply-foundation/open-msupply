use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "remove_rnr_form_line_entered_losses_default"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TABLE rnr_form_line ALTER COLUMN entered_losses DROP DEFAULT;
                "#
            )?;
        } else {
            sql!(
                connection,
                r#"
                    ALTER TABLE rnr_form_line RENAME COLUMN entered_losses TO entered_losses_old;
                    ALTER TABLE rnr_form_line ADD COLUMN entered_losses {DOUBLE};
                    UPDATE rnr_form_line SET entered_losses = entered_losses_old;
                    ALTER TABLE rnr_form_line DROP COLUMN entered_losses_old;
                "#
            )?;
        }

        Ok(())
    }
}
