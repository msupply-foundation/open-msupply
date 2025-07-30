use crate::{
    ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, Delete,
    PurchaseOrderRowRepository, RepositoryError, RowActionType, StorageConnection, Upsert,
};
use chrono::NaiveDateTime;
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

table! {
    goods_received_line (id) {
        id -> Text,
        goods_received_id -> Text,
        purchase_order_id -> Text,
        requested_pack_size -> Double,
        number_of_packs_received -> Double,
        batch -> Nullable<Text>,
        weight_per_pack -> Nullable<Double>,
        expiry_date -> Nullable<Timestamp>,
        line_number -> BigInt,
        item_link_id -> Text,
        item_name -> Text,
        location_id -> Text,
        volume_per_pack -> Nullable<Double>,
        manufacturer_link_id -> Text,
        // TODO map GoodsReceivedLineStatusMapping in OMS to is_authorized in OG: see issue [8647](https://github.com/msupply-foundation/open-msupply/issues/8068?issue=msupply-foundation%7Copen-msupply%7C8647)
        status -> crate::db_diesel::goods_received_line_row::GoodsReceivedLineStatusMapping,
        comment -> Nullable<Text>,
    }
}

#[derive(
    Clone, Insertable, Queryable, Debug, AsChangeset, Serialize, Deserialize, Default, PartialEq,
)]
#[diesel(table_name = goods_received_line)]
#[diesel(treat_none_as_null = true)]
pub struct GoodsReceivedLineRow {
    id: String,
    goods_received_id: String,
    purchase_order_id: String,
    requested_pack_size: f64,
    number_of_packs_received: f64,
    batch: Option<String>,
    weight_per_pack: Option<f64>,
    expiry_date: Option<NaiveDateTime>,
    line_number: i64,
    item_link_id: String,
    item_name: String,
    location_id: String,
    volume_per_pack: Option<f64>,
    manufacturer_link_id: String,
    // TODO map GoodsReceivedLineStatusMapping in OMS to is_authorized in OG: see issue [8647](https://github.com/msupply-foundation/open-msupply/issues/8068?issue=msupply-foundation%7Copen-msupply%7C8647)
    status: GoodsReceivedLineStatus,
    comment: Option<String>,
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

pub struct GoodsReceivedLineRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> GoodsReceivedLineRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        GoodsReceivedLineRowRepository { connection }
    }

    pub fn _upsert_one(&self, row: &GoodsReceivedLineRow) -> Result<(), RepositoryError> {
        diesel::insert_into(goods_received_line::table)
            .values(row)
            .on_conflict(goods_received_line::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
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
        // TODO NIT query goods_received for store_id instead of purchase_order once PR 8631 merged (https://github.com/msupply-foundation/open-msupply/pull/8631)
        let purchase_order = PurchaseOrderRowRepository::new(self.connection)
            .find_one_by_id(&row.purchase_order_id)?;
        let store_id = match purchase_order {
            Some(purchase_order) => purchase_order.store_id,
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

    pub fn find_all(&self) -> Result<Vec<GoodsReceivedLineRow>, RepositoryError> {
        let result = goods_received_line::table.load(self.connection.lock().connection())?;
        Ok(result)
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
        diesel::delete(goods_received_line::table)
            .filter(goods_received_line::id.eq(id))
            .execute(self.connection.lock().connection())?;
        Ok(())
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

#[derive(Debug)]
pub struct GoodsReceivedLineRowDelete(pub String);
impl Delete for GoodsReceivedLineRowDelete {
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
