use crate::migrations::*;

/// `custom_field` and `custom_field_option` have carried `deleted_datetime`
/// since v3_00_00; `custom_field_scope` did not, so a scope a definition stopped
/// naming had no way to stop applying.
///
/// Soft, not hard, and not because the row is worth keeping — nothing
/// references a scope row, unlike an option id that a stored value holds. The
/// whole custom-field family simply has no delete path over v7: all three
/// tables sit in the `DeleteTranslatorNotFound` arm of
/// `sync_v7::validate_translate_integrate`, so a hard DELETE on central would
/// reach remotes as a changelog they refuse. Removal has to travel as an
/// ordinary upsert. Giving the family a delete translator is the alternative,
/// and a bigger decision than this fix.
pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_custom_field_scope_deleted_datetime"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            ALTER TABLE custom_field_scope ADD COLUMN deleted_datetime {DATETIME};
            "#
        )?;

        Ok(())
    }
}
