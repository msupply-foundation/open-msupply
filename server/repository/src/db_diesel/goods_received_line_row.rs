use super::item_row::item;
use crate::db_diesel::goods_received_row::goods_received;
use crate::db_diesel::item_link_row::item_link;
use crate::db_diesel::name_link_row::name_link;
use crate::diesel_macros::define_linked_tables;
use crate::EqualFilter;
use crate::{
    goods_received_row::GoodsReceivedRowRepository, ChangeLogInsertRow, ChangelogRepository,
    ChangelogTableName, Delete, RepositoryError, RowActionType, StorageConnection, Upsert,
};
use chrono::NaiveDate;
use diesel::dsl::max;
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

define_linked_tables! {
    view: goods_received_line = "goods_received_line_view",
    core: goods_received_line_with_links = "goods_received_line",
    struct: GoodsReceivedLineRow,
    repo: GoodsReceivedLineRowRepository,
    shared: {
        goods_received_id -> Text,
        purchase_order_line_id -> Text,
        received_pack_size -> Double,
        number_of_packs_received -> Double,
        batch -> Nullable<Text>,
        weight_per_pack -> Nullable<Double>,
        expiry_date -> Nullable<Date>,
        line_number -> BigInt,
        item_link_id -> Text,
        item_name -> Text,
        location_id -> Nullable<Text>,
        volume_per_pack -> Nullable<Double>,
        status -> crate::db_diesel::goods_received_line_row::GoodsReceivedLineStatusMapping,
        comment -> Nullable<Text>,
    },
    links: {},
    optional_links: {
        manufacturer_link_id -> manufacturer_id,
    }
}

joinable!(goods_received_line -> item_link(item_link_id));
joinable!(goods_received_line -> goods_received(goods_received_id));
joinable!(goods_received_line_with_links -> name_link (manufacturer_link_id));
allow_tables_to_appear_in_same_query!(goods_received_line, item_link);
allow_tables_to_appear_in_same_query!(goods_received_line, item);
allow_tables_to_appear_in_same_query!(goods_received_line, goods_received);
allow_tables_to_appear_in_same_query!(goods_received_line_with_links, name_link);

#[derive(Clone, Queryable, Debug, Serialize, Deserialize, Default, PartialEq)]
#[diesel(table_name = goods_received_line)]
pub struct GoodsReceivedLineRow {
    pub id: String,
    pub goods_received_id: String,
    pub purchase_order_line_id: String,
    pub received_pack_size: f64,
    pub number_of_packs_received: f64,
    pub batch: Option<String>,
    pub weight_per_pack: Option<f64>,
    pub expiry_date: Option<NaiveDate>,
    pub line_number: i64,
    pub item_link_id: String,
    pub item_name: String,
    pub location_id: Option<String>,
    pub volume_per_pack: Option<f64>,
    pub status: GoodsReceivedLineStatus,
    pub comment: Option<String>,
    // Resolved from name_link - must be last to match view column order
    pub manufacturer_id: Option<String>,
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[cfg_attr(test, derive(strum::EnumIter))]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum GoodsReceivedLineStatus {
    #[default]
    Unauthorised,
    Authorised,
}

impl GoodsReceivedLineStatus {
    pub fn equal_to(&self) -> EqualFilter<Self> {
        EqualFilter {
            equal_to: Some(self.clone()),
            ..Default::default()
        }
    }
}

pub struct GoodsReceivedLineRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> GoodsReceivedLineRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        GoodsReceivedLineRowRepository { connection }
    }

    pub fn _upsert_one(&self, row: &GoodsReceivedLineRow) -> Result<(), RepositoryError> {
        self._upsert(row)?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &GoodsReceivedLineRow) -> Result<i64, RepositoryError> {
        self._upsert_one(row)?;
        self.insert_changelog(row.to_owned(), RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        row: GoodsReceivedLineRow,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let goods_received = GoodsReceivedRowRepository::new(self.connection)
            .find_one_by_id(&row.goods_received_id)?;
        let store_id = match goods_received {
            Some(goods_received) => goods_received.store_id,
            None => return Err(RepositoryError::NotFound),
        };

        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::GoodsReceivedLine,
            record_id: row.id,
            row_action: action,
            store_id: Some(store_id),
            name_link_id: None,
        };
        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn find_one_by_id(
        &self,
        id: &str,
    ) -> Result<Option<GoodsReceivedLineRow>, RepositoryError> {
        let result = goods_received_line::table
            .filter(goods_received_line::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(goods_received_line_with_links::table)
            .filter(goods_received_line_with_links::id.eq(id))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_max_goods_received_line_number(
        &self,
        goods_received_id: &str,
    ) -> Result<Option<i64>, RepositoryError> {
        let result = goods_received_line::table
            .filter(goods_received_line::goods_received_id.eq(goods_received_id))
            .select(max(goods_received_line::line_number))
            .first(self.connection.lock().connection())?;
        Ok(result)
    }
}

impl Upsert for GoodsReceivedLineRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let change_log_id = GoodsReceivedLineRowRepository::new(con).upsert_one(self)?;
        Ok(Some(change_log_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            GoodsReceivedLineRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

#[derive(Debug, Clone)]
pub struct GoodsReceivedLineDelete(pub String);
impl Delete for GoodsReceivedLineDelete {
    fn delete(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        GoodsReceivedLineRowRepository::new(con).delete(&self.0)?;
        Ok(None)
    }

    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            GoodsReceivedLineRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}
