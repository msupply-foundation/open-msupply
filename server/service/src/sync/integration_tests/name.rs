use chrono::NaiveDate;
use repository::{Gender, NameRow, NameRowRepository, NameType, StorageConnection};
use util::{inline_edit, uuid::uuid};

use super::remote_sync_integration_test::SyncRecordTester;

pub struct NameSyncRecordTester {}
impl SyncRecordTester<Vec<NameRow>> for NameSyncRecordTester {
    fn insert(&self, connection: &StorageConnection, store_id: &str) -> Vec<NameRow> {
        let rows = vec![NameRow {
            id: uuid(),
            name: "name 0".to_string(),
            code: "code 0".to_string(),
            r#type: NameType::Patient,
            is_customer: true,
            is_supplier: false,
            supplying_store_id: Some(store_id.to_string()),
            first_name: None,
            last_name: None,
            gender: Some(Gender::Female),
            date_of_birth: None,
            phone: None,
            charge_code: None,
            comment: None,
            country: None,
            address1: None,
            address2: None,
            email: None,
            website: None,
            is_manufacturer: false,
            is_donor: false,
            on_hold: false,
            created_datetime: Some(NaiveDate::from_ymd(2022, 05, 20).and_hms(0, 0, 0)),
            is_deceased: false,
            national_health_number: None,
        }];
        let repo = NameRowRepository::new(connection);
        for row in &rows {
            repo.upsert_one(row).unwrap();
        }
        rows
    }

    fn mutate(&self, connection: &StorageConnection, rows: &Vec<NameRow>) -> Vec<NameRow> {
        let repo = NameRowRepository::new(&connection);
        let rows = rows
            .iter()
            .map(|row| {
                let row = inline_edit(row, |mut d| {
                    d.first_name = Some("first".to_string());
                    d.last_name = Some("last".to_string());
                    // TODO test more genders
                    d.gender = Some(Gender::Male);
                    d.date_of_birth = Some(NaiveDate::from_ymd(1920, 01, 21));
                    d.phone = Some("022584578".to_string());
                    d.charge_code = Some("charge code".to_string());
                    d.comment = Some("comment".to_string());
                    d.country = Some("NZ".to_string());
                    d.address1 = Some("addr1".to_string());
                    d.address2 = Some("addr22".to_string());
                    d.email = Some("first@mail.com".to_string());
                    d.website = Some("myurl".to_string());
                    d.is_manufacturer = true;
                    d.is_donor = true;
                    d.on_hold = true;
                    d
                });
                repo.upsert_one(&row).unwrap();
                row
            })
            .collect();
        rows
    }

    fn validate(&self, connection: &StorageConnection, rows: &Vec<NameRow>) {
        for row_expected in rows {
            let repo = NameRowRepository::new(&connection);
            let row = repo
                .find_one_by_id(&row_expected.id)
                .unwrap()
                .expect(&format!("Name row not found: {:?} ", row_expected));
            assert_eq!(row_expected, &row);
        }
    }
}
