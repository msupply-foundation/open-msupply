use repository::{contact_row::ContactRow, ContactRowDelete};

use crate::sync::test::TestSyncIncomingRecord;

const TABLE_NAME: &str = "contact";

const CONTACT_1: (&str, &str) = (
    "CONTACT_1",
    r#"{
        "ID":"CONTACT_1",
        "name_id":"1",
        "first_name":"Test1FirstName",
        "position":"Test1Position",
        "comment":"Test1Comment",
        "last_name":"Test1LastName",
        "phone":"Test1Phone",
        "email":"Test1Email",
        "category_1":"Test1Category1",
        "category_2":"Test1Category2",
        "category_3":"Test1Category3",
        "address_1":"Test1Address1",
        "address_2":"Test1Address2",
        "country":"Test1Country",
       }"#,
);

const CONTACT_2: (&str, &str) = (
    "CONTACT_2",
    r#"{
        "ID":"CONTACT_2",
        "name_id":"2",
        "first_name":"Test2FirstName",
        "position":"Test2Position",
        "comment":"Test2Comment",
        "last_name":"Test2LastName",
        "phone":"Test2Phone",
        "email":"Test2Email",
        "category_1":"Test2Category1",
        "category_2":"Test2Category2",
        "category_3":"Test2Category3",
        "address_1":"Test2Address1",
        "address_2":"Test2Address2",
        "country":"Test2Country",
    }"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![
        TestSyncIncomingRecord::new_pull_upsert(
            TABLE_NAME,
            CONTACT_1,
            ContactRow {
                id: "CONTACT_1".to_owned(),
                name_link_id: "1".to_owned(),
                first_name: "Test1FirstName".to_owned(),
                position: Some("Test1Position".to_owned()),
                comment: Some("Test1Comment".to_owned()),
                last_name: "Test1LastName".to_owned(),
                phone: Some("Test1Phone".to_owned()),
                email: Some("Test1Email".to_owned()),
                category_1: Some("Test1Category1".to_owned()),
                category_2: Some("Test1Category2".to_owned()),
                category_3: Some("Test1Category3".to_owned()),
                address_1: Some("Test1Address1".to_owned()),
                address_2: Some("Test1Address2".to_owned()),
                country: Some("Test1Country".to_owned()),
            },
        ),
        TestSyncIncomingRecord::new_pull_upsert(
            TABLE_NAME,
            CONTACT_2,
            ContactRow {
                id: "CONTACT_2".to_owned(),
                name_link_id: "2".to_owned(),
                first_name: "Test2FirstName".to_owned(),
                position: Some("Test2Position".to_owned()),
                comment: Some("Test2Comment".to_owned()),
                last_name: "Test2LastName".to_owned(),
                phone: Some("Test2Phone".to_owned()),
                email: Some("Test2Email".to_owned()),
                category_1: Some("Test2Category1".to_owned()),
                category_2: Some("Test2Category2".to_owned()),
                category_3: Some("Test2Category3".to_owned()),
                address_1: Some("Test2Address1".to_owned()),
                address_2: Some("Test2Address2".to_owned()),
                country: Some("Test2Country".to_owned()),
            },
        ),
    ]
}

pub(crate) fn test_pull_delete_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_delete(
        TABLE_NAME,
        CONTACT_1.0,
        ContactRowDelete(CONTACT_1.0.to_string()),
    )]
}
