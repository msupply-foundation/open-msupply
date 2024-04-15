use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    // Asset Class
    sql!(
        connection,
        r#"
INSERT INTO asset_class (id, name) VALUES ('fad280b6-8384-41af-84cf-c7b6b4526ef0', 'Cold chain equipment');
        "#,
    )?;
    // Asset Category
    sql!(
        connection,
        r#"
INSERT INTO asset_category (id, name, asset_class_id) VALUES ('b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', 'Insulated containers', 'fad280b6-8384-41af-84cf-c7b6b4526ef0');
INSERT INTO asset_category (id, name, asset_class_id) VALUES ('02cbea92-d5bf-4832-863b-c04e093a7760', 'Refrigerators and freezers', 'fad280b6-8384-41af-84cf-c7b6b4526ef0');
        "#,
    )?;
    // Asset Type

    sql!(
        connection,
        r#"
INSERT INTO asset_type (id, name, asset_category_id) VALUES ('99906787-bd32-4ec2-bd2d-ba5547622bb0', 'Cold box - long range', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d');
INSERT INTO asset_type (id, name, asset_category_id) VALUES ('bbab79fe-8112-4f90-aabc-726f88a15410', 'Cold box - short range', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d');
INSERT INTO asset_type (id, name, asset_category_id) VALUES ('c9017d0b-ce3c-40f1-9986-e4afe0185ddd', 'Combined ice-lined refrigerator / freezer', '02cbea92-d5bf-4832-863b-c04e093a7760');
INSERT INTO asset_type (id, name, asset_category_id) VALUES ('0e58c7e6-e603-4513-a088-79fe9f08e22f', 'Combined refrigerator / freezer', '02cbea92-d5bf-4832-863b-c04e093a7760');
INSERT INTO asset_type (id, name, asset_category_id) VALUES ('710194ce-8c6c-47ab-b7fe-13ba8cf091f6', 'Freezer', '02cbea92-d5bf-4832-863b-c04e093a7760');
INSERT INTO asset_type (id, name, asset_category_id) VALUES ('05d9a49a-4d94-4e00-9728-2549ad323544', 'Ultralow freezer', '02cbea92-d5bf-4832-863b-c04e093a7760');
INSERT INTO asset_type (id, name, asset_category_id) VALUES ('4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Ice-lined refrigerator', '02cbea92-d5bf-4832-863b-c04e093a7760');
INSERT INTO asset_type (id, name, asset_category_id) VALUES ('f2f2756e-0c15-49fd-bb01-3f45886e4870', 'Long-term passive storage device', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d');
INSERT INTO asset_type (id, name, asset_category_id) VALUES ('fd79171f-5da8-4801-b299-9426f34310a8', 'Refrigerator', '02cbea92-d5bf-4832-863b-c04e093a7760');
INSERT INTO asset_type (id, name, asset_category_id) VALUES ('8b32f63b-28ac-4c31-94dc-55ddb5aa131a', 'Solar direct drive combined refrigerator / freezer', '02cbea92-d5bf-4832-863b-c04e093a7760');
INSERT INTO asset_type (id, name, asset_category_id) VALUES ('525b614e-f9f5-4866-9553-24bad2b7b826', 'Solar direct drive freezer', '02cbea92-d5bf-4832-863b-c04e093a7760');
INSERT INTO asset_type (id, name, asset_category_id) VALUES ('d4434727-dc35-437d-a5fa-739a491381b7', 'Solar direct drive refrigerator', '02cbea92-d5bf-4832-863b-c04e093a7760');
INSERT INTO asset_type (id, name, asset_category_id) VALUES ('0b7ac91d-6cfa-49bb-bac2-35e7cb31564b', 'Vaccine carrier', '02cbea92-d5bf-4832-863b-c04e093a7760');
INSERT INTO asset_type (id, name, asset_category_id) VALUES ('ad3405e1-ef3f-4159-b693-0e7d5fa6a814', 'Vaccine carrier - freeze-free', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d');       "#,
    )?;

    // Asset Catalogue Items (PQS)
    sql!(
        connection,
        r#"
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('4f13efbe-4349-4fc3-ac22-584728003e63','WHO PQS','E004/004', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '99906787-bd32-4ec2-bd2d-ba5547622bb0', 'B Medical Systems Sarl', 'RCW12' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('61fd9f8f-fa2c-4b91-b67c-aa4810ad089c','WHO PQS','E004/005', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '99906787-bd32-4ec2-bd2d-ba5547622bb0', 'B Medical Systems Sarl', 'RCW25' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('88ebf779-dce3-4814-b4d4-38fbbd7d3437','WHO PQS','E004/010', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '99906787-bd32-4ec2-bd2d-ba5547622bb0', 'Apex International', 'AICB-444L' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('6b472fc0-41dd-4aa1-857c-905a2e882f0b','WHO PQS','E004/013', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '99906787-bd32-4ec2-bd2d-ba5547622bb0', 'Nilkamal Limited', 'RCB-444L' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('1487cb9b-7766-4936-a296-c70bc284712d','WHO PQS','E004/015', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '99906787-bd32-4ec2-bd2d-ba5547622bb0', 'AOV International LLP', 'ACB-503L' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('5e65703e-edd7-4af4-ac01-2467c4d463e6','WHO PQS','E004/018', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '99906787-bd32-4ec2-bd2d-ba5547622bb0', 'Blowkings', 'CB-12-CF' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('b748254f-c741-4e85-8fe1-2f11a6345b08','WHO PQS','E004/023', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '99906787-bd32-4ec2-bd2d-ba5547622bb0', 'AOV International LLP', 'ACB-264SL' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('8934933b-cfc1-46d3-a799-f44561b5f6b4','WHO PQS','E004/024', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '99906787-bd32-4ec2-bd2d-ba5547622bb0', 'AOV International LLP', 'ACB-316L' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('0e5164dc-eb2d-4b8f-bfb0-f622de78385b','WHO PQS','E004/025', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '99906787-bd32-4ec2-bd2d-ba5547622bb0', 'Blowkings', 'CB-20-CF' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('ade1062d-cbcc-4cfc-ad11-4b4645458070','WHO PQS','E004/031', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '99906787-bd32-4ec2-bd2d-ba5547622bb0', 'Apex International', 'AICB 503L' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('8c6da895-1b20-4089-9a4d-d91d5038b471','WHO PQS','E004/034', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '99906787-bd32-4ec2-bd2d-ba5547622bb0', 'Nilkamal Limited', 'RCB 264SL' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('7b4ef131-10fa-4e35-a70c-ccc9ef76478e','WHO PQS','E004/036', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '99906787-bd32-4ec2-bd2d-ba5547622bb0', 'Nilkamal Limited', 'RCB 444L-A' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('38651428-95be-4d16-8b2a-5e779f47f91a','WHO PQS','E004/045', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '99906787-bd32-4ec2-bd2d-ba5547622bb0', 'Apex International', 'AICB-156L' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('28b111ca-9243-48e3-8f2d-6c67a8019e23','WHO PQS','E004/046', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '99906787-bd32-4ec2-bd2d-ba5547622bb0', 'Apex International', 'AICB-316L' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('9894255b-fcea-43fb-b3a4-01291aabe2af','WHO PQS','E004/067', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '99906787-bd32-4ec2-bd2d-ba5547622bb0', 'Nilkamal Limited', 'RCB503L' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('05a85d7b-9a25-40ce-a11e-a8a88e18a873','WHO PQS','E004/068', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '99906787-bd32-4ec2-bd2d-ba5547622bb0', 'Nilkamal Limited', 'RCB316L' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('50f9769d-a042-49ab-8433-b1d9e63d2345','WHO PQS','E004/069', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '99906787-bd32-4ec2-bd2d-ba5547622bb0', 'Qingdao Leff International Trading Co Ltd', 'FHCB23-0624' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('86dbb025-30ab-457a-981f-9d34841f9188','WHO PQS','E004/003', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', 'bbab79fe-8112-4f90-aabc-726f88a15410', 'B Medical Systems Sarl', 'RCW8' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('08b04f35-6026-4ddf-b141-2eaefac25307','WHO PQS','E004/017', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', 'bbab79fe-8112-4f90-aabc-726f88a15410', 'AOV International LLP', 'ACB 246LS' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('1b92ae8c-2841-4040-bda8-3412b52adcff','WHO PQS','E004/019', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', 'bbab79fe-8112-4f90-aabc-726f88a15410', 'Blowkings', 'CB-55-CF' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('dfda32ea-1f5b-4d42-8526-d64ec68f80fe','WHO PQS','E004/026', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', 'bbab79fe-8112-4f90-aabc-726f88a15410', 'Nilkamal Limited', 'RCB246LS' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('01bd1a67-ee4e-4c0b-aa52-5821bf721bdd','WHO PQS','E004/027', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', 'bbab79fe-8112-4f90-aabc-726f88a15410', 'Nilkamal Limited', 'RCB324SS' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('fa0b89b9-9cae-4840-882b-d04c63f28cc6','WHO PQS','E004/030', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', 'bbab79fe-8112-4f90-aabc-726f88a15410', 'Apex International', 'AICB-243s' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('3f5a5232-77b6-4bbe-bbfc-017155c3b3db','WHO PQS','E004/042', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', 'bbab79fe-8112-4f90-aabc-726f88a15410', 'EBAC CO. Ltd.', 'EBT-30' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('6f360126-45fa-41a3-8439-2cb5aa45cc8b','WHO PQS','E004/056', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', 'bbab79fe-8112-4f90-aabc-726f88a15410', 'Nilkamal Limited', 'RCB244SS' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('f17c924d-cb72-431d-8a00-514a50570449','WHO PQS','E003/070', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'c9017d0b-ce3c-40f1-9986-e4afe0185ddd', 'Vestfrost Solutions', 'VLS 064 RF AC' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('3721143e-6aca-4686-b94b-a09ab064b9c4','WHO PQS','E003/123', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'c9017d0b-ce3c-40f1-9986-e4afe0185ddd', 'B Medical Systems Sarl', 'TCW120AC' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('db64a976-85cd-497e-a960-476a50753a21','WHO PQS','E003/131', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'c9017d0b-ce3c-40f1-9986-e4afe0185ddd', 'Qingdao Haier Biomedical Co., Ltd', 'HBD265' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('57a4b8f7-0863-4a8d-a24a-1ee81dc61648','WHO PQS','E003/097', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '0e58c7e6-e603-4513-a088-79fe9f08e22f', 'Qingdao Haier Biomedical Co., Ltd', 'HBCD-90' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('1cf5fa83-4fd0-4e23-a5ac-dec720f52fcd','WHO PQS','E003/103', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '0e58c7e6-e603-4513-a088-79fe9f08e22f', 'Godrej & Boyce MFG. Co. Ltd.', 'GVR 55 FF AC' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('cb1167ed-683f-4bb0-a67b-129231af7dda','WHO PQS','E003/138', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '0e58c7e6-e603-4513-a088-79fe9f08e22f', 'B Medical Systems Sarl', 'TVW4000AC' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('7d73bfdb-76ca-4cfa-ac52-6215048bebbb','WHO PQS','E003/060', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '710194ce-8c6c-47ab-b7fe-13ba8cf091f6', 'Qingdao Aucma Global Medical Co.,Ltd.', 'DW-25W147' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('9a4f0ebf-a9cf-4e73-b8fc-5aede8fa88c3','WHO PQS','E003/061', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '710194ce-8c6c-47ab-b7fe-13ba8cf091f6', 'Qingdao Aucma Global Medical Co.,Ltd.', 'DW-25W300' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('0bbf332d-52bd-41aa-ba7d-d7709f08eeed','WHO PQS','E003/127', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '710194ce-8c6c-47ab-b7fe-13ba8cf091f6', 'Western Refrigeration Private Limited', 'VFW140H-HC' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('c7d48b5c-74b2-4077-94f5-2b25d67a447b','WHO PQS','E003/002', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '710194ce-8c6c-47ab-b7fe-13ba8cf091f6', 'Qingdao Haier Biomedical Co., Ltd', 'HBD 116' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('23bcee45-886e-42c3-8661-4e56b9bb6ff0','WHO PQS','E003/003', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '710194ce-8c6c-47ab-b7fe-13ba8cf091f6', 'Qingdao Haier Biomedical Co., Ltd', 'HBD 286' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('a067b53b-ca3e-4de9-ae5e-a19d91ce1cc5','WHO PQS','E003/023', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '710194ce-8c6c-47ab-b7fe-13ba8cf091f6', 'Vestfrost Solutions', 'MF 314' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('b1278bbb-e818-4bb5-9839-2b8b287c637e','WHO PQS','E003/024', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '710194ce-8c6c-47ab-b7fe-13ba8cf091f6', 'Vestfrost Solutions', 'MF 114' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('33cad6a0-4e2c-4b0f-8bb0-c1961aba8740','WHO PQS','E003/025', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '710194ce-8c6c-47ab-b7fe-13ba8cf091f6', 'Vestfrost Solutions', 'MF 214' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('8cd56b7f-6f4e-478e-be9b-33b54d8a0c97','WHO PQS','E003/126', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '710194ce-8c6c-47ab-b7fe-13ba8cf091f6', 'Qingdao Haier Biomedical Co., Ltd', 'HBD-86' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('536d23cd-f797-4558-8fa8-c509077a229e','WHO PQS','E003/128', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '710194ce-8c6c-47ab-b7fe-13ba8cf091f6', 'Western Refrigeration Private Limited', 'VFW310H-HC' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('e779cf64-d940-4500-98f2-171fbd0f3ec9','WHO PQS','E003/130', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '710194ce-8c6c-47ab-b7fe-13ba8cf091f6', 'Godrej & Boyce MFG. Co. Ltd.', 'GMF 200 ECO lite' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('e6be81b8-151f-4e90-87e9-f8af776c7252','WHO PQS','E003/071', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '710194ce-8c6c-47ab-b7fe-13ba8cf091f6', 'B Medical Systems Sarl', 'TFW 3000 AC' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('42fe34c3-9f9d-4a2a-b15d-6177f7586e43','WHO PQS','E003/125', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '05d9a49a-4d94-4e00-9728-2549ad323544', 'B Medical Systems Sarl', 'U201' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('9d77cc99-6098-438a-8242-0bb55a450b49','WHO PQS','E003/007', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Vestfrost Solutions', 'MK 304' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('e5dc3c5e-bc12-4ea4-a3d2-c4c3b30cb753','WHO PQS','E003/011', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Vestfrost Solutions', 'MK 204' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('981c12f8-b054-4793-aab1-4f8363b4191c','WHO PQS','E003/022', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Vestfrost Solutions', 'MK 144' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('53a49c7e-168d-4599-8a5e-5da9281914c4','WHO PQS','E003/044', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Zero Appliances (Pty) Ltd', 'ZLF 150 AC (SureChill ®)' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('aee18a7b-0b1f-4448-a08d-37b9d61c240c','WHO PQS','E003/051', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Zero Appliances (Pty) Ltd', 'ZLF30 AC (SureChill ®)' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('2f74670b-5081-42d5-852c-8ce392b6a536','WHO PQS','E003/066', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'B Medical Systems Sarl', 'TCW 4000 AC' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('f1ba0107-8465-44f2-aa3b-36944dce498a','WHO PQS','E003/072', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Dulas Ltd', 'VC225ILR' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('6f9f4cf0-7d70-4448-8b0a-57ecf3361912','WHO PQS','E003/079', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Qingdao Aucma Global Medical Co.,Ltd.', 'CFD-50' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('d3920fb9-7927-4549-ab3b-fd13498fb570','WHO PQS','E003/080', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Godrej & Boyce MFG. Co. Ltd.', 'GVR 51 LITE AC' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('59a197c5-76ab-47ec-84fc-8a2802f1d1be','WHO PQS','E003/081', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Godrej & Boyce MFG. Co. Ltd.', 'GVR 75 Lite' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('5f5b435f-8520-4dbf-84db-4db43f0ebbd0','WHO PQS','E003/082', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Godrej & Boyce MFG. Co. Ltd.', 'GVR 99 Lite' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('92a77272-d0c0-43f6-85ec-647c9447f194','WHO PQS','E003/083', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Godrej & Boyce MFG. Co. Ltd.', 'GVR 225 AC' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('f7270d64-1680-4928-9fa4-a0ab01af698c','WHO PQS','E003/087', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Qingdao Haier Biomedical Co., Ltd', 'HBC-260' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('087e7310-8781-412f-99b6-f3b0c0afd7eb','WHO PQS','E003/088', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Qingdao Haier Biomedical Co., Ltd', 'HBC-150' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('6baa49bf-4412-42d0-a50d-c4758f96a071','WHO PQS','E003/089', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Qingdao Haier Biomedical Co., Ltd', 'HBC-80' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('9ba05fbe-3a24-4f1b-af33-d45dd9de8fa8','WHO PQS','E003/096', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Zero Appliances (Pty) Ltd', 'ZLF80AC (SureChill®)' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('b50409f4-89d5-4cef-a6e0-6185e2df9ce7','WHO PQS','E003/100', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'B Medical Systems Sarl', 'TCW 40R AC' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('9cb9524f-b96d-4750-8d1d-28a3f239ef2b','WHO PQS','E003/101', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'B Medical Systems Sarl', 'TCW 80 AC' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('a1e4b0e1-f1e2-4217-b8c9-906ef901b14c','WHO PQS','E003/110', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Vestfrost Solutions', 'VLS 304A AC' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('a609ed46-7cc3-4c3f-bf6e-de406fdac81a','WHO PQS','E003/111', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Vestfrost Solutions', 'VLS 354A AC' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('c19638fd-cefc-4369-9284-6fd67e4830ab','WHO PQS','E003/112', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Vestfrost Solutions', 'VLS 404A AC' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('f6011b71-4590-4d4a-bf12-0bd04cd79d4a','WHO PQS','E003/113', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Vestfrost Solutions', 'VLS 504A AC' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('e8bfd677-cd75-4344-bf3f-696abe951c71','WHO PQS','E003/114', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Qingdao Haier Biomedical Co., Ltd', 'HBC-120' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('5bf69a09-f734-4689-b1b6-2856155f3546','WHO PQS','E003/115', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Qingdao Haier Biomedical Co., Ltd', 'HBC-240' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('2ce1032f-311e-420e-a854-bef87c3147e5','WHO PQS','E003/120', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Vestfrost Solutions', 'VLS 174A AC' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('cd9caec3-bf95-4ce3-a1f6-64e3e11b390a','WHO PQS','E003/122', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Coolfinity Medical B.V.', 'IceVolt 300P' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('d087d824-efa1-494a-90a8-f3a9d1519c61','WHO PQS','E003/133', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Western Refrigeration Private Limited', 'I425H120' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('08b2711a-912b-4023-a94c-62f2f7ff15da','WHO PQS','E003/136', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Godrej & Boyce MFG. Co. Ltd.', 'GHR 200 AC' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('bb658a06-2699-43ca-a700-cd5604838a60','WHO PQS','E003/137', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Godrej & Boyce MFG. Co. Ltd.', 'GHR 90 AC' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('869ff8de-9c4b-4425-a894-0b0c6cd3bf14','WHO PQS','E003/139', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Godrej & Boyce MFG. Co. Ltd.', 'GHR 150 AC' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('bc0bad9a-744a-46f4-bb65-bc317897cd0b','WHO PQS','E004/041', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', 'f2f2756e-0c15-49fd-bb01-3f45886e4870', 'Qingdao Aucma Global Medical Co.,Ltd.', 'ARKTEK™ model YBC-5 (P6)' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('781f4e20-e317-4e8a-b7c8-263c95d6b675','WHO PQS','E003/109', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'fd79171f-5da8-4801-b299-9426f34310a8', 'Vestfrost Solutions', 'VLS 204A' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('783da0b3-f157-46a2-9b78-1430b8680753','WHO PQS','E003/035', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '8b32f63b-28ac-4c31-94dc-55ddb5aa131a', 'B Medical Systems Sarl', 'TCW 2000 SDD' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('7b54d581-13c6-4f70-8a2f-a736fb12c881','WHO PQS','E003/042', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '8b32f63b-28ac-4c31-94dc-55ddb5aa131a', 'B Medical Systems Sarl', 'TCW 40 SDD' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('6ff0747c-1639-403b-95e9-7e1dbca8a917','WHO PQS','E003/043', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '8b32f63b-28ac-4c31-94dc-55ddb5aa131a', 'B Medical Systems Sarl', 'TCW 2043 SDD' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('222111ec-4aa3-41ce-8c35-b86f3fa08d23','WHO PQS','E003/048', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '8b32f63b-28ac-4c31-94dc-55ddb5aa131a', 'Dulas Ltd', 'VC150SDD' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('1b2c352a-5c69-4b76-a411-d93be56cc05a','WHO PQS','E003/057', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '8b32f63b-28ac-4c31-94dc-55ddb5aa131a', 'Qingdao Haier Biomedical Co., Ltd', 'HTCD-160-SDD' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('f400cd20-29f2-42c6-9805-df6458eba554','WHO PQS','E003/074', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '8b32f63b-28ac-4c31-94dc-55ddb5aa131a', 'Qingdao Haier Biomedical Co., Ltd', 'HTCD 90 SDD' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('5005ff6c-6f9c-44ce-bd5f-4fd3c9b5fc84','WHO PQS','E003/077', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '8b32f63b-28ac-4c31-94dc-55ddb5aa131a', 'B Medical Systems Sarl', 'TCW15 SDD' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('eda9ae25-6184-4141-80a0-e1b0940f7f1d','WHO PQS','E003/091', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '8b32f63b-28ac-4c31-94dc-55ddb5aa131a', 'Vestfrost Solutions', 'VLS 026 RF SDD' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('fff04c75-2f70-45e2-ac3b-89c054240ca7','WHO PQS','E003/092', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '8b32f63b-28ac-4c31-94dc-55ddb5aa131a', 'Vestfrost Solutions', 'VLS 056 RF SDD' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('8a64271b-011d-4320-a1da-66c6bed2befa','WHO PQS','E003/095', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '8b32f63b-28ac-4c31-94dc-55ddb5aa131a', 'Godrej & Boyce MFG. Co. Ltd.', 'GVR 55 FF DC' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('7964fff0-ea1d-46ff-88fd-4e9c9eacc685','WHO PQS','E003/119', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '8b32f63b-28ac-4c31-94dc-55ddb5aa131a', 'Vestfrost Solutions', 'VLS 076 RF SDD' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('beb89f3c-e33b-4ab2-9032-69f313681c24','WHO PQS','E003/129', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '8b32f63b-28ac-4c31-94dc-55ddb5aa131a', 'Qingdao Aucma Global Medical Co.,Ltd.', 'TCD-100' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('92076de4-2dc7-4c6f-9c7d-b7c1141aa8e7','WHO PQS','E003/132', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '8b32f63b-28ac-4c31-94dc-55ddb5aa131a', 'Vestfrost Solutions', 'VLS 096A RF SDD' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('e2e9d099-5eea-422c-95b6-e1dfc536b9eb','WHO PQS','E003/124', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '8b32f63b-28ac-4c31-94dc-55ddb5aa131a', 'B Medical Systems Sarl', 'TCW120SDD' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('bcf6e728-1df6-4b30-bd24-300981eecbaa','WHO PQS','E003/073', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '525b614e-f9f5-4866-9553-24bad2b7b826', 'B Medical Systems Sarl', 'TFW 40 SDD' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('4901660d-315f-4c1c-9550-db33e8bed04f','WHO PQS','E003/086', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '525b614e-f9f5-4866-9553-24bad2b7b826', 'Qingdao Haier Biomedical Co., Ltd', 'HTD-40' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('8948b544-8283-4d19-b523-bfff7ef10967','WHO PQS','E003/099', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '525b614e-f9f5-4866-9553-24bad2b7b826', 'Vestfrost Solutions', 'VFS 048 SDD' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('5752325d-f156-45d2-ae37-3905edf43690','WHO PQS','E003/030', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'B Medical Systems Sarl', 'TCW 3000 SDD' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('b5c76f4d-c0ef-4260-897c-f8e661ec1b68','WHO PQS','E003/037', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'Zero Appliances (Pty) Ltd', 'ZLF 100 DC (SureChill ®)' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('d3239141-6073-4fb0-b3ea-55664a415917','WHO PQS','E003/040', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'Dulas Ltd', 'VC200SDD' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('48a73892-0391-48e6-bea7-a2c5e7963ad3','WHO PQS','E003/045', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'B Medical Systems Sarl', 'TCW 3043 SDD' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('4b40f057-a760-4944-9672-cd4f34810fae','WHO PQS','E003/049', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'Godrej & Boyce MFG. Co. Ltd.', 'GVR 50DC SDD' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('1b3c5ed3-3dc5-4a94-b70b-bbc7442fa173','WHO PQS','E003/050', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'Godrej & Boyce MFG. Co. Ltd.', 'GVR 100 DC (SureChill®)' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('ca835a1e-984d-46b5-b7e0-67d26dbbd630','WHO PQS','E003/052', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'Zero Appliances (Pty) Ltd', 'ZLF 150 DC (SureChill ®)' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('3f2f5cb5-11f7-4f70-8cf3-1facf6e81ef0','WHO PQS','E003/055', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'Zero Appliances (Pty) Ltd', 'ZLF 30DC SDD (SureChill ®)' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('f1d7348d-f38d-4a74-ab0a-45227b89d314','WHO PQS','E003/058', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'Dulas Ltd', 'Dulas VC110SDD' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('03a22d21-658c-4b4d-92f7-ae0b5e5f96ce','WHO PQS','E003/059', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'Dulas Ltd', 'VC88SDD' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('af28530e-b31a-4359-9209-fdf1d7b38f1e','WHO PQS','E003/067', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'B Medical Systems Sarl', 'TCW 15R SDD' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('589736aa-d375-4905-9ff7-4faae9eedece','WHO PQS','E003/068', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'B Medical Systems Sarl', 'TCW 40R SDD' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('a00dffee-a550-44d8-b473-1d512f6c9995','WHO PQS','E003/069', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'Vestfrost Solutions', 'VLS 024 SDD' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('cf2569d8-e3cf-4e00-b11c-e1088555bb7a','WHO PQS','E003/075', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'Qingdao Haier Biomedical Co., Ltd', 'HTC 40 SDD' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('8db398a9-3640-4675-81d9-19f5ab3f25de','WHO PQS','E003/076', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'Qingdao Haier Biomedical Co., Ltd', 'HTC 110 SDD' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('676d2697-c7f5-4ea6-a2e9-b6f8bce2bd4e','WHO PQS','E003/078', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'Dulas Ltd', 'VC50SDD' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('4151bc4d-598d-4334-86b6-668f4ee5e5e9','WHO PQS','E003/084', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'Dulas Ltd', 'VC60SDD-1' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('cc2404af-1863-438d-8ff9-38d66e4f6796','WHO PQS','E003/085', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'Dulas Ltd', 'VC30SDD' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('1a85c145-29d2-4343-9010-d52d981bd009','WHO PQS','E003/090', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'B Medical Systems Sarl', 'Ultra 16 SDD' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('27852f5c-a5db-4b1f-a311-9ff67e74cb88','WHO PQS','E003/093', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'B Medical Systems Sarl', 'TCW 4000 SDD' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('0fbb3210-3c90-41df-b39e-eefe032f738a','WHO PQS','E003/098', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'Qingdao Aucma Global Medical Co.,Ltd.', 'CFD-50 SDD' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('407d4a90-c403-46c3-bf57-31c2fe1ad0e0','WHO PQS','E003/102', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'Qingdao Haier Biomedical Co., Ltd', 'HTC-112' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('de7bf4b4-52f4-4bbe-8155-7f0d08aa01f5','WHO PQS','E003/106', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'Vestfrost Solutions', 'VLS 054A SDD' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('460fd161-1f25-40dd-aafa-39dac9f8690b','WHO PQS','E003/107', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'Vestfrost Solutions', 'VLS 094A SDD' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('e2285ed2-1492-41c2-8933-79591c179ec5','WHO PQS','E003/108', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'Vestfrost Solutions', 'VLS 154A SDD Greenline' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('f04d5fd1-150d-4ee7-8011-151f74dc42e2','WHO PQS','E003/116', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'Qingdao Haier Biomedical Co., Ltd', 'HTC-120-SDD' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('c6ba691e-c574-4031-9ba7-65c8df849e61','WHO PQS','E003/117', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'Qingdao Haier Biomedical Co., Ltd', 'HTC-240-SDD' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('b38f7ece-a922-4dbf-9000-f78854a55a17','WHO PQS','E003/118', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'Qingdao Aucma Global Medical Co.,Ltd.', 'ARKTEK YBC-10 SDD' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('eae13af2-4e0a-4438-8594-89a350a96cdd','WHO PQS','E003/121', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'B Medical Systems Sarl', 'TCW80-SDD' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('051009da-3162-487c-b7da-e6f7be61ca53','WHO PQS','E003/135', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'Qingdao Haier Biomedical Co., Ltd', 'HTCD-160B' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('b7899fc3-972e-439b-9289-8421d344d1df','WHO PQS','E003/134', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '0b7ac91d-6cfa-49bb-bac2-35e7cb31564b', 'BlackFrog Technologies Private Limited', 'Emvolio Plus' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('c74a3f72-fda6-4bb8-a08f-5f79a20a8716','WHO PQS','E004/002', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '0b7ac91d-6cfa-49bb-bac2-35e7cb31564b', 'B Medical Systems Sarl', 'RCW4' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('55042f99-370b-407b-9155-d4a594595abc','WHO PQS','E004/007', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '0b7ac91d-6cfa-49bb-bac2-35e7cb31564b', 'AOV International LLP', 'ADVC-24' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('c6ee8e1f-1219-4455-83a2-dd991a89d6a0','WHO PQS','E004/008', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '0b7ac91d-6cfa-49bb-bac2-35e7cb31564b', 'AOV International LLP', 'AVC-44' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('40f215fb-3eb9-4fa4-9c80-b08f275db34f','WHO PQS','E004/009', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '0b7ac91d-6cfa-49bb-bac2-35e7cb31564b', 'AOV International LLP', 'AVC-46' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('32181403-62bc-4895-b5eb-4d76cd566920','WHO PQS','E004/011', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '0b7ac91d-6cfa-49bb-bac2-35e7cb31564b', 'Apex International', 'AIDVC-24' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('d1f6c228-72ed-477c-adf8-bf72b8b875f1','WHO PQS','E004/020', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '0b7ac91d-6cfa-49bb-bac2-35e7cb31564b', 'Blowkings', 'BK-VC 2.6-CF' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('f3e9c894-ab61-4513-a26b-efc7f8056026','WHO PQS','E004/021', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '0b7ac91d-6cfa-49bb-bac2-35e7cb31564b', 'Blowkings', 'BK-VC 1.7-CF' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('edd6ccce-437c-4d1c-97c8-e24001929e9c','WHO PQS','E004/022', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '0b7ac91d-6cfa-49bb-bac2-35e7cb31564b', 'Blowkings', 'VDC-24-CF' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('5a3bf0db-4ba3-456a-8ae0-a63e1503caa1','WHO PQS','E004/028', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '0b7ac91d-6cfa-49bb-bac2-35e7cb31564b', 'Nilkamal Limited', 'BBVC23' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('b08b1aba-3b41-470c-846a-c6d61514d547','WHO PQS','E004/029', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '0b7ac91d-6cfa-49bb-bac2-35e7cb31564b', 'Nilkamal Limited', 'BCVC43' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('661abdb9-2782-459f-ab37-924c757851f9','WHO PQS','E004/032', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '0b7ac91d-6cfa-49bb-bac2-35e7cb31564b', 'Giostyle SpA', 'GioStyle VC 2.6L' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('d8fe26dc-7dfd-4bcd-96e3-034ff73387b4','WHO PQS','E004/040', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '0b7ac91d-6cfa-49bb-bac2-35e7cb31564b', 'Nilkamal Limited', 'Vaccine carrier LR BCVC46' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('cad62a7b-9765-4a43-b82e-a2e2ffb8fdc3','WHO PQS','E004/043', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '0b7ac91d-6cfa-49bb-bac2-35e7cb31564b', 'Blowkings', 'BK-VC 3.4 -CF' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('d6ea93ba-4346-434a-a024-7984bb125b2c','WHO PQS','E004/044', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '0b7ac91d-6cfa-49bb-bac2-35e7cb31564b', 'Apex International', 'AIVC-44LR' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('d167df7b-c6e3-41f2-8b02-86254ee0d4f6','WHO PQS','E004/047', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '0b7ac91d-6cfa-49bb-bac2-35e7cb31564b', 'Apex International', 'AIVC-46' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('c8c517f8-9371-493f-8c5a-417e1db0f23f','WHO PQS','E004/049', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '0b7ac91d-6cfa-49bb-bac2-35e7cb31564b', 'Nilkamal Limited', 'BCVC43A' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('8580876d-6ba4-4c62-8e37-51bb16ce9bca','WHO PQS','E004/053', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '0b7ac91d-6cfa-49bb-bac2-35e7cb31564b', 'Nilkamal Limited', 'BCVC44B' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('6b3f1728-e4fd-49d1-a4f4-36ade1416b49','WHO PQS','E004/054', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '0b7ac91d-6cfa-49bb-bac2-35e7cb31564b', 'Nilkamal Limited', 'BDVC44' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('b8ce710a-a07f-4818-857b-eb6e1e27147e','WHO PQS','E004/055', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '0b7ac91d-6cfa-49bb-bac2-35e7cb31564b', 'Nilkamal Limited', 'BDVC46' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('e68c1615-70e4-4753-8814-5d2c54ad4d1b','WHO PQS','E004/059', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '0b7ac91d-6cfa-49bb-bac2-35e7cb31564b', 'B Medical Systems Sarl', 'RCW1' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('f63dddb0-eb02-43ed-9ae5-e13ad2632542','WHO PQS','E004/060', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '0b7ac91d-6cfa-49bb-bac2-35e7cb31564b', 'Rajas Enterprises', 'RE0333VC' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('56744764-b8af-40c1-a370-f8e34c99cb6a','WHO PQS','E004/061', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '0b7ac91d-6cfa-49bb-bac2-35e7cb31564b', 'PARACOAT PRODUCTS LTD', '2CPCPVC-001' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('39d90134-a7d3-4c1e-860b-95d11de90fcc','WHO PQS','E004/050', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', 'ad3405e1-ef3f-4159-b693-0e7d5fa6a814', 'AOV International LLP', 'AFVC-46' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('ce5edb48-84e0-4ccb-beb6-518c4de86b47','WHO PQS','E004/051', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', 'ad3405e1-ef3f-4159-b693-0e7d5fa6a814', 'Qingdao Leff International Trading Co Ltd', 'FFVC-1.7L' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('aaaf4b4b-803f-4ab5-83e5-eea2dc43250f','WHO PQS','E004/052', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', 'ad3405e1-ef3f-4159-b693-0e7d5fa6a814', 'Blowkings', 'BK-FF-VC-1.6L' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('cd83c1f9-8d64-46bb-afde-23ef64abfc81','WHO PQS','E004/057', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', 'ad3405e1-ef3f-4159-b693-0e7d5fa6a814', 'Qingdao Leff International Trading Co Ltd', 'FFCB-15L' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('58cd1449-95cb-40da-b33a-17bd25f62b7e','WHO PQS','E004/058', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', 'ad3405e1-ef3f-4159-b693-0e7d5fa6a814', 'Nilkamal Limited', 'BCVC46LFF' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('4d7c245f-5d10-4bac-b37b-e61eba497f3e','WHO PQS','E004/063', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', 'ad3405e1-ef3f-4159-b693-0e7d5fa6a814', 'AOV International LLP', 'AFVC44' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('e30e1f14-2957-4336-8a08-229f044f67ec','WHO PQS','E004/064', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', 'ad3405e1-ef3f-4159-b693-0e7d5fa6a814', 'Qingdao Leff International Trading Co Ltd', 'FFCB-20L' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('3ce28e4d-6d28-41d8-b6a2-1c94ea0c1866','WHO PQS','E004/065', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', 'ad3405e1-ef3f-4159-b693-0e7d5fa6a814', 'Blowkings', 'BK-VC-FF 2.4 L' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('c6136467-58b1-4904-a82b-81427fef4ad8','WHO PQS','E004/066', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', 'ad3405e1-ef3f-4159-b693-0e7d5fa6a814', 'TRIMURTI PLAST CONTAINERS PRIVATE LIMITED', 'TPVC 46 LFF' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('440df6fb-dc3b-4ce7-b7c3-3b034c74e1d2','WHO PQS','E004/070', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', 'ad3405e1-ef3f-4159-b693-0e7d5fa6a814', 'Gobi Technologies', 'FF001A Eclipse 1.8L' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('a3f03639-4a5a-4393-801c-639d73dba762','WHO PQS','E004/071', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', 'ad3405e1-ef3f-4159-b693-0e7d5fa6a814', 'GKS Healthsol LLP', 'GKS FFVC-44LR' );
INSERT INTO asset_catalogue_item (id, sub_catalogue, code, asset_class_id, asset_category_id, asset_type_id, manufacturer, model) VALUES ('189ef51c-d232-4da7-b090-ca3a53d31f58','WHO PQS','E004/072', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', 'ad3405e1-ef3f-4159-b693-0e7d5fa6a814', 'GKS Healthsol LLP', 'FFVC 44SR' );
    "#,
    )?;

    // Asset Catalogue Property
    sql!(
        connection,
        r#"
INSERT INTO asset_catalogue_property (id, asset_category_id, name, type, allowed_values) VALUES ('7613ef45-6410-41dc-a50a-c8fabf80cf71', '02cbea92-d5bf-4832-863b-c04e093a7760', 'Energy source', 'STRING', 'Electricity,Solar,Passive,Kerosene,Gas');
INSERT INTO asset_catalogue_property (id, asset_category_id, name, type) VALUES ('1520c497-e498-478b-bc8d-bbb57a93fd16', '02cbea92-d5bf-4832-863b-c04e093a7760', 'Storage volume (+5 °C)', 'INTEGER');
INSERT INTO asset_catalogue_property (id, asset_category_id, name, type) VALUES ('9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93', '02cbea92-d5bf-4832-863b-c04e093a7760', 'Storage volume (-20 °C)', 'INTEGER');
INSERT INTO asset_catalogue_property (id, asset_category_id, name, type) VALUES ('4c15f2b6-6043-46f7-a3b2-e26077292224', '02cbea92-d5bf-4832-863b-c04e093a7760', 'Storage volume (-70 °C)', 'INTEGER');
    "#,
    )?;

    // Asset Catalogue Property
    sql!(
        connection,
        r#"
        --Code: 'E003/070'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('e30125df-c5bb-4686-97d6-ef09a06db1c0', 'f17c924d-cb72-431d-8a00-514a50570449','7613ef45-6410-41dc-a50a-c8fabf80cf71','Electricity');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('9583ce04-b352-4332-b533-08b7aa3e9a1c', 'f17c924d-cb72-431d-8a00-514a50570449','1520c497-e498-478b-bc8d-bbb57a93fd16',75);
        --Code: 'E003/123'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('ba5beb82-fafe-40bd-ae1e-a144f84007df', '3721143e-6aca-4686-b94b-a09ab064b9c4','7613ef45-6410-41dc-a50a-c8fabf80cf71','Electricity');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('d315b963-33fd-4033-99c2-a9a757330854', '3721143e-6aca-4686-b94b-a09ab064b9c4','1520c497-e498-478b-bc8d-bbb57a93fd16',120);
        --Code: 'E003/131'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('47007c44-ee27-4483-a215-503dbb1cbf71', ''db64a976-85cd-497e-a960-476a50753a21'','7613ef45-6410-41dc-a50a-c8fabf80cf71','Electricity');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('4340b79d-a57b-40f1-bcc0-3959f99f7827', ''db64a976-85cd-497e-a960-476a50753a21'','1520c497-e498-478b-bc8d-bbb57a93fd16',211);
        --Code: 'E003/097'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''57a4b8f7-0863-4a8d-a24a-1ee81dc61648'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''57a4b8f7-0863-4a8d-a24a-1ee81dc61648'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''57a4b8f7-0863-4a8d-a24a-1ee81dc61648'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''57a4b8f7-0863-4a8d-a24a-1ee81dc61648'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/103'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''1cf5fa83-4fd0-4e23-a5ac-dec720f52fcd'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''1cf5fa83-4fd0-4e23-a5ac-dec720f52fcd'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''1cf5fa83-4fd0-4e23-a5ac-dec720f52fcd'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''1cf5fa83-4fd0-4e23-a5ac-dec720f52fcd'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/138'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''cb1167ed-683f-4bb0-a67b-129231af7dda'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''cb1167ed-683f-4bb0-a67b-129231af7dda'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''cb1167ed-683f-4bb0-a67b-129231af7dda'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''cb1167ed-683f-4bb0-a67b-129231af7dda'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/060'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''7d73bfdb-76ca-4cfa-ac52-6215048bebbb'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''7d73bfdb-76ca-4cfa-ac52-6215048bebbb'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''7d73bfdb-76ca-4cfa-ac52-6215048bebbb'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''7d73bfdb-76ca-4cfa-ac52-6215048bebbb'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/061'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''9a4f0ebf-a9cf-4e73-b8fc-5aede8fa88c3'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''9a4f0ebf-a9cf-4e73-b8fc-5aede8fa88c3'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''9a4f0ebf-a9cf-4e73-b8fc-5aede8fa88c3'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''9a4f0ebf-a9cf-4e73-b8fc-5aede8fa88c3'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/127'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''0bbf332d-52bd-41aa-ba7d-d7709f08eeed'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''0bbf332d-52bd-41aa-ba7d-d7709f08eeed'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''0bbf332d-52bd-41aa-ba7d-d7709f08eeed'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''0bbf332d-52bd-41aa-ba7d-d7709f08eeed'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/002'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''c7d48b5c-74b2-4077-94f5-2b25d67a447b'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''c7d48b5c-74b2-4077-94f5-2b25d67a447b'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''c7d48b5c-74b2-4077-94f5-2b25d67a447b'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''c7d48b5c-74b2-4077-94f5-2b25d67a447b'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/003'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''23bcee45-886e-42c3-8661-4e56b9bb6ff0'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''23bcee45-886e-42c3-8661-4e56b9bb6ff0'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''23bcee45-886e-42c3-8661-4e56b9bb6ff0'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''23bcee45-886e-42c3-8661-4e56b9bb6ff0'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/023'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''a067b53b-ca3e-4de9-ae5e-a19d91ce1cc5'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''a067b53b-ca3e-4de9-ae5e-a19d91ce1cc5'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''a067b53b-ca3e-4de9-ae5e-a19d91ce1cc5'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''a067b53b-ca3e-4de9-ae5e-a19d91ce1cc5'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/024'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''b1278bbb-e818-4bb5-9839-2b8b287c637e'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''b1278bbb-e818-4bb5-9839-2b8b287c637e'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''b1278bbb-e818-4bb5-9839-2b8b287c637e'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''b1278bbb-e818-4bb5-9839-2b8b287c637e'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/025'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''33cad6a0-4e2c-4b0f-8bb0-c1961aba8740'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''33cad6a0-4e2c-4b0f-8bb0-c1961aba8740'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''33cad6a0-4e2c-4b0f-8bb0-c1961aba8740'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''33cad6a0-4e2c-4b0f-8bb0-c1961aba8740'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/126'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''8cd56b7f-6f4e-478e-be9b-33b54d8a0c97'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''8cd56b7f-6f4e-478e-be9b-33b54d8a0c97'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''8cd56b7f-6f4e-478e-be9b-33b54d8a0c97'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''8cd56b7f-6f4e-478e-be9b-33b54d8a0c97'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/128'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''536d23cd-f797-4558-8fa8-c509077a229e'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''536d23cd-f797-4558-8fa8-c509077a229e'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''536d23cd-f797-4558-8fa8-c509077a229e'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''536d23cd-f797-4558-8fa8-c509077a229e'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/130'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''e779cf64-d940-4500-98f2-171fbd0f3ec9'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''e779cf64-d940-4500-98f2-171fbd0f3ec9'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''e779cf64-d940-4500-98f2-171fbd0f3ec9'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''e779cf64-d940-4500-98f2-171fbd0f3ec9'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/071'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''e6be81b8-151f-4e90-87e9-f8af776c7252'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''e6be81b8-151f-4e90-87e9-f8af776c7252'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''e6be81b8-151f-4e90-87e9-f8af776c7252'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''e6be81b8-151f-4e90-87e9-f8af776c7252'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/125'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''42fe34c3-9f9d-4a2a-b15d-6177f7586e43'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''42fe34c3-9f9d-4a2a-b15d-6177f7586e43'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''42fe34c3-9f9d-4a2a-b15d-6177f7586e43'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''42fe34c3-9f9d-4a2a-b15d-6177f7586e43'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/007'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''9d77cc99-6098-438a-8242-0bb55a450b49'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''9d77cc99-6098-438a-8242-0bb55a450b49'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''9d77cc99-6098-438a-8242-0bb55a450b49'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''9d77cc99-6098-438a-8242-0bb55a450b49'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/011'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''e5dc3c5e-bc12-4ea4-a3d2-c4c3b30cb753'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''e5dc3c5e-bc12-4ea4-a3d2-c4c3b30cb753'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''e5dc3c5e-bc12-4ea4-a3d2-c4c3b30cb753'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''e5dc3c5e-bc12-4ea4-a3d2-c4c3b30cb753'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/022'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''981c12f8-b054-4793-aab1-4f8363b4191c'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''981c12f8-b054-4793-aab1-4f8363b4191c'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''981c12f8-b054-4793-aab1-4f8363b4191c'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''981c12f8-b054-4793-aab1-4f8363b4191c'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/044'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''53a49c7e-168d-4599-8a5e-5da9281914c4'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''53a49c7e-168d-4599-8a5e-5da9281914c4'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''53a49c7e-168d-4599-8a5e-5da9281914c4'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''53a49c7e-168d-4599-8a5e-5da9281914c4'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/051'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''aee18a7b-0b1f-4448-a08d-37b9d61c240c'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''aee18a7b-0b1f-4448-a08d-37b9d61c240c'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''aee18a7b-0b1f-4448-a08d-37b9d61c240c'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''aee18a7b-0b1f-4448-a08d-37b9d61c240c'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/066'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''2f74670b-5081-42d5-852c-8ce392b6a536'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''2f74670b-5081-42d5-852c-8ce392b6a536'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''2f74670b-5081-42d5-852c-8ce392b6a536'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''2f74670b-5081-42d5-852c-8ce392b6a536'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/072'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''f1ba0107-8465-44f2-aa3b-36944dce498a'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''f1ba0107-8465-44f2-aa3b-36944dce498a'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''f1ba0107-8465-44f2-aa3b-36944dce498a'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''f1ba0107-8465-44f2-aa3b-36944dce498a'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/079'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''6f9f4cf0-7d70-4448-8b0a-57ecf3361912'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''6f9f4cf0-7d70-4448-8b0a-57ecf3361912'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''6f9f4cf0-7d70-4448-8b0a-57ecf3361912'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''6f9f4cf0-7d70-4448-8b0a-57ecf3361912'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/080'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''d3920fb9-7927-4549-ab3b-fd13498fb570'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''d3920fb9-7927-4549-ab3b-fd13498fb570'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''d3920fb9-7927-4549-ab3b-fd13498fb570'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''d3920fb9-7927-4549-ab3b-fd13498fb570'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/081'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''59a197c5-76ab-47ec-84fc-8a2802f1d1be'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''59a197c5-76ab-47ec-84fc-8a2802f1d1be'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''59a197c5-76ab-47ec-84fc-8a2802f1d1be'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''59a197c5-76ab-47ec-84fc-8a2802f1d1be'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/082'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''5f5b435f-8520-4dbf-84db-4db43f0ebbd0'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''5f5b435f-8520-4dbf-84db-4db43f0ebbd0'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''5f5b435f-8520-4dbf-84db-4db43f0ebbd0'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''5f5b435f-8520-4dbf-84db-4db43f0ebbd0'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/083'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''92a77272-d0c0-43f6-85ec-647c9447f194'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''92a77272-d0c0-43f6-85ec-647c9447f194'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''92a77272-d0c0-43f6-85ec-647c9447f194'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''92a77272-d0c0-43f6-85ec-647c9447f194'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/087'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''f7270d64-1680-4928-9fa4-a0ab01af698c'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''f7270d64-1680-4928-9fa4-a0ab01af698c'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''f7270d64-1680-4928-9fa4-a0ab01af698c'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''f7270d64-1680-4928-9fa4-a0ab01af698c'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/088'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''087e7310-8781-412f-99b6-f3b0c0afd7eb'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''087e7310-8781-412f-99b6-f3b0c0afd7eb'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''087e7310-8781-412f-99b6-f3b0c0afd7eb'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''087e7310-8781-412f-99b6-f3b0c0afd7eb'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/089'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''6baa49bf-4412-42d0-a50d-c4758f96a071'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''6baa49bf-4412-42d0-a50d-c4758f96a071'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''6baa49bf-4412-42d0-a50d-c4758f96a071'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''6baa49bf-4412-42d0-a50d-c4758f96a071'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/096'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''9ba05fbe-3a24-4f1b-af33-d45dd9de8fa8'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''9ba05fbe-3a24-4f1b-af33-d45dd9de8fa8'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''9ba05fbe-3a24-4f1b-af33-d45dd9de8fa8'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''9ba05fbe-3a24-4f1b-af33-d45dd9de8fa8'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/100'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''b50409f4-89d5-4cef-a6e0-6185e2df9ce7'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''b50409f4-89d5-4cef-a6e0-6185e2df9ce7'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''b50409f4-89d5-4cef-a6e0-6185e2df9ce7'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''b50409f4-89d5-4cef-a6e0-6185e2df9ce7'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/101'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''9cb9524f-b96d-4750-8d1d-28a3f239ef2b'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''9cb9524f-b96d-4750-8d1d-28a3f239ef2b'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''9cb9524f-b96d-4750-8d1d-28a3f239ef2b'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''9cb9524f-b96d-4750-8d1d-28a3f239ef2b'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/110'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''a1e4b0e1-f1e2-4217-b8c9-906ef901b14c'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''a1e4b0e1-f1e2-4217-b8c9-906ef901b14c'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''a1e4b0e1-f1e2-4217-b8c9-906ef901b14c'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''a1e4b0e1-f1e2-4217-b8c9-906ef901b14c'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/111'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''a609ed46-7cc3-4c3f-bf6e-de406fdac81a'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''a609ed46-7cc3-4c3f-bf6e-de406fdac81a'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''a609ed46-7cc3-4c3f-bf6e-de406fdac81a'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''a609ed46-7cc3-4c3f-bf6e-de406fdac81a'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/112'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''c19638fd-cefc-4369-9284-6fd67e4830ab'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''c19638fd-cefc-4369-9284-6fd67e4830ab'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''c19638fd-cefc-4369-9284-6fd67e4830ab'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''c19638fd-cefc-4369-9284-6fd67e4830ab'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/113'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''f6011b71-4590-4d4a-bf12-0bd04cd79d4a'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''f6011b71-4590-4d4a-bf12-0bd04cd79d4a'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''f6011b71-4590-4d4a-bf12-0bd04cd79d4a'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''f6011b71-4590-4d4a-bf12-0bd04cd79d4a'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/114'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''e8bfd677-cd75-4344-bf3f-696abe951c71'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''e8bfd677-cd75-4344-bf3f-696abe951c71'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''e8bfd677-cd75-4344-bf3f-696abe951c71'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''e8bfd677-cd75-4344-bf3f-696abe951c71'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/115'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''5bf69a09-f734-4689-b1b6-2856155f3546'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''5bf69a09-f734-4689-b1b6-2856155f3546'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''5bf69a09-f734-4689-b1b6-2856155f3546'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''5bf69a09-f734-4689-b1b6-2856155f3546'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/120'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''2ce1032f-311e-420e-a854-bef87c3147e5'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''2ce1032f-311e-420e-a854-bef87c3147e5'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''2ce1032f-311e-420e-a854-bef87c3147e5'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''2ce1032f-311e-420e-a854-bef87c3147e5'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/122'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''cd9caec3-bf95-4ce3-a1f6-64e3e11b390a'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''cd9caec3-bf95-4ce3-a1f6-64e3e11b390a'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''cd9caec3-bf95-4ce3-a1f6-64e3e11b390a'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''cd9caec3-bf95-4ce3-a1f6-64e3e11b390a'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/133'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''d087d824-efa1-494a-90a8-f3a9d1519c61'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''d087d824-efa1-494a-90a8-f3a9d1519c61'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''d087d824-efa1-494a-90a8-f3a9d1519c61'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''d087d824-efa1-494a-90a8-f3a9d1519c61'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/136'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''08b2711a-912b-4023-a94c-62f2f7ff15da'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''08b2711a-912b-4023-a94c-62f2f7ff15da'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''08b2711a-912b-4023-a94c-62f2f7ff15da'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''08b2711a-912b-4023-a94c-62f2f7ff15da'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/137'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''bb658a06-2699-43ca-a700-cd5604838a60'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''bb658a06-2699-43ca-a700-cd5604838a60'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''bb658a06-2699-43ca-a700-cd5604838a60'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''bb658a06-2699-43ca-a700-cd5604838a60'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/139'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''869ff8de-9c4b-4425-a894-0b0c6cd3bf14'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''869ff8de-9c4b-4425-a894-0b0c6cd3bf14'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''869ff8de-9c4b-4425-a894-0b0c6cd3bf14'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''869ff8de-9c4b-4425-a894-0b0c6cd3bf14'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/109'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''781f4e20-e317-4e8a-b7c8-263c95d6b675'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''781f4e20-e317-4e8a-b7c8-263c95d6b675'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''781f4e20-e317-4e8a-b7c8-263c95d6b675'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''781f4e20-e317-4e8a-b7c8-263c95d6b675'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/035'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''783da0b3-f157-46a2-9b78-1430b8680753'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''783da0b3-f157-46a2-9b78-1430b8680753'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''783da0b3-f157-46a2-9b78-1430b8680753'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''783da0b3-f157-46a2-9b78-1430b8680753'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/042'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''7b54d581-13c6-4f70-8a2f-a736fb12c881'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''7b54d581-13c6-4f70-8a2f-a736fb12c881'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''7b54d581-13c6-4f70-8a2f-a736fb12c881'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''7b54d581-13c6-4f70-8a2f-a736fb12c881'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/043'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''6ff0747c-1639-403b-95e9-7e1dbca8a917'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''6ff0747c-1639-403b-95e9-7e1dbca8a917'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''6ff0747c-1639-403b-95e9-7e1dbca8a917'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''6ff0747c-1639-403b-95e9-7e1dbca8a917'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/048'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''222111ec-4aa3-41ce-8c35-b86f3fa08d23'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''222111ec-4aa3-41ce-8c35-b86f3fa08d23'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''222111ec-4aa3-41ce-8c35-b86f3fa08d23'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''222111ec-4aa3-41ce-8c35-b86f3fa08d23'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/057'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''1b2c352a-5c69-4b76-a411-d93be56cc05a'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''1b2c352a-5c69-4b76-a411-d93be56cc05a'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''1b2c352a-5c69-4b76-a411-d93be56cc05a'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''1b2c352a-5c69-4b76-a411-d93be56cc05a'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/074'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''f400cd20-29f2-42c6-9805-df6458eba554'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''f400cd20-29f2-42c6-9805-df6458eba554'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''f400cd20-29f2-42c6-9805-df6458eba554'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''f400cd20-29f2-42c6-9805-df6458eba554'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/077'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''5005ff6c-6f9c-44ce-bd5f-4fd3c9b5fc84'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''5005ff6c-6f9c-44ce-bd5f-4fd3c9b5fc84'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''5005ff6c-6f9c-44ce-bd5f-4fd3c9b5fc84'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''5005ff6c-6f9c-44ce-bd5f-4fd3c9b5fc84'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/091'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''eda9ae25-6184-4141-80a0-e1b0940f7f1d'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''eda9ae25-6184-4141-80a0-e1b0940f7f1d'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''eda9ae25-6184-4141-80a0-e1b0940f7f1d'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''eda9ae25-6184-4141-80a0-e1b0940f7f1d'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/092'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''fff04c75-2f70-45e2-ac3b-89c054240ca7'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''fff04c75-2f70-45e2-ac3b-89c054240ca7'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''fff04c75-2f70-45e2-ac3b-89c054240ca7'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''fff04c75-2f70-45e2-ac3b-89c054240ca7'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/095'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''8a64271b-011d-4320-a1da-66c6bed2befa'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''8a64271b-011d-4320-a1da-66c6bed2befa'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''8a64271b-011d-4320-a1da-66c6bed2befa'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''8a64271b-011d-4320-a1da-66c6bed2befa'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/119'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''7964fff0-ea1d-46ff-88fd-4e9c9eacc685'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''7964fff0-ea1d-46ff-88fd-4e9c9eacc685'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''7964fff0-ea1d-46ff-88fd-4e9c9eacc685'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''7964fff0-ea1d-46ff-88fd-4e9c9eacc685'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/129'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''beb89f3c-e33b-4ab2-9032-69f313681c24'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''beb89f3c-e33b-4ab2-9032-69f313681c24'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''beb89f3c-e33b-4ab2-9032-69f313681c24'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''beb89f3c-e33b-4ab2-9032-69f313681c24'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/132'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''92076de4-2dc7-4c6f-9c7d-b7c1141aa8e7'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''92076de4-2dc7-4c6f-9c7d-b7c1141aa8e7'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''92076de4-2dc7-4c6f-9c7d-b7c1141aa8e7'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''92076de4-2dc7-4c6f-9c7d-b7c1141aa8e7'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/124'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''e2e9d099-5eea-422c-95b6-e1dfc536b9eb'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''e2e9d099-5eea-422c-95b6-e1dfc536b9eb'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''e2e9d099-5eea-422c-95b6-e1dfc536b9eb'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''e2e9d099-5eea-422c-95b6-e1dfc536b9eb'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/073'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''bcf6e728-1df6-4b30-bd24-300981eecbaa'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''bcf6e728-1df6-4b30-bd24-300981eecbaa'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''bcf6e728-1df6-4b30-bd24-300981eecbaa'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''bcf6e728-1df6-4b30-bd24-300981eecbaa'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/086'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''4901660d-315f-4c1c-9550-db33e8bed04f'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''4901660d-315f-4c1c-9550-db33e8bed04f'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''4901660d-315f-4c1c-9550-db33e8bed04f'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''4901660d-315f-4c1c-9550-db33e8bed04f'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/099'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''8948b544-8283-4d19-b523-bfff7ef10967'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''8948b544-8283-4d19-b523-bfff7ef10967'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''8948b544-8283-4d19-b523-bfff7ef10967'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''8948b544-8283-4d19-b523-bfff7ef10967'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/030'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''5752325d-f156-45d2-ae37-3905edf43690'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''5752325d-f156-45d2-ae37-3905edf43690'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''5752325d-f156-45d2-ae37-3905edf43690'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''5752325d-f156-45d2-ae37-3905edf43690'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/037'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''b5c76f4d-c0ef-4260-897c-f8e661ec1b68'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''b5c76f4d-c0ef-4260-897c-f8e661ec1b68'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''b5c76f4d-c0ef-4260-897c-f8e661ec1b68'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''b5c76f4d-c0ef-4260-897c-f8e661ec1b68'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/040'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''d3239141-6073-4fb0-b3ea-55664a415917'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''d3239141-6073-4fb0-b3ea-55664a415917'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''d3239141-6073-4fb0-b3ea-55664a415917'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''d3239141-6073-4fb0-b3ea-55664a415917'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/045'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''48a73892-0391-48e6-bea7-a2c5e7963ad3'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''48a73892-0391-48e6-bea7-a2c5e7963ad3'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''48a73892-0391-48e6-bea7-a2c5e7963ad3'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''48a73892-0391-48e6-bea7-a2c5e7963ad3'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/049'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''4b40f057-a760-4944-9672-cd4f34810fae'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''4b40f057-a760-4944-9672-cd4f34810fae'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''4b40f057-a760-4944-9672-cd4f34810fae'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''4b40f057-a760-4944-9672-cd4f34810fae'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/050'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''1b3c5ed3-3dc5-4a94-b70b-bbc7442fa173'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''1b3c5ed3-3dc5-4a94-b70b-bbc7442fa173'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''1b3c5ed3-3dc5-4a94-b70b-bbc7442fa173'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''1b3c5ed3-3dc5-4a94-b70b-bbc7442fa173'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/052'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''ca835a1e-984d-46b5-b7e0-67d26dbbd630'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''ca835a1e-984d-46b5-b7e0-67d26dbbd630'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''ca835a1e-984d-46b5-b7e0-67d26dbbd630'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''ca835a1e-984d-46b5-b7e0-67d26dbbd630'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/055'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''3f2f5cb5-11f7-4f70-8cf3-1facf6e81ef0'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''3f2f5cb5-11f7-4f70-8cf3-1facf6e81ef0'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''3f2f5cb5-11f7-4f70-8cf3-1facf6e81ef0'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''3f2f5cb5-11f7-4f70-8cf3-1facf6e81ef0'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/058'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''f1d7348d-f38d-4a74-ab0a-45227b89d314'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''f1d7348d-f38d-4a74-ab0a-45227b89d314'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''f1d7348d-f38d-4a74-ab0a-45227b89d314'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''f1d7348d-f38d-4a74-ab0a-45227b89d314'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/059'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''03a22d21-658c-4b4d-92f7-ae0b5e5f96ce'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''03a22d21-658c-4b4d-92f7-ae0b5e5f96ce'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''03a22d21-658c-4b4d-92f7-ae0b5e5f96ce'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''03a22d21-658c-4b4d-92f7-ae0b5e5f96ce'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/067'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''af28530e-b31a-4359-9209-fdf1d7b38f1e'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''af28530e-b31a-4359-9209-fdf1d7b38f1e'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''af28530e-b31a-4359-9209-fdf1d7b38f1e'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''af28530e-b31a-4359-9209-fdf1d7b38f1e'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/068'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''589736aa-d375-4905-9ff7-4faae9eedece'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''589736aa-d375-4905-9ff7-4faae9eedece'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''589736aa-d375-4905-9ff7-4faae9eedece'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''589736aa-d375-4905-9ff7-4faae9eedece'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/069'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''a00dffee-a550-44d8-b473-1d512f6c9995'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''a00dffee-a550-44d8-b473-1d512f6c9995'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''a00dffee-a550-44d8-b473-1d512f6c9995'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''a00dffee-a550-44d8-b473-1d512f6c9995'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/075'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''cf2569d8-e3cf-4e00-b11c-e1088555bb7a'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''cf2569d8-e3cf-4e00-b11c-e1088555bb7a'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''cf2569d8-e3cf-4e00-b11c-e1088555bb7a'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''cf2569d8-e3cf-4e00-b11c-e1088555bb7a'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/076'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''8db398a9-3640-4675-81d9-19f5ab3f25de'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''8db398a9-3640-4675-81d9-19f5ab3f25de'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''8db398a9-3640-4675-81d9-19f5ab3f25de'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''8db398a9-3640-4675-81d9-19f5ab3f25de'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/078'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''676d2697-c7f5-4ea6-a2e9-b6f8bce2bd4e'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''676d2697-c7f5-4ea6-a2e9-b6f8bce2bd4e'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''676d2697-c7f5-4ea6-a2e9-b6f8bce2bd4e'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''676d2697-c7f5-4ea6-a2e9-b6f8bce2bd4e'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/084'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''4151bc4d-598d-4334-86b6-668f4ee5e5e9'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''4151bc4d-598d-4334-86b6-668f4ee5e5e9'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''4151bc4d-598d-4334-86b6-668f4ee5e5e9'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''4151bc4d-598d-4334-86b6-668f4ee5e5e9'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/085'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''cc2404af-1863-438d-8ff9-38d66e4f6796'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''cc2404af-1863-438d-8ff9-38d66e4f6796'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''cc2404af-1863-438d-8ff9-38d66e4f6796'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''cc2404af-1863-438d-8ff9-38d66e4f6796'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/090'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''1a85c145-29d2-4343-9010-d52d981bd009'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''1a85c145-29d2-4343-9010-d52d981bd009'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''1a85c145-29d2-4343-9010-d52d981bd009'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''1a85c145-29d2-4343-9010-d52d981bd009'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/093'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''27852f5c-a5db-4b1f-a311-9ff67e74cb88'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''27852f5c-a5db-4b1f-a311-9ff67e74cb88'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''27852f5c-a5db-4b1f-a311-9ff67e74cb88'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''27852f5c-a5db-4b1f-a311-9ff67e74cb88'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/098'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''0fbb3210-3c90-41df-b39e-eefe032f738a'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''0fbb3210-3c90-41df-b39e-eefe032f738a'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''0fbb3210-3c90-41df-b39e-eefe032f738a'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''0fbb3210-3c90-41df-b39e-eefe032f738a'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/102'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''407d4a90-c403-46c3-bf57-31c2fe1ad0e0'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''407d4a90-c403-46c3-bf57-31c2fe1ad0e0'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''407d4a90-c403-46c3-bf57-31c2fe1ad0e0'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''407d4a90-c403-46c3-bf57-31c2fe1ad0e0'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/106'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''de7bf4b4-52f4-4bbe-8155-7f0d08aa01f5'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''de7bf4b4-52f4-4bbe-8155-7f0d08aa01f5'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''de7bf4b4-52f4-4bbe-8155-7f0d08aa01f5'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''de7bf4b4-52f4-4bbe-8155-7f0d08aa01f5'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/107'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''460fd161-1f25-40dd-aafa-39dac9f8690b'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''460fd161-1f25-40dd-aafa-39dac9f8690b'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''460fd161-1f25-40dd-aafa-39dac9f8690b'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''460fd161-1f25-40dd-aafa-39dac9f8690b'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/108'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''e2285ed2-1492-41c2-8933-79591c179ec5'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''e2285ed2-1492-41c2-8933-79591c179ec5'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''e2285ed2-1492-41c2-8933-79591c179ec5'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''e2285ed2-1492-41c2-8933-79591c179ec5'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/116'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''f04d5fd1-150d-4ee7-8011-151f74dc42e2'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''f04d5fd1-150d-4ee7-8011-151f74dc42e2'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''f04d5fd1-150d-4ee7-8011-151f74dc42e2'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''f04d5fd1-150d-4ee7-8011-151f74dc42e2'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/117'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''c6ba691e-c574-4031-9ba7-65c8df849e61'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''c6ba691e-c574-4031-9ba7-65c8df849e61'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''c6ba691e-c574-4031-9ba7-65c8df849e61'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''c6ba691e-c574-4031-9ba7-65c8df849e61'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/118'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''b38f7ece-a922-4dbf-9000-f78854a55a17'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''b38f7ece-a922-4dbf-9000-f78854a55a17'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''b38f7ece-a922-4dbf-9000-f78854a55a17'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''b38f7ece-a922-4dbf-9000-f78854a55a17'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/121'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''eae13af2-4e0a-4438-8594-89a350a96cdd'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''eae13af2-4e0a-4438-8594-89a350a96cdd'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''eae13af2-4e0a-4438-8594-89a350a96cdd'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''eae13af2-4e0a-4438-8594-89a350a96cdd'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/135'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''051009da-3162-487c-b7da-e6f7be61ca53'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''051009da-3162-487c-b7da-e6f7be61ca53'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''051009da-3162-487c-b7da-e6f7be61ca53'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''051009da-3162-487c-b7da-e6f7be61ca53'','4c15f2b6-6043-46f7-a3b2-e26077292224',);

        --Code: 'E003/134'
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_string) VALUES ('', ''b7899fc3-972e-439b-9289-8421d344d1df'','7613ef45-6410-41dc-a50a-c8fabf80cf71','');
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''b7899fc3-972e-439b-9289-8421d344d1df'','1520c497-e498-478b-bc8d-bbb57a93fd16',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''b7899fc3-972e-439b-9289-8421d344d1df'','9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93',);
        INSERT INTO asset_catalogue_item_property (id, asset_catalogue_item_id, asset_catalogue_property_id, value_int) VALUES ('', ''b7899fc3-972e-439b-9289-8421d344d1df'','4c15f2b6-6043-46f7-a3b2-e26077292224',);
        "#
    )?;

    Ok(())
}
