use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "reintegrate_categories_for_property_options"
    }

    /// Backfill `property_option_v2` for legacy item **and** name categories.
    ///
    /// `CategoryTranslation` / `NameCategoryTranslation` now (central-only) also
    /// emit a `property_option_v2` row per category record, mapping mSupply
    /// categories onto the new `legacy_item_category*` / `legacy_name_category_*`
    /// OPTION properties. But the original category records were integrated before
    /// those translators existed, and central data only re-flows from OG on
    /// initialisation or change — so on existing sites the options would otherwise
    /// stay empty until a category is edited.
    ///
    /// `sync_buffer` is append-only (rows are marked integrated, never deleted),
    /// so the raw category records received at initialisation are still present.
    /// Setting `is_integrated = false` moves them back into the pending partition
    /// (the sync-v7 buffer partitions on `is_integrated`, and the pending query
    /// filters on it — clearing `integration_datetime` alone is *not* enough, it's
    /// the pre-v7 pattern). The next sync cycle then re-runs the category
    /// translators over them (after `is_central_server()` is known and the mapping
    /// properties are seeded), authoring the options with no re-initialisation and
    /// no dependency on edit history. Mirrors the `item` re-integration done by the
    /// migration that first added the category table
    /// (`v2_04_01/category_and_item_categories`).
    ///
    /// Covers the main item hierarchy, the two flat item dimensions
    /// (`item_category2`/`3`) and all six name dimensions (`name_category1` + its
    /// level tables, `name_category2..6`).
    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                UPDATE sync_buffer
                    SET is_integrated = FALSE,
                        integration_datetime = NULL,
                        integration_error = NULL
                    WHERE table_name IN (
                        'item_category',
                        'item_category_level1',
                        'item_category_level2',
                        'item_category2',
                        'item_category3',
                        'name_category1',
                        'name_category1_level1',
                        'name_category1_level2',
                        'name_category2',
                        'name_category3',
                        'name_category4',
                        'name_category5',
                        'name_category6'
                    );
            "#
        )?;

        Ok(())
    }
}
