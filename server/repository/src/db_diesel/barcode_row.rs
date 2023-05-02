use super::{barcode_row::barcode::dsl as barcode_dsl, StorageConnection};

use crate::{
    db_diesel::{invoice_line_row::invoice_line, item_row::item},
    repository_error::RepositoryError,
};

use diesel::prelude::*;

table! {
    barcode (id) {
        id -> Text,
        value -> Text,
        item_id -> Text,
        manufacturer_id -> Nullable<Text>,
        pack_size -> Nullable<Integer>,
        parent_id -> Nullable<Text>,
    }
}

joinable!(barcode -> item (item_id));
joinable!(barcode -> invoice_line (id));

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq)]
#[changeset_options(treat_none_as_null = "true")]
#[table_name = "barcode"]
pub struct BarcodeRow {
    pub id: String,
    pub value: String,
    pub item_id: String,
    pub manufacturer_id: Option<String>,
    pub pack_size: Option<i32>,
    pub parent_id: Option<String>,
}

impl Default for BarcodeRow {
    fn default() -> Self {
        BarcodeRow {
            id: Default::default(),
            value: Default::default(),
            item_id: Default::default(),
            manufacturer_id: None,
            pack_size: None,
            parent_id: None,
        }
    }
}
pub struct BarcodeRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> BarcodeRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        BarcodeRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, row: &BarcodeRow) -> Result<(), RepositoryError> {
        diesel::insert_into(barcode_dsl::barcode)
            .values(row)
            .on_conflict(barcode_dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, row: &BarcodeRow) -> Result<(), RepositoryError> {
        diesel::replace_into(barcode_dsl::barcode)
            .values(row)
            .execute(&self.connection.connection)?;
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
}
