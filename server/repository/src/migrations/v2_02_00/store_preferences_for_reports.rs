use crate::{
    migrations::{sql, DOUBLE},
    StorageConnection,
};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
            ALTER TABLE store_preference ADD COLUMN monthly_consumption_look_back_period {DOUBLE} DEFAULT 0.0;
            ALTER TABLE store_preference ADD COLUMN months_lead_time {DOUBLE} DEFAULT 0.0;
            ALTER TABLE store_preference ADD COLUMN months_overstock {DOUBLE} DEFAULT 6.0;
            ALTER TABLE store_preference ADD COLUMN months_understock {DOUBLE} DEFAULT 3.0;
            ALTER TABLE store_preference ADD COLUMN months_items_expire {DOUBLE} DEFAULT 3.0;
            ALTER TABLE store_preference ADD COLUMN stocktake_frequency {DOUBLE} DEFAULT 1.0; 
        "#
    )?;

    Ok(())
}
