use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_name_properties_jsonb"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Read-only experiment column for the properties KDD perf comparison:
        // a binary-JSON twin of `name.properties` (the text-JSON column added
        // in v2_01_00). `name_oms_fields` is a Diesel alias over the same
        // physical `name` table, so the ALTER targets `name` directly.
        //
        // Backfill is intentionally NOT performed here — run it manually after
        // seeding data so the migration stays cheap and works on fresh init:
        //   Postgres: UPDATE name SET properties_jsonb = properties::jsonb
        //             WHERE properties IS NOT NULL;
        //   SQLite:   UPDATE name SET properties_jsonb = jsonb(properties)
        //             WHERE properties IS NOT NULL;
        // No CRUD path writes to this column, so the comparison drifts if
        // `properties` is updated after backfill (acceptable for a benchmark).
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TABLE name ADD COLUMN properties_jsonb jsonb;
                "#
            )?;
        } else {
            sql!(
                connection,
                r#"
                    ALTER TABLE name ADD COLUMN properties_jsonb BLOB;
                "#
            )?;
        }

        Ok(())
    }
}
