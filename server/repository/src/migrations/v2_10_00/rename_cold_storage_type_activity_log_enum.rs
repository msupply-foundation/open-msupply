use crate::{migrations::*, StorageConnection};

pub fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    if cfg!(feature = "postgres") {
        sql!(
            connection,
            r#"
                 ALTER TYPE activity_log_type RENAME VALUE 'ITEM_VARIANT_UPDATE_COLD_STORAGE_TYPE' TO 'ITEM_VARIANT_UPDATE_LOCATION_TYPE';
                 "#,
        )?;
    } else {
        sql!(
            connection,
            r#"
                UPDATE activity_log SET type = 'ITEM_VARIANT_UPDATE_LOCATION_TYPE' WHERE type = 'ITEM_VARIANT_UPDATE_COLD_STORAGE_TYPE';
            "#,
        )?;
    }

    Ok(())
}
