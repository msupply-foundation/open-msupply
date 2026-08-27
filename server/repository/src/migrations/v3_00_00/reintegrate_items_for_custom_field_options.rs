use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "reintegrate_items_for_custom_field_options"
    }

    /// Backfill each item's *category assignment* as a `custom_field_value`.
    ///
    /// `ItemTranslation` now authors an item's leaf category as `custom_field_value`
    /// OPTION rows (the value the Custom Fields UI reads), but existing items were
    /// integrated before that mapping existed and central data only re-flows on
    /// initialisation or change — so the assignment stays empty until the item is
    /// edited on OG. `reintegrate_categories_for_custom_field_options` covers the
    /// sibling *options list*; this covers the per-item *assignment*.
    ///
    /// Re-integrates the (append-only, still-present) `item` buffer rows by moving
    /// them back to pending — `is_integrated = false`, since the sync-v7 buffer
    /// partitions on it (clearing `integration_datetime` alone is the pre-v7
    /// pattern). The next sync cycle re-runs `ItemTranslation`, authoring the values
    /// with no re-init or edit history.
    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                UPDATE sync_buffer
                    SET is_integrated = FALSE,
                        integration_datetime = NULL,
                        integration_error = NULL
                    WHERE table_name = 'item';
            "#
        )?;

        Ok(())
    }
}
