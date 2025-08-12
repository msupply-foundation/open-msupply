use crate::Delete;
use crate::{
    ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, RepositoryError, RowActionType,
    StorageConnection, Upsert,
};
use chrono::{NaiveDate, NaiveDateTime};
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use diesel::dsl::max;
use serde::{Deserialize, Serialize};

table! {
    goods_received (id) {
        id -> Text,
        store_id -> Text,
        purchase_order_id -> Nullable<Text>,
        inbound_shipment_id -> Nullable<Text>,
        goods_received_number -> BigInt,
        status -> crate::db_diesel::goods_received_row::GoodsReceivedStatusMapping,
        received_date -> Nullable<Date>,
        comment -> Nullable<Text>,
        supplier_reference -> Nullable<Text>,
        donor_link_id -> Nullable<Text>,
        created_datetime -> Timestamp,
        finalised_datetime -> Nullable<Timestamp>,
        created_by -> Nullable<Text>,
    }
}

#[derive(
    Clone, Insertable, Queryable, Debug, AsChangeset, Serialize, Deserialize, Default, PartialEq,
)]
#[diesel(table_name = goods_received)]
#[diesel(treat_none_as_null = true)]
pub struct GoodsReceivedRow {
    pub id: String,
    pub store_id: String,
    pub purchase_order_id: Option<String>,
    pub inbound_shipment_id: Option<String>,
    pub goods_received_number: i64,
    pub status: GoodsReceivedStatus,
    pub received_date: Option<NaiveDate>,
    pub comment: Option<String>,
    pub supplier_reference: Option<String>,
    pub donor_link_id: Option<String>,
    pub created_datetime: NaiveDateTime,
    pub finalised_datetime: Option<NaiveDateTime>,
    pub created_by: Option<String>,
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[cfg_attr(test, derive(strum::EnumIter))]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum GoodsReceivedStatus {
    #[default]
    New,
    Finalised,
}

pub struct GoodsReceivedRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> GoodsReceivedRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        GoodsReceivedRowRepository { connection }
    }

    pub fn _upsert_one(&self, row: &GoodsReceivedRow) -> Result<(), RepositoryError> {
        diesel::insert_into(goods_received::table)
            .values(row)
            .on_conflict(goods_received::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &GoodsReceivedRow) -> Result<i64, RepositoryError> {
        self._upsert_one(row)?;
        self.insert_changelog(row.to_owned(), RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        row: GoodsReceivedRow,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::GoodsReceived,
            record_id: row.id,
            row_action: action,
            store_id: Some(row.store_id),
            name_link_id: None,
        };
        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn find_all(&self) -> Result<Vec<GoodsReceivedRow>, RepositoryError> {
        let result = goods_received::table.load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<GoodsReceivedRow>, RepositoryError> {
        let result = goods_received::table
            .filter(goods_received::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, id: &str) -> Result<(), RepositoryError> {
        diesel::delete(goods_received::table)
            .filter(goods_received::id.eq(id))
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_max_goods_received_number(
        &self,
        store_id: &str,
    ) -> Result<Option<i64>, RepositoryError> {
        let result = goods_received::table
            .filter(goods_received::store_id.eq(store_id))
            .select(max(goods_received::goods_received_number))
            .first(self.connection.lock().connection())?;
        Ok(result)
    }
}

impl Upsert for GoodsReceivedRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let change_log_id = GoodsReceivedRowRepository::new(con).upsert_one(self)?;
        Ok(Some(change_log_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            GoodsReceivedRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

#[derive(Debug)]
pub struct GoodsReceivedRowDelete(pub String);
impl Delete for GoodsReceivedRowDelete {
    fn delete(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        GoodsReceivedRowRepository::new(con).delete(&self.0)?;
        Ok(None)
    }

    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            GoodsReceivedRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}
