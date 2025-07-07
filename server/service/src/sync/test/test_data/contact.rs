use repository::{contact_row::ContactRow, ContactRowDelete};

use crate::sync::test::TestSyncIncomingRecord;

const TABLE_NAME: &str = "contact";

const CONTACT_1: (&str, &str) = (
    "CONTACT_1",
    r#"{
        "ID": "1",
        "address1": "test address1",
        "address2": "test address2",
        "category": "test category",
        "category2": "test category2",
        "category3": "test category3",
        "comment": "test comment",
        "country": "test country",
        "email": "test email",
        "first": "test first",
        "is_active_web_user": true,
        "last": "test last",
        "name_ID": "test name_ID",
        "phone": "test phone",
        "position": "test position",
        "spare": false,
        "web_password": "2ceb02a85f6d4de6c28b2e59fda886d526dafb0d",
        "web_username": "test username"
    }"#,
);

const CONTACT_2: (&str, &str) = (
    "CONTACT_2",
    r#"{
        "ID": "2",
        "address1": "second test address1",
        "address2": "second test address2",
        "category": "second test category",
        "category2": "second test category2",
        "category3": "second test category3",
        "comment": "second test comment",
        "country": "second test country",
        "email": "second test email",
        "first": "second test first",
        "is_active_web_user": false,
        "last": "second test last",
        "name_ID": "second test name_ID",
        "phone": "second test phone",
        "position": "second test position",
        "spare": true,
        "web_password": "3gwu98s97r7r4de6c28b2e59fda886d526dafb0d",
        "web_username": "second test username"
    }"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![
        TestSyncIncomingRecord::new_pull_upsert(
            TABLE_NAME,
            CONTACT_1,
            ContactRow {
                id: "1".to_owned(),
                name_link_id: "test name_ID".to_owned(),
                first_name: "test first".to_owned(),
                position: Some("test position".to_owned()),
                comment: Some("test comment".to_owned()),
                last_name: "test last".to_owned(),
                phone: Some("test phone".to_owned()),
                email: Some("test email".to_owned()),
                category_1: Some("test category".to_owned()),
                category_2: Some("test category2".to_owned()),
                category_3: Some("test category3".to_owned()),
                address_1: Some("test address1".to_owned()),
                address_2: Some("test address2".to_owned()),
                country: Some("test country".to_owned()),
            },
        ),
        TestSyncIncomingRecord::new_pull_upsert(
            TABLE_NAME,
            CONTACT_2,
            ContactRow {
                id: "2".to_owned(),
                name_link_id: "second test name_ID".to_owned(),
                first_name: "second test first".to_owned(),
                position: Some("second test position".to_owned()),
                comment: Some("second test comment".to_owned()),
                last_name: "second test last".to_owned(),
                phone: Some("second test phone".to_owned()),
                email: Some("second test email".to_owned()),
                category_1: Some("second test category".to_owned()),
                category_2: Some("second test category2".to_owned()),
                category_3: Some("second test category3".to_owned()),
                address_1: Some("second test address1".to_owned()),
                address_2: Some("second test address2".to_owned()),
                country: Some("second test country".to_owned()),
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
