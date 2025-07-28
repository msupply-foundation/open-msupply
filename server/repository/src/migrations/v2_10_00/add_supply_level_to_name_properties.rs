use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_supply_level_to_name_properties"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        let result = sql!(
            connection,
            r#"
                INSERT INTO property (id, key, name, value_type, allowed_values) VALUES 
                    ('packaging_level', 'packaging_level', 'Packaging Level', 'STRING', 'Primary (1),Secondary (2),Tertiary (3)');

                INSERT INTO name_property (id, property_id, remote_editable) VALUES 
                    ('c5e363fc-40c9-4m1c-b29a-76d74534b077', 'packaging_level', true);
            "#
        );
        if result.is_err() {
            // If the insert fails, it is probably be because the property already exists.
            log::warn!("Migration add_supply_level_to_name_properties: failed, Property 'packaging_level' may already exist");
            return Ok(());
        }

        Ok(())
    }
}
