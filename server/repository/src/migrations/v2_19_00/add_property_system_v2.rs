use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_property_system_v2"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Replaces the legacy `property` + `name_property` tables with the four-table
        // model from decisions/2025-10-16_properties.md (Option 1). The old shape
        // bound properties to a single parent (`name`) and stored values as JSON on
        // `name.properties`; the new shape lets properties attach to any parent via
        // `property_table` and stores values as typed rows in `property_value`.
        sql!(
            connection,
            r#"
                DROP TABLE IF EXISTS name_property;
                DROP TABLE IF EXISTS property;

                CREATE TABLE property (
                    id TEXT NOT NULL PRIMARY KEY,
                    type TEXT NOT NULL,
                    name TEXT NOT NULL,
                    translation_key TEXT,
                    deleted_datetime {DATETIME}
                );

                CREATE TABLE property_table (
                    id TEXT NOT NULL PRIMARY KEY,
                    property_id TEXT NOT NULL REFERENCES property(id),
                    table_name TEXT NOT NULL
                );
                CREATE INDEX idx_property_table_property_id ON property_table(property_id);
                CREATE INDEX idx_property_table_table_name ON property_table(table_name);

                CREATE TABLE property_option (
                    id TEXT NOT NULL PRIMARY KEY,
                    property_id TEXT NOT NULL REFERENCES property(id),
                    name TEXT NOT NULL,
                    translation_key TEXT,
                    deleted_datetime {DATETIME}
                );
                CREATE INDEX idx_property_option_property_id ON property_option(property_id);

                CREATE TABLE property_value (
                    id TEXT NOT NULL PRIMARY KEY,
                    table_name TEXT NOT NULL,
                    record_id TEXT NOT NULL,
                    property_id TEXT NOT NULL REFERENCES property(id),
                    value_text TEXT,
                    value_real {DOUBLE},
                    value_date {DATE},
                    value_number INTEGER,
                    value_option_id TEXT REFERENCES property_option(id)
                );
                CREATE INDEX idx_property_value_record ON property_value(table_name, record_id);
                CREATE INDEX idx_property_value_property_id ON property_value(property_id);
            "#
        )?;

        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'property_table';
                    ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'property_option';
                    ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'property_value';
                "#
            )?;
        }

        Ok(())
    }
}
