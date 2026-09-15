use crate::migrations::constants::{COLD_CHAIN_EQUIPMENT_UUID, COLD_ROOMS_AND_FREEZER_ROOMS_UUID};
use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_cold_room_mapping_properties"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            INSERT INTO asset_property (id, key, name, value_type, allowed_values, asset_class_id, asset_category_id)
            VALUES ('initial_mapping_date-cr', 'initial_mapping_date', 'Initial mapping date', 'DATE', NULL, '{COLD_CHAIN_EQUIPMENT_UUID}', '{COLD_ROOMS_AND_FREEZER_ROOMS_UUID}');
            "#
        )?;

        sql!(
            connection,
            r#"
            INSERT INTO asset_property (id, key, name, value_type, allowed_values, asset_class_id, asset_category_id)
            VALUES ('most_recent_mapping_date-cr', 'most_recent_mapping_date', 'Most recent mapping date', 'DATE', NULL, '{COLD_CHAIN_EQUIPMENT_UUID}', '{COLD_ROOMS_AND_FREEZER_ROOMS_UUID}');
            "#
        )?;

        Ok(())
    }
}
