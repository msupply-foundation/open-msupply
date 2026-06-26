use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "reintegrate_label_prefs_for_property_names"
    }

    /// Backfill mSupply's configurable field labels onto the mapping
    /// properties' `property_v2.name`.
    ///
    /// `legacy_field_labels` translators now (central-only) apply the item
    /// `user_fields` pref and the name `name_cat_custom_values` pref_blob to
    /// the seeded mapping property names. But those pref records were
    /// integrated (well, ignored) before the translators existed, and OG only
    /// re-sends a pref when it's edited — so on existing sites a label
    /// customised *before* this version would never arrive again.
    ///
    /// `sync_buffer` is append-only, so the pref records received at
    /// initialisation are still present. Flip them back to the pending
    /// partition (`is_integrated = FALSE`, the sync-v7 pattern — see
    /// `reintegrate_categories_for_property_options`) and the next sync cycle
    /// re-runs the label translators over them, after the mapping properties
    /// are seeded.
    ///
    /// Matched by content rather than `table_name` alone so the
    /// `store_preferences` prefs (the bulk of the `pref` table) aren't
    /// pointlessly re-integrated. A false positive only re-runs an idempotent
    /// translator, so the loose LIKE is safe.
    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                UPDATE sync_buffer
                    SET is_integrated = FALSE,
                        integration_datetime = NULL,
                        integration_error = NULL
                    WHERE (table_name = 'pref' AND data LIKE '%user_fields%')
                       OR (table_name = 'pref_blob' AND data LIKE '%name_cat_custom_values%');
            "#
        )?;

        Ok(())
    }
}
