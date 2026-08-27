use crate::migrations::constants::{COLD_CHAIN_EQUIPMENT_UUID, COLD_ROOMS_AND_FREEZER_ROOMS_UUID};
use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    // Asset Category
    sql!(
        connection,
        r#"
INSERT INTO asset_category (id, name, asset_class_id) VALUES ('{COLD_ROOMS_AND_FREEZER_ROOMS_UUID}', 'Cold rooms and freezer rooms', '{COLD_CHAIN_EQUIPMENT_UUID}');
        "#,
    )?;
    // Asset Types
    sql!(
        connection,
        r#"
INSERT INTO asset_catalogue_type (id, name, asset_category_id) VALUES ('9a4ad0dd-138a-41b2-81df-08772635085e', 'Cold room', '7db32eb6-5929-4dd1-a5e9-01e36baa73ad');
INSERT INTO asset_catalogue_type (id, name, asset_category_id) VALUES ('6d49edfd-a12b-43c8-99fb-3300d67e0192', 'Freezer room', '7db32eb6-5929-4dd1-a5e9-01e36baa73ad');
        "#
    )?;

    // Asset Catalogue Items (PQS)
    sql!(
        connection,
        r#"
        -- Porkka Finland Oy
        INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_catalogue_type_id, manufacturer, model) VALUES ('f7db1278-a70c-4bcc-8e3c-f670b9965aea','WHO PQS','E001/001-C', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '7db32eb6-5929-4dd1-a5e9-01e36baa73ad', '9a4ad0dd-138a-41b2-81df-08772635085e', 'Porkka Finland Oy', 'Custom' );
        INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_catalogue_type_id, manufacturer, model) VALUES ('5c3be815-6377-4d2a-ba56-bee5e5307e64','WHO PQS','E001/001-F', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '7db32eb6-5929-4dd1-a5e9-01e36baa73ad', '6d49edfd-a12b-43c8-99fb-3300d67e0192', 'Porkka Finland Oy', 'Custom' );
        -- SN Zhendre
        INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_catalogue_type_id, manufacturer, model) VALUES ('1cabed40-4c27-49f5-b7d2-b8305fca4802','WHO PQS','E001/002-C', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '7db32eb6-5929-4dd1-a5e9-01e36baa73ad', '9a4ad0dd-138a-41b2-81df-08772635085e', 'SN Zhendre', 'Custom' );
        INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_catalogue_type_id, manufacturer, model) VALUES ('b6de9c26-797d-49ad-a4ba-4553d5d8bd2c','WHO PQS','E001/002-F', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '7db32eb6-5929-4dd1-a5e9-01e36baa73ad', '6d49edfd-a12b-43c8-99fb-3300d67e0192', 'SN Zhendre', 'Custom' );
        -- Qingdao Haier Biomedical Co., Ltd
        INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_catalogue_type_id, manufacturer, model) VALUES ('99206b1c-d1fc-41af-9d41-9151c1382407','WHO PQS','E001/003-C', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '7db32eb6-5929-4dd1-a5e9-01e36baa73ad', '9a4ad0dd-138a-41b2-81df-08772635085e', 'Qingdao Haier Biomedical Co., Ltd', 'Custom' );
        INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_catalogue_type_id, manufacturer, model) VALUES ('2e57aa44-8f93-476f-8bdb-235b84464752','WHO PQS','E001/003-F', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '7db32eb6-5929-4dd1-a5e9-01e36baa73ad', '6d49edfd-a12b-43c8-99fb-3300d67e0192', 'Qingdao Haier Biomedical Co., Ltd', 'Custom' );
        -- Foster Refrigerator
        INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_catalogue_type_id, manufacturer, model) VALUES ('0df0ff5d-d328-4c92-94ab-e8b4d69608ee','WHO PQS','E001/004-C', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '7db32eb6-5929-4dd1-a5e9-01e36baa73ad', '9a4ad0dd-138a-41b2-81df-08772635085e', 'Foster Refrigerator', 'Custom' );
        INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_catalogue_type_id, manufacturer, model) VALUES ('c316a7bf-b09c-4af6-93bb-0af0d8f0eaa6','WHO PQS','E001/004-F', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '7db32eb6-5929-4dd1-a5e9-01e36baa73ad', '6d49edfd-a12b-43c8-99fb-3300d67e0192', 'Foster Refrigerator', 'Custom' );
        -- Viessmann Kuhlsysteme GmbH
        INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_catalogue_type_id, manufacturer, model) VALUES ('f53ba4fe-50ce-408f-a4cb-83067a767b5e','WHO PQS','E001/005-C', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '7db32eb6-5929-4dd1-a5e9-01e36baa73ad', '9a4ad0dd-138a-41b2-81df-08772635085e', 'Viessmann Kuhlsysteme GmbH', 'Custom' );
        INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_catalogue_type_id, manufacturer, model) VALUES ('4866491b-3385-41bb-803e-c04002693929','WHO PQS','E001/005-F', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '7db32eb6-5929-4dd1-a5e9-01e36baa73ad', '6d49edfd-a12b-43c8-99fb-3300d67e0192', 'Viessmann Kuhlsysteme GmbH', 'Custom' );
        "#
    )?;

    Ok(())
}
