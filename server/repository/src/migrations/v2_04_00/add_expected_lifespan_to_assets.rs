use crate::migrations::constants::{COLD_CHAIN_EQUIPMENT_UUID, DEFAULT_EXPECTED_LIFESPAN};
use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_expected_lifespan_to_assets"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            INSERT INTO asset_property (id, key, name, value_type, allowed_values, asset_class_id) VALUES ('expected_lifespan', 'expected_lifespan', 'Expected Lifespan (in years)', 'FLOAT', NULL, '{COLD_CHAIN_EQUIPMENT_UUID}');
            "#
        )?;

        // Add the expected lifespan at 10 years for all cold chain equipment assets
        // properties are stored as JSON so we nee to update the JSON object

        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                UPDATE asset_catalogue_item
                SET properties = jsonb_set(properties::jsonb, '{{expected_lifespan}}', '{DEFAULT_EXPECTED_LIFESPAN}')::text
                WHERE asset_class_id = '{COLD_CHAIN_EQUIPMENT_UUID}';
                "#
            )?;
        } else {
            sql!(
                connection,
                r#"
                UPDATE asset_catalogue_item
                SET properties = json_set(properties, '$.expected_lifespan', {DEFAULT_EXPECTED_LIFESPAN})
                WHERE asset_class_id = '{COLD_CHAIN_EQUIPMENT_UUID}';
                "#
            )?;
        }

        Ok(())
    }
}
