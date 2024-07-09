use crate::Upsert;

use super::{
    barcode_row::barcode::dsl as barcode_dsl, invoice_line_row::invoice_line,
    item_link_row::item_link, item_row::item, name_link_row::name_link, RepositoryError,
    StorageConnection,
};
use crate::{ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RowActionType};

use diesel::prelude::*;

table! {
    barcode (id) {
        id -> Text,
        gtin -> Text,
        item_id -> Text,
        manufacturer_link_id -> Nullable<Text>,
        pack_size -> Nullable<Double>,
        parent_id -> Nullable<Text>,
    }
}

joinable!(barcode -> item (item_id));
joinable!(barcode -> invoice_line (id));
joinable!(barcode -> name_link (manufacturer_link_id));
allow_tables_to_appear_in_same_query!(barcode, item_link);
allow_tables_to_appear_in_same_query!(barcode, name_link);

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default)]
#[diesel(treat_none_as_null = true)]
#[diesel(table_name = barcode)]
pub struct BarcodeRow {
    pub id: String,
    pub gtin: String,
    pub item_id: String,
    pub manufacturer_link_id: Option<String>,
    pub pack_size: Option<f64>,
    pub parent_id: Option<String>,
}

pub struct BarcodeRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> BarcodeRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        BarcodeRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &BarcodeRow) -> Result<i64, RepositoryError> {
        diesel::insert_into(barcode_dsl::barcode)
            .values(row)
            .on_conflict(barcode_dsl::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;

        self.insert_changelog(row, RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        row: &BarcodeRow,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::Barcode,
            record_id: row.id.clone(),
            row_action: action,
            store_id: None,
            name_link_id: None,
        };

        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<BarcodeRow>, RepositoryError> {
        let result = barcode_dsl::barcode
            .filter(barcode_dsl::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_item_id(&self, item_id: &str) -> Result<Vec<BarcodeRow>, RepositoryError> {
        let result = barcode_dsl::barcode
            .filter(barcode_dsl::item_id.eq(item_id))
            .get_results(self.connection.lock().connection())?;
        Ok(result)
    }
}

impl Upsert for BarcodeRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let change_log_id = BarcodeRowRepository::new(con).upsert_one(self)?;
        Ok(Some(change_log_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            BarcodeRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
