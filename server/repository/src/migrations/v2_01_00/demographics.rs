use crate::{
    migrations::{sql, DOUBLE},
    StorageConnection,
};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
            CREATE TABLE demographic_indicator (
                id TEXT NOT NULL PRIMARY KEY,
                name TEXT NOT NULL,
                base_year INTEGER NOT NULL,
                base_population INTEGER,
                population_percentage {DOUBLE} NOT NULL,
                year_1_projection INTEGER NOT NULL,
                year_2_projection INTEGER NOT NULL,
                year_3_projection INTEGER NOT NULL,
                year_4_projection INTEGER NOT NULL,
                year_5_projection INTEGER NOT NULL
            );

            CREATE TABLE demographic_projection (
                id TEXT NOT NULL PRIMARY KEY,
                base_year INTEGER NOT NULL,
                year_1 INTEGER NOT NULL,
                year_2 INTEGER NOT NULL,
                year_3 INTEGER NOT NULL,
                year_4 INTEGER NOT NULL,
                year_5 INTEGER NOT NULL
            );
        "#
    )?;

    Ok(())
}
