use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    // immunisation
    sql!(
        connection,
        r#"
        CREATE TABLE immunisation (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            immunisation_program_id TEXT NOT NULL REFERENCES program(id),
            demographic_indicator_id TEXT NOT NULL,-- TODO FK REFERENCES demographic_indicator(id)
            coverage_rate FLOAT NOT NULL DEFAULT 100,
            is_active BOOL NOT NULL DEFAULT true,
            wastage_rate FLOAT NOT NULL DEFAULT 0,
            doses INT
        );
        "#
    )?;

    // immunisation_item
    sql!(
        connection,
        r#"
        CREATE TABLE immunisation_item (
            id TEXT PRIMARY KEY NOT NULL,
            immunisation_id TEXT NOT NULL REFERENCES immunisation(id),
            item_link_id TEXT NOT NULL REFERENCES item_link(id)
        );
        "#
    )?;

    // immunisation_schedule
    sql!(
        connection,
        r#"
        CREATE TABLE immunisation_schedule (
            id TEXT PRIMARY KEY NOT NULL,
            immunisation_id TEXT NOT NULL REFERENCES immunisation(id),
            dose_number INT NOT NULL,
            label INT NOT NULL
        );
        "#
    )?;

    Ok(())
}
