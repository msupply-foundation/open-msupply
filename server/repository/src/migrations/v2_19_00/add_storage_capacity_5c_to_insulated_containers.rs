use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_storage_capacity_5c_to_insulated_containers"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Add the storage_capacity_5c property for the insulated containers category
        // (previously only existed for cold rooms (-cr) and refrigerators/freezers (-fr)).
        sql!(
            connection,
            r#"
            INSERT INTO asset_property (id, key, name, value_type, allowed_values, asset_class_id, asset_category_id)
            SELECT 'storage_capacity_5c-ic', 'storage_capacity_5c', 'Storage capacity +5 °C (litres)', 'FLOAT', NULL, asset_class_id, asset_category_id
            FROM asset_property
            WHERE id = 'temperature_monitoring_device-ic';
            "#
        )?;

        // Merge storage_capacity_5c into the existing properties JSON for each insulated
        // container catalogue item. Uses string replace on the closing brace, matching the
        // approach in the original PQS catalogue script (and idempotent — skips items that
        // already have the key).
        sql!(
            connection,
            r#"
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 3.00}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/002';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 6.00}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/003';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 7.00}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/004';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 20.00}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/005';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 0.80}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/007';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 1.35}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/008';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 2.50}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/009';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 18.00}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/010';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 0.90}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/011';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 23.00}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/013';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 18.00}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/015';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 16.00}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/017';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 12.00}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/018';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 7.00}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/019';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 2.60}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/020';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 1.70}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/021';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 0.90}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/022';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 6.00}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/023';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 18.00}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/024';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 20.00}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/025';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 16.00}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/026';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 15.00}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/027';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 0.90}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/028';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 1.50}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/029';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 8.00}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/030';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 22.50}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/031';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 2.60}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/032';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 6.00}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/034';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 20.25}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/036';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 2.70}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/040';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 5.40}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/041';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 16.50}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/042';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 3.40}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/043';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 1.67}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/044';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 5.50}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/045';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 22.40}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/046';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 2.90}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/047';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 1.44}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/049';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 1.50}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/050';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 1.70}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/051';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 1.60}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/052';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 1.48}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/053';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 1.70}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/054';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 3.36}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/055';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 10.70}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/056';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 15.40}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/057';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 1.51}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/058';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 1.04}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/059';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 1.65}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/060';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 1.77}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/061';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 1.18}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/063';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 20.00}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/064';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 2.40}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/065';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 1.50}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/066';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 23.70}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/067';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 21.92}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/068';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 23.00}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/069';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 1.80}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/070';
            UPDATE asset_catalogue_item SET properties = replace(properties, '}}', ', "storage_capacity_5c": 1.70}}') WHERE properties NOT LIKE '%"storage_capacity_5c"%' AND code = 'E004/071';
            "#
        )?;

        // No changelog entries: matches the original asset insert migrations. This runs on
        // every server, so emitting changelog rows would cause every site to sync the same
        // data outward. If a particular client needs the update before upgrading, the
        // changelog rows can be added manually on central.

        Ok(())
    }
}
