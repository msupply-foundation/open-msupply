use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    // Create the external_dimensions property as an example (available for all cold chain equipment assets)
    sql!(
        connection,
        r#"
        INSERT INTO asset_property (id, key, name, value_type, allowed_values, asset_class_id) VALUES ('external_dimensions', 'external_dimensions', 'External dimensions - WxDxH (in cm)', 'STRING', NULL, 'fad280b6-8384-41af-84cf-c7b6b4526ef0');
        "#,
    )?;

    /*
    Asset Properties for Cold/Freezer rooms (asset_category_id: 7db32eb6-5929-4dd1-a5e9-01e36baa73ad)
    Storage capacity +5 °C (in litres)
    Storage capacity -20 °C (in litres)
    Storage capacity -70 °C (in litres)
    Waterpack storage capacity (in Kg)
    Waterpack freezing capacity per 24 hours (in Kg)
    Energy consumption (stable running, continuous power) (in KW per day)
    Energy consumption during freezing (in KW per day)
    Hold over time (hours)
    Climate zone
    Freeze protection
    Temperature monitoring device (integrated, external or none)
    Voltage stabilizer (integrated, external or none)
    */

    sql!(
        connection,
        r#"
        INSERT INTO asset_property (id, key, name, value_type, allowed_values, asset_class_id, asset_category_id) VALUES ('storage_capacity_5c', 'storage_capacity_5c', 'Storage capacity +5 °C (in litres)', 'STRING', NULL, 'fad280b6-8384-41af-84cf-c7b6b4526ef0','7db32eb6-5929-4dd1-a5e9-01e36baa73ad');
        INSERT INTO asset_property (id, key, name, value_type, allowed_values, asset_class_id, asset_category_id) VALUES ('storage_capacity_20c', 'storage_capacity_20c', 'Storage capacity -20 °C (in litres)', 'STRING', NULL, 'fad280b6-8384-41af-84cf-c7b6b4526ef0','7db32eb6-5929-4dd1-a5e9-01e36baa73ad');
        INSERT INTO asset_property (id, key, name, value_type, allowed_values, asset_class_id, asset_category_id) VALUES ('storage_capacity_70c', 'storage_capacity_70c', 'Storage capacity -70 °C (in litres)', 'STRING', NULL, 'fad280b6-8384-41af-84cf-c7b6b4526ef0','7db32eb6-5929-4dd1-a5e9-01e36baa73ad');
        INSERT INTO asset_property (id, key, name, value_type, allowed_values, asset_class_id, asset_category_id) VALUES ('waterpack_storage_capacity', 'waterpack_storage_capacity', 'Waterpack storage capacity (in Kg)', 'STRING', NULL, 'fad280b6-8384-41af-84cf-c7b6b4526ef0','7db32eb6-5929-4dd1-a5e9-01e36baa73ad');
        INSERT INTO asset_property (id, key, name, value_type, allowed_values, asset_class_id, asset_category_id) VALUES ('waterpack_freezing_capacity', 'waterpack_freezing_capacity', 'Waterpack freezing capacity per 24 hours (in Kg)', 'STRING', NULL, 'fad280b6-8384-41af-84cf-c7b6b4526ef0','7db32eb6-5929-4dd1-a5e9-01e36baa73ad');
        INSERT INTO asset_property (id, key, name, value_type, allowed_values, asset_class_id, asset_category_id) VALUES ('energy_consumption_stable', 'energy_consumption_stable', 'Energy consumption (stable running, continuous power) (in KW per day)', 'STRING', NULL, 'fad280b6-8384-41af-84cf-c7b6b4526ef0','7db32eb6-5929-4dd1-a5e9-01e36baa73ad');
        INSERT INTO asset_property (id, key, name, value_type, allowed_values, asset_class_id, asset_category_id) VALUES ('energy_consumption_freezing', 'energy_consumption_freezing', 'Energy consumption during freezing (in KW per day)', 'STRING', NULL, 'fad280b6-8384-41af-84cf-c7b6b4526ef0','7db32eb6-5929-4dd1-a5e9-01e36baa73ad');
        INSERT INTO asset_property (id, key, name, value_type, allowed_values, asset_class_id, asset_category_id) VALUES ('hold_over_time', 'hold_over_time', 'Hold over time (hours)', 'STRING', NULL, 'fad280b6-8384-41af-84cf-c7b6b4526ef0','7db32eb6-5929-4dd1-a5e9-01e36baa73ad');
        INSERT INTO asset_property (id, key, name, value_type, allowed_values, asset_class_id, asset_category_id) VALUES ('climate_zone', 'climate_zone', 'Climate zone', 'STRING', NULL, 'fad280b6-8384-41af-84cf-c7b6b4526ef0','7db32eb6-5929-4dd1-a5e9-01e36baa73ad');
        INSERT INTO asset_property (id, key, name, value_type, allowed_values, asset_class_id, asset_category_id) VALUES ('freeze_protection', 'freeze_protection', 'Freeze protection', 'STRING', NULL, 'fad280b6-8384-41af-84cf-c7b6b4526ef0','7db32eb6-5929-4dd1-a5e9-01e36baa73ad');
        INSERT INTO asset_property (id, key, name, value_type, allowed_values, asset_class_id, asset_category_id) VALUES ('temperature_monitoring_device', 'temperature_monitoring_device', 'Temperature monitoring device (integrated, external or none)', 'STRING', 'integrated, external, none', 'fad280b6-8384-41af-84cf-c7b6b4526ef0','7db32eb6-5929-4dd1-a5e9-01e36baa73ad');
        INSERT INTO asset_property (id, key, name, value_type, allowed_values, asset_class_id, asset_category_id) VALUES ('voltage_stabilizer', 'voltage_stabilizer', 'Voltage stabilizer (integrated, external or none)', 'STRING', 'integrated, external, none', 'fad280b6-8384-41af-84cf-c7b6b4526ef0','7db32eb6-5929-4dd1-a5e9-01e36baa73ad');
        "#,
    )?;
    /*
        Asset Properties for Insulated Containers (asset_category_id: 02cbea92-d5bf-4832-863b-c04e093a7760)
        Temperature monitoring device (integrated, external or none)
        Voltage stabilizer (integrated, external or none)
    */

    sql!(
        connection,
        r#"
        INSERT INTO asset_property (id, key, name, value_type, allowed_values, asset_class_id, asset_category_id) VALUES ('temperature_monitoring_device_ic', 'temperature_monitoring_device', 'Temperature monitoring device (integrated, external or none)', 'STRING', 'integrated, external, none', 'fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760');
        INSERT INTO asset_property (id, key, name, value_type, allowed_values, asset_class_id, asset_category_id) VALUES ('voltage_stabilizer_ic', 'voltage_stabilizer', 'Voltage stabilizer (integrated, external or none)', 'STRING', 'integrated, external, none', 'fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760');
        "#,
    )?;

    Ok(())
}
