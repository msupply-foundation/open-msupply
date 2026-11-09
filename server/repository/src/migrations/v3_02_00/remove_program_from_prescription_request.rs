use crate::migrations::*;

/// The program a prescription request was written under — dropped after the
/// stakeholder review found no use for it on the prescriber's side (issue
/// #514). It narrowed the line editor's item list to the program's master list
/// and was copied onto the generated dispensation; neither survives.
///
/// A separate fragment rather than an amendment to
/// `add_prescription_request_tables`: that one has reached develop, so sites
/// already carry the table with this column.
pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "remove_program_from_prescription_request"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE prescription_request
                DROP COLUMN program_id;
            "#
        )?;

        Ok(())
    }
}
