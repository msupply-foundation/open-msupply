use crate::migrations::*;
pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "indicator_column_create_table"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                CREATE TYPE indicator_value_type AS ENUM (
                    'STRING',
                    'NUMBER'
                );
                "#
            )?
        }

        let value_type = if cfg!(feature = "postgres") {
            "indicator_value_type"
        } else {
            "TEXT"
        };

        sql!(
            connection,
            r#"
            CREATE TABLE indicator_column (
                id TEXT PRIMARY KEY NOT NULL,
                program_indicator_id TEXT NOT NULL REFERENCES program_indicator(id),
                column_number INTEGER NOT NULL,
                header TEXT NOT NULL,
                value_type {value_type},
                default_value TEXT NOT NULL,
                is_active BOOLEAN NOT NULL       
            );

            CREATE TABLE indicator_line (
                id TEXT PRIMARY KEY NOT NULL,
                program_indicator_id TEXT NOT NULL REFERENCES program_indicator(id),
                line_number INTEGER NOT NULL,
                description TEXT NOT NULL,
                code TEXT NOT NULL,
                value_type {value_type},
                default_value TEXT NOT NULL,
                is_required BOOLEAN NOT NULL,
                is_active BOOLEAN NOT NULL  
            );
            "#
        )?;
        Ok(())
    }
}
