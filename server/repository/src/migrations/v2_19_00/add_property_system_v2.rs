use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_property_system_v2"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Adds the four-table model from decisions/2025-10-16_properties.md
        // (Option 1) ALONGSIDE the legacy `property` + `name_property` tables so
        // both implementations can be compared at runtime. Prototype tables are
        // namespaced `property_v2*` to avoid colliding with the legacy schema.
        sql!(
            connection,
            r#"
                CREATE TABLE property_v2 (
                    id TEXT NOT NULL PRIMARY KEY,
                    type TEXT NOT NULL,
                    name TEXT NOT NULL,
                    translation_key TEXT,
                    deleted_datetime {DATETIME}
                );

                CREATE TABLE property_v2_table (
                    id TEXT NOT NULL PRIMARY KEY,
                    property_id TEXT NOT NULL REFERENCES property_v2(id),
                    table_name TEXT NOT NULL
                );
                CREATE INDEX idx_property_v2_table_property_id ON property_v2_table(property_id);
                CREATE INDEX idx_property_v2_table_table_name ON property_v2_table(table_name);

                CREATE TABLE property_v2_option (
                    id TEXT NOT NULL PRIMARY KEY,
                    property_id TEXT NOT NULL REFERENCES property_v2(id),
                    name TEXT NOT NULL,
                    translation_key TEXT,
                    deleted_datetime {DATETIME}
                );
                CREATE INDEX idx_property_v2_option_property_id ON property_v2_option(property_id);

                CREATE TABLE property_v2_value (
                    id TEXT NOT NULL PRIMARY KEY,
                    table_name TEXT NOT NULL,
                    record_id TEXT NOT NULL,
                    property_id TEXT NOT NULL REFERENCES property_v2(id),
                    value_text TEXT,
                    value_real {DOUBLE},
                    value_date {DATE},
                    value_number INTEGER,
                    value_option_id TEXT REFERENCES property_v2_option(id)
                );
                CREATE INDEX idx_property_v2_value_record ON property_v2_value(table_name, record_id);
                CREATE INDEX idx_property_v2_value_property_id ON property_v2_value(property_id);
            "#
        )?;

        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'property_v2';
                    ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'property_v2_table';
                    ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'property_v2_option';
                    ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'property_v2_value';
                "#
            )?;
        }

        Ok(())
    }
}
