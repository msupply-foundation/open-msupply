use crate::{migrations::sql, StorageConnection};
use util::uuid::uuid;

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    let id = uuid();

    sql!(
        connection,
        r#"
            INSERT INTO temperature_breach_config (id, duration_milliseconds, "type", description, is_active, store_id, minimum_temperature, maximum_temperature)
            SELECT '{id}', 0, 'EXCURSION', 'Default temperature excursion configuration', true, sp.id as store_id, 2, 8
            FROM store_preference sp 
            LEFT JOIN temperature_breach_config tbc ON sp.id = tbc.store_id AND tbc."type" = 'EXCURSION'
            WHERE vaccine_module AND tbc.id is null;
        "#,
    )?;

    Ok(())
}
