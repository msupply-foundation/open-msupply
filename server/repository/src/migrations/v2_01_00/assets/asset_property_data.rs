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
    Energy Source
    Refrigerant Type(s)
    */

    sql!(
        connection,
        r#"
        INSERT INTO asset_property (id, key, name, value_type, allowed_values, asset_class_id, asset_category_id) VALUES ('storage_capacity_5c-cr', 'storage_capacity_5c', 'Storage capacity +5 °C (in litres)', 'FLOAT', NULL, 'fad280b6-8384-41af-84cf-c7b6b4526ef0','7db32eb6-5929-4dd1-a5e9-01e36baa73ad');
        INSERT INTO asset_property (id, key, name, value_type, allowed_values, asset_class_id, asset_category_id) VALUES ('storage_capacity_20c-cr', 'storage_capacity_20c', 'Storage capacity -20 °C (in litres)', 'FLOAT', NULL, 'fad280b6-8384-41af-84cf-c7b6b4526ef0','7db32eb6-5929-4dd1-a5e9-01e36baa73ad');
        INSERT INTO asset_property (id, key, name, value_type, allowed_values, asset_class_id, asset_category_id) VALUES ('storage_capacity_70c-cr', 'storage_capacity_70c', 'Storage capacity -70 °C (in litres)', 'FLOAT', NULL, 'fad280b6-8384-41af-84cf-c7b6b4526ef0','7db32eb6-5929-4dd1-a5e9-01e36baa73ad');
        INSERT INTO asset_property (id, key, name, value_type, allowed_values, asset_class_id, asset_category_id) VALUES ('waterpack_storage_capacity-cr', 'waterpack_storage_capacity', 'Waterpack storage capacity (in Kg)', 'FLOAT', NULL, 'fad280b6-8384-41af-84cf-c7b6b4526ef0','7db32eb6-5929-4dd1-a5e9-01e36baa73ad');
        INSERT INTO asset_property (id, key, name, value_type, allowed_values, asset_class_id, asset_category_id) VALUES ('waterpack_freezing_capacity-cr', 'waterpack_freezing_capacity', 'Waterpack freezing capacity per 24 hours (in Kg)', 'FLOAT', NULL, 'fad280b6-8384-41af-84cf-c7b6b4526ef0','7db32eb6-5929-4dd1-a5e9-01e36baa73ad');
        INSERT INTO asset_property (id, key, name, value_type, allowed_values, asset_class_id, asset_category_id) VALUES ('energy_consumption_stable-cr', 'energy_consumption_stable', 'Energy consumption (stable running, continuous power) (in KW per day)', 'FLOAT', NULL, 'fad280b6-8384-41af-84cf-c7b6b4526ef0','7db32eb6-5929-4dd1-a5e9-01e36baa73ad');
        INSERT INTO asset_property (id, key, name, value_type, allowed_values, asset_class_id, asset_category_id) VALUES ('energy_consumption_freezing-cr', 'energy_consumption_freezing', 'Energy consumption during freezing (in KW per day)', 'FLOAT', NULL, 'fad280b6-8384-41af-84cf-c7b6b4526ef0','7db32eb6-5929-4dd1-a5e9-01e36baa73ad');
        INSERT INTO asset_property (id, key, name, value_type, allowed_values, asset_class_id, asset_category_id) VALUES ('hold_over_time-cr', 'hold_over_time', 'Hold over time (hours)', 'FLOAT', NULL, 'fad280b6-8384-41af-84cf-c7b6b4526ef0','7db32eb6-5929-4dd1-a5e9-01e36baa73ad');
        INSERT INTO asset_property (id, key, name, value_type, allowed_values, asset_class_id, asset_category_id) VALUES ('climate_zone-cr', 'climate_zone', 'Climate zone', 'STRING', NULL, 'fad280b6-8384-41af-84cf-c7b6b4526ef0','7db32eb6-5929-4dd1-a5e9-01e36baa73ad');
        INSERT INTO asset_property (id, key, name, value_type, allowed_values, asset_class_id, asset_category_id) VALUES ('freeze_protection-cr', 'freeze_protection', 'Freeze protection', 'STRING', NULL, 'fad280b6-8384-41af-84cf-c7b6b4526ef0','7db32eb6-5929-4dd1-a5e9-01e36baa73ad');
        INSERT INTO asset_property (id, key, name, value_type, allowed_values, asset_class_id, asset_category_id) VALUES ('temperature_monitoring_device-cr', 'temperature_monitoring_device', 'Temperature monitoring device', 'STRING', 'Integrated, External, None', 'fad280b6-8384-41af-84cf-c7b6b4526ef0','7db32eb6-5929-4dd1-a5e9-01e36baa73ad');
        INSERT INTO asset_property (id, key, name, value_type, allowed_values, asset_class_id, asset_category_id) VALUES ('voltage_stabilizer-cr', 'voltage_stabilizer', 'Voltage stabilizer', 'STRING', 'Integrated, External, None', 'fad280b6-8384-41af-84cf-c7b6b4526ef0','7db32eb6-5929-4dd1-a5e9-01e36baa73ad');
        INSERT INTO asset_property (id, key, name, value_type, allowed_values, asset_class_id, asset_category_id) VALUES ('energy_source-cr', 'energy_source', 'Energy Source', 'STRING', NULL, 'fad280b6-8384-41af-84cf-c7b6b4526ef0','7db32eb6-5929-4dd1-a5e9-01e36baa73ad');
        INSERT INTO asset_property (id, key, name, value_type, allowed_values, asset_class_id, asset_category_id) VALUES ('refrigerant_type-cr', 'refrigerant_type', 'Refrigerant Type(s)', 'STRING', NULL, 'fad280b6-8384-41af-84cf-c7b6b4526ef0','7db32eb6-5929-4dd1-a5e9-01e36baa73ad');
        "#,
    )?;

    /*
    Asset Properties for Fridge/Freezer rooms (asset_category_id: 02cbea92-d5bf-4832-863b-c04e093a7760)
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
    Energy Source
    Refrigerant Type(s)
    */

    sql!(
        connection,
        r#"
        INSERT INTO asset_property (id, key, name, value_type, allowed_values, asset_class_id, asset_category_id) VALUES ('storage_capacity_5c-fr', 'storage_capacity_5c', 'Storage capacity +5 °C (in litres)', 'FLOAT', NULL, 'fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760');
        INSERT INTO asset_property (id, key, name, value_type, allowed_values, asset_class_id, asset_category_id) VALUES ('storage_capacity_20c-fr', 'storage_capacity_20c', 'Storage capacity -20 °C (in litres)', 'FLOAT', NULL, 'fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760');
        INSERT INTO asset_property (id, key, name, value_type, allowed_values, asset_class_id, asset_category_id) VALUES ('storage_capacity_70c-fr', 'storage_capacity_70c', 'Storage capacity -70 °C (in litres)', 'FLOAT', NULL, 'fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760');
        INSERT INTO asset_property (id, key, name, value_type, allowed_values, asset_class_id, asset_category_id) VALUES ('waterpack_storage_capacity-fr', 'waterpack_storage_capacity', 'Waterpack storage capacity (in Kg)', 'FLOAT', NULL, 'fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760');
        INSERT INTO asset_property (id, key, name, value_type, allowed_values, asset_class_id, asset_category_id) VALUES ('waterpack_freezing_capacity-fr', 'waterpack_freezing_capacity', 'Waterpack freezing capacity per 24 hours (in Kg)', 'FLOAT', NULL, 'fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760');
        INSERT INTO asset_property (id, key, name, value_type, allowed_values, asset_class_id, asset_category_id) VALUES ('energy_consumption_stable-fr', 'energy_consumption_stable', 'Energy consumption (stable running, continuous power) (in KW per day)', 'FLOAT', NULL, 'fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760');
        INSERT INTO asset_property (id, key, name, value_type, allowed_values, asset_class_id, asset_category_id) VALUES ('energy_consumption_freezing-fr', 'energy_consumption_freezing', 'Energy consumption during freezing (in KW per day)', 'FLOAT', NULL, 'fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760');
        INSERT INTO asset_property (id, key, name, value_type, allowed_values, asset_class_id, asset_category_id) VALUES ('hold_over_time-fr', 'hold_over_time', 'Hold over time (hours)', 'FLOAT', NULL, 'fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760');
        INSERT INTO asset_property (id, key, name, value_type, allowed_values, asset_class_id, asset_category_id) VALUES ('climate_zone-fr', 'climate_zone', 'Climate zone', 'STRING', NULL, 'fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760');
        INSERT INTO asset_property (id, key, name, value_type, allowed_values, asset_class_id, asset_category_id) VALUES ('freeze_protection-fr', 'freeze_protection', 'Freeze protection', 'STRING', NULL, 'fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760');
        INSERT INTO asset_property (id, key, name, value_type, allowed_values, asset_class_id, asset_category_id) VALUES ('temperature_monitoring_device-fr', 'temperature_monitoring_device', 'Temperature monitoring device', 'STRING', 'Integrated, External, None', 'fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760');
        INSERT INTO asset_property (id, key, name, value_type, allowed_values, asset_class_id, asset_category_id) VALUES ('voltage_stabilizer-fr', 'voltage_stabilizer', 'Voltage stabilizer', 'STRING', 'Integrated, External, None', 'fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760');
        INSERT INTO asset_property (id, key, name, value_type, allowed_values, asset_class_id, asset_category_id) VALUES ('energy_source-fr', 'energy_source', 'Energy Source', 'STRING', NULL, 'fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760');
        INSERT INTO asset_property (id, key, name, value_type, allowed_values, asset_class_id, asset_category_id) VALUES ('refrigerant_type-fr', 'refrigerant_type', 'Refrigerant Type(s)', 'STRING', NULL, 'fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760');
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
        INSERT INTO asset_property (id, key, name, value_type, allowed_values, asset_class_id, asset_category_id) VALUES ('temperature_monitoring_device-ic', 'temperature_monitoring_device', 'Temperature monitoring device', 'STRING', 'Integrated, External, None', 'fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760');
        INSERT INTO asset_property (id, key, name, value_type, allowed_values, asset_class_id, asset_category_id) VALUES ('voltage_stabilizer-ic', 'voltage_stabilizer', 'Voltage stabilizer', 'STRING', 'Integrated, External, None', 'fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760');
        "#,
    )?;

    Ok(())
}
