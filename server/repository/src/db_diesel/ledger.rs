use crate::{
    diesel_macros::{apply_equal_filter, apply_sort, apply_sort_no_case},
    EqualFilter, InvoiceType, Pagination, RepositoryError, Sort,
};

use super::{ledger::ledger::dsl as ledger_dsl, DBType, InvoiceStatus, StorageConnection};

use chrono::{NaiveDate, NaiveDateTime};
use diesel::prelude::*;

table! {
    #[sql_name = "stock_movement"]
    ledger (id) {
        id -> Text,
        stock_line_id -> Nullable<Text>,
        name -> Text,
        item_id -> Text,
        store_id -> Text,
        quantity -> Double,
        datetime -> Timestamp,
        invoice_type -> crate::db_diesel::invoice_row::InvoiceTypeMapping,
        invoice_number -> BigInt,
        inventory_adjustment_reason -> Nullable<Text>,
        return_reason ->  Nullable<Text>,
        invoice_status -> crate::db_diesel::invoice_row::InvoiceStatusMapping,
        pack_size -> Double,
        expiry_date -> Nullable<Date>,
        batch -> Nullable<Text>,
        cost_price_per_pack -> Double,
        sell_price_per_pack -> Double,
        total_before_tax -> Nullable<Double>,
        number_of_packs -> Double,
    }
}

#[derive(Clone, Queryable, Debug, PartialEq)]
pub struct LedgerRow {
    pub id: String,
    pub stock_line_id: Option<String>,
    pub name: String,
    pub item_id: String,
    pub store_id: String,
    pub quantity: f64,
    pub datetime: NaiveDateTime,
    pub invoice_type: InvoiceType,
    pub invoice_number: i64,
    pub inventory_adjustment_reason: Option<String>,
    pub return_reason: Option<String>,
    pub invoice_status: InvoiceStatus,
    pub pack_size: f64,
    pub expiry_date: Option<NaiveDate>,
    pub batch: Option<String>,
    pub cost_price_per_pack: f64,
    pub sell_price_per_pack: f64,
    pub total_before_tax: Option<f64>,
    pub number_of_packs: f64,
}

#[derive(Clone, Default)]
pub struct LedgerFilter {
    pub stock_line_id: Option<EqualFilter<String>>,
    pub item_id: Option<EqualFilter<String>>,
    pub store_id: Option<EqualFilter<String>>,
}

#[derive(PartialEq, Debug)]
pub enum LedgerSortField {
    Id,
    Datetime,
    Name,
    InvoiceType,
    StockLineId,
    Quantity,
    ItemId,
}

pub type LedgerSort = Sort<LedgerSortField>;

impl LedgerFilter {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn stock_line_id(mut self, filter: EqualFilter<String>) -> Self {
        self.stock_line_id = Some(filter);
        self
    }

    pub fn item_id(mut self, filter: EqualFilter<String>) -> Self {
        self.item_id = Some(filter);
        self
    }

    pub fn store_id(mut self, filter: EqualFilter<String>) -> Self {
        self.store_id = Some(filter);
        self
    }
}

pub struct LedgerRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> LedgerRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        LedgerRepository { connection }
    }

    pub fn count(&self, filter: Option<LedgerFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);
        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<LedgerFilter>,
        sort: Option<LedgerSort>,
    ) -> Result<Vec<LedgerRow>, RepositoryError> {
        let mut query = create_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                LedgerSortField::Id => {
                    apply_sort!(query, sort, ledger_dsl::id);
                }
                LedgerSortField::Datetime => {
                    apply_sort!(query, sort, ledger_dsl::datetime);
                }
                LedgerSortField::Name => {
                    apply_sort_no_case!(query, sort, ledger_dsl::name);
                }
                LedgerSortField::InvoiceType => {
                    apply_sort!(query, sort, ledger_dsl::invoice_type);
                }
                LedgerSortField::StockLineId => {
                    apply_sort!(query, sort, ledger_dsl::stock_line_id);
                }
                LedgerSortField::Quantity => {
                    apply_sort!(query, sort, ledger_dsl::quantity);
                }
                LedgerSortField::ItemId => {
                    apply_sort!(query, sort, ledger_dsl::item_id);
                }
            }
        }

        let final_query = query;

        // Debug diesel query
        // println!(
        //     "{}",
        //     diesel::debug_query::<crate::DBType, _>(&final_query).to_string()
        // );

        let result = final_query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<LedgerRow>(self.connection.lock().connection())?;

        Ok(result)
    }
}

type BoxedLedgerQuery = ledger::BoxedQuery<'static, DBType>;

fn create_filtered_query(filter: Option<LedgerFilter>) -> BoxedLedgerQuery {
    let mut query = ledger_dsl::ledger.into_boxed();
    query = query.filter(ledger_dsl::datetime.is_not_null());

    if let Some(f) = filter {
        let LedgerFilter {
            stock_line_id,
            item_id,
            store_id,
        } = f;

        apply_equal_filter!(query, stock_line_id, ledger_dsl::stock_line_id);
        apply_equal_filter!(query, item_id, ledger_dsl::item_id);
        apply_equal_filter!(query, store_id, ledger_dsl::store_id);
    }

    query
}

#[cfg(test)]
mod tests {
    use crate::{
        mock::{mock_stock_line_a, MockDataInserts},
        test_db,
    };

    use super::*;

    #[actix_rt::test]
    async fn ledger_repository() {
        // Prepare
        let (_, storage_connection, _, _) =
            test_db::setup_all("ledger_repository", MockDataInserts::all()).await;

        let repo = LedgerRepository::new(&storage_connection);
        let filter =
            LedgerFilter::new().stock_line_id(EqualFilter::equal_to(&mock_stock_line_a().id));
        let sort = LedgerSort {
            key: LedgerSortField::Id,
            desc: Some(false),
        };
        // Check deserialization (into rust types)
        assert!(repo
            .query(Pagination::all(), Some(filter), Some(sort))
            .is_ok());
    }
}
