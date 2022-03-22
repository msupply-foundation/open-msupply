use repository::{
    schema::NameStoreJoinRow, Name, NameFilter, NameQueryRepository, NameStoreJoinRepository,
    StorageConnection,
};
use util::{inline_edit, uuid::uuid};

use super::remote_sync_integration_test::SyncRecordTester;

pub struct NameStoreJoinRecordTester {}
impl SyncRecordTester<Vec<NameStoreJoinRow>> for NameStoreJoinRecordTester {
    fn insert(&self, connection: &StorageConnection, store_id: &str) -> Vec<NameStoreJoinRow> {
        let names = NameQueryRepository::new(connection)
            .query_by_filter(store_id, NameFilter::new())
            .unwrap();
        let name = names
            .into_iter()
            .filter(|n| n.name_store_join_row.is_none())
            .collect::<Vec<Name>>()
            .pop()
            .unwrap();

        let rows = vec![NameStoreJoinRow {
            id: uuid(),
            store_id: store_id.to_string(),
            name_id: name.name_row.id,
            name_is_customer: true,
            name_is_supplier: true,
        }];
        let repo = NameStoreJoinRepository::new(connection);
        for row in &rows {
            repo.upsert_one(row).unwrap();
        }
        rows
    }

    fn mutate(
        &self,
        connection: &StorageConnection,
        rows: &Vec<NameStoreJoinRow>,
    ) -> Vec<NameStoreJoinRow> {
        let repo = NameStoreJoinRepository::new(&connection);
        let rows = rows
            .iter()
            .map(|row| {
                let row = inline_edit(row, |mut d| {
                    d.name_is_customer = false;
                    d.name_is_supplier = false;
                    d
                });
                repo.upsert_one(&row).unwrap();
                row
            })
            .collect();
        rows
    }

    fn validate(&self, connection: &StorageConnection, rows: &Vec<NameStoreJoinRow>) {
        for row_expected in rows {
            let repo = NameStoreJoinRepository::new(&connection);
            let row = repo
                .find_one_by_id(&row_expected.id)
                .expect(&format!(
                    "Name store join row not found: {:?} ",
                    row_expected
                ))
                .unwrap();
            assert_eq!(row_expected, &row);
        }
    }
}
