use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "insert_general_population_indicator_row"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                INSERT INTO demographic (id, name, population_percentage)
                VALUES ('general_population', 'General Population', 100);
            "#,
        )?;

        sql!(
            connection,
            r#"
                INSERT INTO demographic_indicator (
                    id,
                    demographic_id,
                    name,
                    base_year,
                    base_population,
                    population_percentage,
                    year_1_projection,
                    year_2_projection,
                    year_3_projection,
                    year_4_projection,
                    year_5_projection
                )
                SELECT
                    'generalRow',
                    'general_population',
                    'General Population',
                    COALESCE(di.base_year, 2024),
                    COALESCE(di.base_population, 0),
                    100,
                    0, 0, 0, 0, 0
                FROM (SELECT 1) AS dummy
                LEFT JOIN (SELECT * FROM demographic_indicator LIMIT 1) di;
            "#,
        )?;

        Ok(())
    }
}
