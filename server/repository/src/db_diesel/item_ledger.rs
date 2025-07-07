use crate::{
    diesel_macros::{apply_date_time_filter, apply_equal_filter},
    EqualFilter, InvoiceType, Pagination, RepositoryError,
};

use super::{DBType, DatetimeFilter, InvoiceStatus, StorageConnection};

use chrono::{NaiveDate, NaiveDateTime};
use diesel::prelude::*;

/*
-- Item Ledger --

View over all stock movements for an item in a store.

This is a separate repository/view from stock_movement or ledger (stock ledger)
as it calculates the running balance of total stock on hand for the ITEM in each store.

A window function is used to calculated the running balance, which can be expensive to run.
Therefore, we only use this repository when we need that item running balance, for the
item ledger page, and potentially reports.
 */

table! {
    item_ledger (id) {
        id -> Text,
        name -> Text,
        item_id -> Text,
        store_id -> Text,
        movement_in_units -> Double,
        datetime -> Timestamp,
        invoice_type -> crate::db_diesel::invoice_row::InvoiceTypeMapping,
        invoice_number -> BigInt,
        invoice_id -> Text,
        reason -> Nullable<Text>,
        invoice_status -> crate::db_diesel::invoice_row::InvoiceStatusMapping,
        pack_size -> Double,
        expiry_date -> Nullable<Date>,
        batch -> Nullable<Text>,
        cost_price_per_pack -> Double,
        sell_price_per_pack -> Double,
        total_before_tax -> Nullable<Double>,
        number_of_packs -> Double,
        type_precedence -> Integer,
        running_balance -> Double,
    }
}

#[derive(Clone, Queryable, Debug, PartialEq, Default)]
pub struct ItemLedgerRow {
    pub id: String,
    pub name: String,
    pub item_id: String,
    pub store_id: String,
    pub movement_in_units: f64,
    pub datetime: NaiveDateTime,
    pub invoice_type: InvoiceType,
    pub invoice_number: i64,
    pub invoice_id: String,
    pub reason: Option<String>,
    pub invoice_status: InvoiceStatus,
    pub pack_size: f64,
    pub expiry_date: Option<NaiveDate>,
    pub batch: Option<String>,
    pub cost_price_per_pack: f64,
    pub sell_price_per_pack: f64,
    pub total_before_tax: Option<f64>,
    pub number_of_packs: f64,
    pub type_precedence: i32,
    pub running_balance: f64,
}

#[derive(Clone, Default)]
pub struct ItemLedgerFilter {
    pub store_id: Option<EqualFilter<String>>,
    pub item_id: Option<EqualFilter<String>>,
    pub datetime: Option<DatetimeFilter>,
    pub invoice_type: Option<EqualFilter<InvoiceType>>,
    pub invoice_status: Option<EqualFilter<InvoiceStatus>>,
}

impl ItemLedgerFilter {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn item_id(mut self, filter: EqualFilter<String>) -> Self {
        self.item_id = Some(filter);
        self
    }

    pub fn store_id(mut self, filter: EqualFilter<String>) -> Self {
        self.store_id = Some(filter);
        self
    }

    pub fn datetime(mut self, filter: DatetimeFilter) -> Self {
        self.datetime = Some(filter);
        self
    }
}

pub struct ItemLedgerRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ItemLedgerRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ItemLedgerRepository { connection }
    }

    pub fn count(&self, filter: Option<ItemLedgerFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);
        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<ItemLedgerFilter>,
    ) -> Result<Vec<ItemLedgerRow>, RepositoryError> {
        let mut query = create_filtered_query(filter);
        query = query
            .order(item_ledger::datetime.desc())
            .then_order_by(item_ledger::id.desc())
            .then_order_by(item_ledger::type_precedence.asc());

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<ItemLedgerRow>(self.connection.lock().connection())?;

        Ok(result)
    }
}

type ItemLedgerQuery = item_ledger::BoxedQuery<'static, DBType>;

fn create_filtered_query(filter: Option<ItemLedgerFilter>) -> ItemLedgerQuery {
    let mut query = item_ledger::table.into_boxed();
    query = query.filter(item_ledger::datetime.is_not_null());

    if let Some(f) = filter {
        let ItemLedgerFilter {
            item_id,
            store_id,
            datetime,
            invoice_type,
            invoice_status,
        } = f;

        apply_equal_filter!(query, item_id, item_ledger::item_id);
        apply_equal_filter!(query, store_id, item_ledger::store_id);
        apply_date_time_filter!(query, datetime, item_ledger::datetime);
        apply_equal_filter!(query, invoice_type, item_ledger::invoice_type);
        apply_equal_filter!(query, invoice_status, item_ledger::invoice_status);
    }

    query
}
