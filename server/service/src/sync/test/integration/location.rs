use repository::{LocationRow, LocationRowRepository, StorageConnection};
use util::{inline_edit, uuid::uuid};

use super::{
    central_server_configurations::NewSiteProperties,
    remote_sync_integration_test::SyncRecordTester,
};

pub struct LocationSyncRecordTester {}
impl SyncRecordTester<Vec<LocationRow>> for LocationSyncRecordTester {
    fn insert(
        &self,
        connection: &StorageConnection,
        new_site_properties: &NewSiteProperties,
    ) -> Vec<LocationRow> {
        let store_id = &new_site_properties.store_id;
        let rows = vec![LocationRow {
            id: uuid(),
            name: "LoationName".to_string(),
            code: "LocationCode".to_string(),
            on_hold: false,
            store_id: store_id.to_string(),
        }];
        let repo = LocationRowRepository::new(connection);
        for row in &rows {
            repo.upsert_one(row).unwrap();
        }
        rows
    }

    fn mutate(
        &self,
        connection: &StorageConnection,
        _: &NewSiteProperties,
        rows: &Vec<LocationRow>,
    ) -> Vec<LocationRow> {
        let repo = LocationRowRepository::new(&connection);
        let rows = rows
            .iter()
            .map(|row| {
                let row = inline_edit(row, |mut d| {
                    d.name = "LoationName2".to_string();
                    d.code = "LocationCode2".to_string();
                    d.on_hold = true;
                    d
                });
                repo.upsert_one(&row).unwrap();
                row
            })
            .collect();
        rows
    }

    fn validate(&self, connection: &StorageConnection, rows: &Vec<LocationRow>) {
        for row_expected in rows {
            let repo = LocationRowRepository::new(&connection);
            let row = repo
                .find_one_by_id(&row_expected.id)
                .unwrap()
                .expect(&format!("Location line row not found: {:?} ", row_expected));
            assert_eq!(row_expected, &row);
        }
    }
}
