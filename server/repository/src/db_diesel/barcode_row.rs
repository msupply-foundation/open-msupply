use crate::Upsert;

use super::{
    barcode_row::barcode::dsl as barcode_dsl, invoice_line_row::invoice_line,
    item_link_row::item_link, item_row::item, name_link_row::name_link, RepositoryError,
    StorageConnection,
};

use diesel::prelude::*;

table! {
    barcode (id) {
        id -> Text,
        gtin -> Text,
        item_id -> Text,
        manufacturer_link_id -> Nullable<Text>,
        pack_size -> Nullable<Integer>,
        parent_id -> Nullable<Text>,
    }
}

table! {
    #[sql_name = "barcode"]
    barcode_is_sync_update (id) {
        id -> Text,
        is_sync_update -> Bool,
    }
}

joinable!(barcode -> item (item_id));
joinable!(barcode -> invoice_line (id));
joinable!(barcode -> name_link (manufacturer_link_id));
allow_tables_to_appear_in_same_query!(barcode, item_link);
allow_tables_to_appear_in_same_query!(barcode, name_link);

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default, serde::Serialize, serde::Deserialize)]
#[changeset_options(treat_none_as_null = "true")]
#[table_name = "barcode"]
pub struct BarcodeRow {
    pub id: String,
    pub gtin: String,
    pub item_id: String,
    pub manufacturer_link_id: Option<String>,
    pub pack_size: Option<i32>,
    pub parent_id: Option<String>,
}

pub struct BarcodeRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> BarcodeRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        BarcodeRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn _upsert_one(&self, row: &BarcodeRow) -> Result<(), RepositoryError> {
        diesel::insert_into(barcode_dsl::barcode)
            .values(row)
            .on_conflict(barcode_dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn _upsert_one(&self, row: &BarcodeRow) -> Result<(), RepositoryError> {
        diesel::replace_into(barcode_dsl::barcode)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    fn toggle_is_sync_update(&self, id: &str, is_sync_update: bool) -> Result<(), RepositoryError> {
        diesel::update(barcode_is_sync_update::table.find(id))
            .set(barcode_is_sync_update::dsl::is_sync_update.eq(is_sync_update))
            .execute(&self.connection.connection)?;

        Ok(())
    }

    pub fn upsert_one(&self, row: &BarcodeRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        self.toggle_is_sync_update(&row.id, false)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<BarcodeRow>, RepositoryError> {
        let result = barcode_dsl::barcode
            .filter(barcode_dsl::id.eq(id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_item_id(&self, item_id: &str) -> Result<Vec<BarcodeRow>, RepositoryError> {
        let result = barcode_dsl::barcode
            .filter(barcode_dsl::item_id.eq(item_id))
            .get_results(&self.connection.connection)?;
        Ok(result)
    }

    pub fn sync_upsert_one(&self, row: &BarcodeRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        self.toggle_is_sync_update(&row.id, true)?;

        Ok(())
    }

    #[cfg(test)]
    fn find_is_sync_update_by_id(&self, id: &str) -> Result<Option<bool>, RepositoryError> {
        let result = barcode_is_sync_update::table
            .find(id)
            .select(barcode_is_sync_update::dsl::is_sync_update)
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }
}

pub struct BarcodeRowDelete(pub String);
impl Upsert for BarcodeRow {
    fn upsert_sync(&self, con: &StorageConnection) -> Result<(), RepositoryError> {
        BarcodeRowRepository::new(con).sync_upsert_one(self)
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            BarcodeRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

#[cfg(test)]
mod test {
    use util::{inline_init, uuid::uuid};

    use crate::{mock::MockDataInserts, test_db::setup_all, BarcodeRow, BarcodeRowRepository};

    fn mock_barcode_row_1() -> BarcodeRow {
        inline_init(|r: &mut BarcodeRow| {
            r.id = uuid();
            r.gtin = "12345678901234".to_string();
            r.item_id = "item_a".to_string();
            r.pack_size = Some(1);
        })
    }

    fn mock_barcode_row_2() -> BarcodeRow {
        inline_init(|r: &mut BarcodeRow| {
            r.id = uuid();
            r.gtin = "98765432104321".to_string();
            r.item_id = "item_a".to_string();
            r.pack_size = Some(10);
        })
    }

    #[actix_rt::test]
    async fn barcode_is_sync_update() {
        let (_, connection, _, _) = setup_all(
            "barcode_is_sync_update",
            MockDataInserts::none().items().units(),
        )
        .await;

        let repo = BarcodeRowRepository::new(&connection);

        // Two rows, to make sure is_sync_update update only affects one row
        let row = mock_barcode_row_1();
        let row2 = mock_barcode_row_2();

        // First insert
        repo.upsert_one(&row).unwrap();
        repo.upsert_one(&row2).unwrap();

        assert_eq!(repo.find_is_sync_update_by_id(&row.id), Ok(Some(false)));
        assert_eq!(repo.find_is_sync_update_by_id(&row2.id), Ok(Some(false)));

        // Synchronisation upsert
        repo.sync_upsert_one(&row).unwrap();

        assert_eq!(repo.find_is_sync_update_by_id(&row.id), Ok(Some(true)));
        assert_eq!(repo.find_is_sync_update_by_id(&row2.id), Ok(Some(false)));

        // Normal upsert
        repo.upsert_one(&row).unwrap();

        assert_eq!(repo.find_is_sync_update_by_id(&row.id), Ok(Some(false)));
        assert_eq!(repo.find_is_sync_update_by_id(&row2.id), Ok(Some(false)));
    }
}
