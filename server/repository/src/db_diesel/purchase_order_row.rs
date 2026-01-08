use crate::{
    db_diesel::{item_link_row::item_link, item_row::item},
    ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, Delete, RepositoryError,
    RowActionType, StorageConnection, Upsert,
};
use chrono::{NaiveDate, NaiveDateTime};
use diesel::{dsl::max, prelude::*};
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

table! {
    purchase_order_stats (purchase_order_id) {
        purchase_order_id -> Text,
        order_total_before_discount -> Double,
        order_total_after_discount -> Double,
    }
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, Default)]
#[diesel(table_name = purchase_order_stats)]
pub struct PurchaseOrderStatsRow {
    pub purchase_order_id: String,
    pub order_total_before_discount: f64,
    pub order_total_after_discount: f64,
}

table! {
    purchase_order (id) {
        id ->  Text,
        store_id -> Text,
        created_by -> Nullable<Text>,
        supplier_name_link_id ->  Text,
        purchase_order_number -> BigInt,
        status -> crate::db_diesel::purchase_order_row::PurchaseOrderStatusMapping,
        created_datetime -> Timestamp,
        confirmed_datetime ->  Nullable<Timestamp>,
        target_months->  Nullable<Double>,
        comment->  Nullable<Text>,
        donor_link_id -> Nullable<Text>,
        reference -> Nullable<Text>,
        currency_id -> Nullable<Text>,
        foreign_exchange_rate -> Nullable<Double>,
        shipping_method ->  Nullable<Text>,
        sent_datetime -> Nullable<Timestamp>,
        contract_signed_date -> Nullable<Date>,
        advance_paid_date ->  Nullable<Date>,
        received_at_port_date ->   Nullable<Date>,
        requested_delivery_date -> Nullable<Date>,
        supplier_agent ->  Nullable<Text>,
        authorising_officer_1 ->  Nullable<Text>,
        authorising_officer_2 -> Nullable<Text>,
        additional_instructions -> Nullable<Text>,
        heading_message ->  Nullable<Text>,
        agent_commission -> Nullable<Double>,
        document_charge -> Nullable<Double>,
        communications_charge -> Nullable<Double>,
        insurance_charge ->  Nullable<Double>,
        freight_charge ->  Nullable<Double>,
        freight_conditions -> Nullable<Text>,
        supplier_discount_percentage -> Nullable<Double>,
        request_approval_datetime -> Nullable<Timestamp>,
        finalised_datetime -> Nullable<Timestamp>,
    }
}

joinable!(purchase_order -> purchase_order_stats (id));

allow_tables_to_appear_in_same_query!(purchase_order_stats, purchase_order);
allow_tables_to_appear_in_same_query!(purchase_order, item_link);
allow_tables_to_appear_in_same_query!(purchase_order, item);

#[derive(
    Clone, Insertable, Queryable, Debug, AsChangeset, Serialize, Deserialize, Default, PartialEq,
)]
#[diesel(table_name = purchase_order)]
#[diesel(treat_none_as_null = true)]
pub struct PurchaseOrderRow {
    pub id: String,
    pub store_id: String,
    pub created_by: Option<String>,
    pub supplier_name_link_id: String,
    pub purchase_order_number: i64,
    pub status: PurchaseOrderStatus,
    pub created_datetime: NaiveDateTime,
    pub confirmed_datetime: Option<NaiveDateTime>,
    pub target_months: Option<f64>,
    pub comment: Option<String>,
    pub donor_link_id: Option<String>,
    pub reference: Option<String>,
    pub currency_id: Option<String>,
    pub foreign_exchange_rate: Option<f64>,
    pub shipping_method: Option<String>,
    pub sent_datetime: Option<NaiveDateTime>,
    pub contract_signed_date: Option<NaiveDate>,
    pub advance_paid_date: Option<NaiveDate>,
    pub received_at_port_date: Option<NaiveDate>,
    pub requested_delivery_date: Option<NaiveDate>,
    pub supplier_agent: Option<String>,
    pub authorising_officer_1: Option<String>,
    pub authorising_officer_2: Option<String>,
    pub additional_instructions: Option<String>,
    pub heading_message: Option<String>,
    pub agent_commission: Option<f64>,
    pub document_charge: Option<f64>,
    pub communications_charge: Option<f64>,
    pub insurance_charge: Option<f64>,
    pub freight_charge: Option<f64>,
    pub freight_conditions: Option<String>,
    pub supplier_discount_percentage: Option<f64>,
    pub request_approval_datetime: Option<NaiveDateTime>,
    pub finalised_datetime: Option<NaiveDateTime>,
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default, Ord, PartialOrd)]
#[cfg_attr(test, derive(strum::EnumIter))]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum PurchaseOrderStatus {
    #[default]
    New,
    RequestApproval,
    Confirmed,
    Sent,
    Finalised,
}

pub struct PurchaseOrderRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PurchaseOrderRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PurchaseOrderRowRepository { connection }
    }

    pub fn _upsert_one(
        &self,
        purchase_order_row: &PurchaseOrderRow,
    ) -> Result<(), RepositoryError> {
        diesel::insert_into(purchase_order::table)
            .values(purchase_order_row)
            .on_conflict(purchase_order::id)
            .do_update()
            .set(purchase_order_row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(
        &self,
        purchase_order_row: &PurchaseOrderRow,
    ) -> Result<i64, RepositoryError> {
        self._upsert_one(purchase_order_row)?;
        self.insert_changelog(purchase_order_row.to_owned(), RowActionType::Upsert)
    }

    fn insert_changelog(
        &self,
        row: PurchaseOrderRow,
        action: RowActionType,
    ) -> Result<i64, RepositoryError> {
        let row = ChangeLogInsertRow {
            table_name: ChangelogTableName::PurchaseOrder,
            record_id: row.id,
            row_action: action,
            store_id: Some(row.store_id),
            name_link_id: None,
        };

        ChangelogRepository::new(self.connection).insert(&row)
    }

    pub fn find_all(&self) -> Result<Vec<PurchaseOrderRow>, RepositoryError> {
        let result = purchase_order::table.load(self.connection.lock().connection())?;
        Ok(result)
    }

    pub fn find_one_by_id(
        &self,
        purchase_order_id: &str,
    ) -> Result<Option<PurchaseOrderRow>, RepositoryError> {
        let result = purchase_order::table
            .filter(purchase_order::id.eq(purchase_order_id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn delete(&self, purchase_order_id: &str) -> Result<Option<i64>, RepositoryError> {
        let old_row = self.find_one_by_id(purchase_order_id)?;
        let change_log_id = match old_row {
            Some(old_row) => self.insert_changelog(old_row, RowActionType::Delete)?,
            None => {
                return Ok(None);
            }
        };

        diesel::delete(purchase_order::table)
            .filter(purchase_order::id.eq(purchase_order_id))
            .execute(self.connection.lock().connection())?;
        Ok(Some(change_log_id))
    }

    pub fn find_max_purchase_order_number(
        &self,
        store_id: &str,
    ) -> Result<Option<i64>, RepositoryError> {
        let result = purchase_order::table
            .filter(purchase_order::store_id.eq(store_id))
            .select(max(purchase_order::purchase_order_number))
            .first(self.connection.lock().connection())?;
        Ok(result)
    }
}

impl Upsert for PurchaseOrderRow {
    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let change_log_id = PurchaseOrderRowRepository::new(con).upsert_one(self)?;
        Ok(Some(change_log_id))
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            PurchaseOrderRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}

#[derive(Debug, Clone)]
pub struct PurchaseOrderDelete(pub String);
impl Delete for PurchaseOrderDelete {
    fn delete(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        let change_log_id = PurchaseOrderRowRepository::new(con).delete(&self.0)?;
        Ok(change_log_id)
    }
    // Test only
    fn assert_deleted(&self, con: &StorageConnection) {
        assert_eq!(
            PurchaseOrderRowRepository::new(con).find_one_by_id(&self.0),
            Ok(None)
        )
    }
}

#[cfg(test)]
mod test {
    use crate::mock::{mock_name_c, mock_store_a, MockDataInserts};
    use crate::{
        test_db::setup_all, PurchaseOrderRow, PurchaseOrderRowRepository, PurchaseOrderStatus,
    };
    use strum::IntoEnumIterator;
    use util::uuid::uuid;

    #[actix_rt::test]
    async fn purchase_order_status() {
        let (_, connection, _, _) =
            setup_all("purchase order status", MockDataInserts::all()).await;

        let repo = PurchaseOrderRowRepository::new(&connection);
        // Try upsert all variants of PurchaseOrderStatus, confirm that diesel enums match postgres
        let mut po_number = 1;
        for status in PurchaseOrderStatus::iter() {
            let id = uuid();
            let row = PurchaseOrderRow {
                id: id.clone(),
                supplier_name_link_id: mock_name_c().id,
                status,
                store_id: mock_store_a().id.clone(),
                created_datetime: chrono::Utc::now().naive_utc(),
                purchase_order_number: po_number,
                ..Default::default()
            };
            po_number += 1;

            let _ = repo.upsert_one(&row).unwrap();

            let result = repo.find_one_by_id(&id).unwrap().unwrap();
            assert_eq!(result.status, row.status);
        }
    }
}
