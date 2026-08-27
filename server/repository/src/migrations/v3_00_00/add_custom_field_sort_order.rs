use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_custom_field_sort_order"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Per-scope display order for custom_fields, and option order within an
        // OPTION custom_field. A plain-TEXT lexical rank (fractional/LexoRank
        // style) rather than an integer so a future reorder can always mint a key
        // *between* two neighbours and write only the moved row. `NOT NULL DEFAULT
        // ''` keeps ordering a simple `ORDER BY sort_order, id` that behaves the
        // same on SQLite and Postgres (no nulls-ordering divergence); unranked
        // rows ('') fall back to `id` order. Populated for legacy mapping fields by
        // `central_mapping_custom_fields` and for options by the category
        // translators.
        sql!(
            connection,
            r#"
                ALTER TABLE custom_field_scope ADD COLUMN sort_order TEXT NOT NULL DEFAULT '';
                ALTER TABLE custom_field_option ADD COLUMN sort_order TEXT NOT NULL DEFAULT '';
            "#
        )?;

        Ok(())
    }
}
