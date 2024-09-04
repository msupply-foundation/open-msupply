use repository::MasterListRow;

use crate::sync::test::TestSyncIncomingRecord;

const TABLE_NAME: &str = "list_master";

const MASTER_LIST_1: (&str, &str) = (
    "87027C44835B48E6989376F42A58F7EA",
    r#"{
    "ID": "87027C44835B48E6989376F42A58F7EA",
    "description": "District Store",
    "date_created": "2017-08-17",
    "created_by_user_ID": "0763E2E3053D4C478E1E6B6B03FEC207",
    "note": "note 1",
    "gets_new_items": false,
    "tags": null,
    "isProgram": false,
    "programSettings": null,
    "code": "",
    "isPatientList": false,
    "is_hiv": false,
    "isSupplierHubCatalog": false,
    "inactive": true
}"#,
);

const MASTER_LIST_2: (&str, &str) = (
    "87027C44835B48E6989376F42A58F7E3",
    r#"{
    "ID": "87027C44835B48E6989376F42A58F7E3",
    "description": "District Store 2",
    "date_created": "2017-08-17",
    "created_by_user_ID": "0763E2E3053D4C478E1E6B6B03FEC207",
    "note": "note 2",
    "gets_new_items": false,
    "tags": null,
    "isProgram": false,
    "programSettings": null,
    "code": "",
    "isPatientList": false,
    "is_hiv": false,
    "isSupplierHubCatalog": false,
    "inactive": false
}"#,
);

const DEFAULT_PRICE_LIST: (&str, &str) = (
    "4d9a615e-eebb-42ad-a806-e3854f7733ae",
    r#"{
    "ID": "4d9a615e-eebb-42ad-a806-e3854f7733ae",
    "description": "Default Price List",
    "date_created": "2017-08-17",
    "created_by_user_ID": "0763E2E3053D4C478E1E6B6B03FEC207",
    "note": "National Price List",
    "gets_new_items": false,
    "tags": null,
    "isProgram": false,
    "programSettings": null,
    "code": "",
    "isPatientList": false,
    "is_hiv": false,
    "isSupplierHubCatalog": false,
    "inactive": false,
    "is_default_price_list": true,
    "discount": 0.0
}"#,
);

const DISCOUNT_LIST: (&str, &str) = (
    "4d9a615e-eebb-42ad-a806-e3854f7733a1",
    r#"{
    "ID": "4d9a615e-eebb-42ad-a806-e3854f7733a1",
    "description": "Discount List",
    "date_created": "2017-08-17",
    "created_by_user_ID": "0763E2E3053D4C478E1E6B6B03FEC207",
    "note": "National Price List Store Discounts",
    "gets_new_items": false,
    "tags": null,
    "isProgram": false,
    "programSettings": null,
    "code": "",
    "isPatientList": false,
    "is_hiv": false,
    "isSupplierHubCatalog": false,
    "inactive": false,
    "is_default_price_list": false,
    "discount": 0.2
}"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![
        TestSyncIncomingRecord::new_pull_upsert(
            TABLE_NAME,
            MASTER_LIST_1,
            MasterListRow {
                id: MASTER_LIST_1.0.to_owned(),
                name: "District Store".to_owned(),
                code: "".to_owned(),
                description: "note 1".to_owned(),
                is_active: false,
                is_default_price_list: false,
                discount: None,
            },
        ),
        TestSyncIncomingRecord::new_pull_upsert(
            TABLE_NAME,
            MASTER_LIST_2,
            MasterListRow {
                id: MASTER_LIST_2.0.to_owned(),
                name: "District Store 2".to_owned(),
                code: "".to_owned(),
                description: "note 2".to_owned(),
                is_active: true,
                is_default_price_list: false,
                discount: None,
            },
        ),
        TestSyncIncomingRecord::new_pull_upsert(
            TABLE_NAME,
            DEFAULT_PRICE_LIST,
            MasterListRow {
                id: DEFAULT_PRICE_LIST.0.to_owned(),
                name: "Default Price List".to_owned(),
                code: "".to_owned(),
                description: "National Price List".to_owned(),
                is_active: true,
                is_default_price_list: true,
                discount: Some(0.0),
            },
        ),
        TestSyncIncomingRecord::new_pull_upsert(
            TABLE_NAME,
            DISCOUNT_LIST,
            MasterListRow {
                id: DISCOUNT_LIST.0.to_owned(),
                name: "Discount List".to_owned(),
                code: "".to_owned(),
                description: "National Price List Store Discounts".to_owned(),
                is_active: true,
                is_default_price_list: false,
                discount: Some(0.2),
            },
        ),
    ]
}
