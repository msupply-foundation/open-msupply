use crate::{
    db_diesel::stock_line_row::stock_line,
    diesel_macros::{apply_date_time_filter, apply_equal_filter, apply_sort, apply_sort_no_case},
    EqualFilter, InvoiceType, MasterListLineFilter, MasterListLineRepository, Pagination,
    RepositoryError, Sort, StockLineFilter, StockLineRepository,
};

use super::{item_row::item, DBType, DatetimeFilter, InvoiceStatus, StorageConnection};

use chrono::{NaiveDate, NaiveDateTime};
use diesel::prelude::*;

/*
-- Stock Line Ledger --

View over all movements for particular stock line in a store.

This is a separate repository/view from stock_movement or item_ledger
as it calculates the running balance of total stock on hand for each STOCK LINE.

A window function is used to calculated the running balance, which can be expensive to run.
Therefore, we only use this repository when we need that stock line running balance, for the
stock ledger page, and potentially reports.
*/

table! {
    stock_line_ledger (id) {
        id -> Text,
        stock_line_id -> Nullable<Text>,
        name -> Text,
        item_id -> Text,
        store_id -> Text,
        quantity -> Double,
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
        running_balance -> Double,
    }
}

#[derive(Clone, Queryable, Debug, PartialEq, Default)]
pub struct StockLineLedgerRow {
    pub id: String,
    pub stock_line_id: Option<String>,
    pub name: String,
    pub item_id: String,
    pub store_id: String,
    pub quantity: f64,
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
    /// The running balance for the stock line at the time of this ledger entry
    pub running_balance: f64,
}

#[derive(Clone, Default)]
pub struct StockLineLedgerFilter {
    pub stock_line_id: Option<EqualFilter<String>>,
    pub item_id: Option<EqualFilter<String>>,
    pub store_id: Option<EqualFilter<String>>,
    pub datetime: Option<DatetimeFilter>,
    pub master_list_id: Option<EqualFilter<String>>,
    pub stock_line: Option<StockLineFilter>,
}

#[derive(PartialEq, Debug)]
pub enum StockLineLedgerSortField {
    Datetime,
    Name,
    InvoiceType,
    StockLineId,
    Quantity,
    ItemId,
}

pub type StockLineLedgerSort = Sort<StockLineLedgerSortField>;

impl StockLineLedgerFilter {
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

    pub fn datetime(mut self, filter: DatetimeFilter) -> Self {
        self.datetime = Some(filter);
        self
    }

    pub fn master_list_id(mut self, filter: EqualFilter<String>) -> Self {
        self.master_list_id = Some(filter);
        self
    }

    pub fn stock_line(mut self, filter: StockLineFilter) -> Self {
        self.stock_line = Some(filter);
        self
    }
}

pub struct StockLineLedgerRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> StockLineLedgerRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        StockLineLedgerRepository { connection }
    }

    pub fn query_by_filter(
        &self,
        filter: StockLineLedgerFilter,
    ) -> Result<Vec<StockLineLedgerRow>, RepositoryError> {
        self.query(Pagination::all(), Some(filter), None)
    }

    pub fn count(&self, filter: Option<StockLineLedgerFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(self.connection, filter);
        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<StockLineLedgerFilter>,
        sort: Option<StockLineLedgerSort>,
    ) -> Result<Vec<StockLineLedgerRow>, RepositoryError> {
        let mut query = create_filtered_query(self.connection, filter);

        if let Some(sort) = sort {
            match sort.key {
                StockLineLedgerSortField::Datetime => {
                    apply_sort!(query, sort, stock_line_ledger::datetime);
                }
                StockLineLedgerSortField::Name => {
                    apply_sort_no_case!(query, sort, stock_line_ledger::name);
                }
                StockLineLedgerSortField::InvoiceType => {
                    apply_sort!(query, sort, stock_line_ledger::invoice_type);
                }
                StockLineLedgerSortField::StockLineId => {
                    apply_sort!(query, sort, stock_line_ledger::stock_line_id);
                }
                StockLineLedgerSortField::Quantity => {
                    apply_sort!(query, sort, stock_line_ledger::quantity);
                }
                StockLineLedgerSortField::ItemId => {
                    apply_sort!(query, sort, stock_line_ledger::item_id);
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
            .load::<StockLineLedgerRow>(self.connection.lock().connection())?;

        Ok(result)
    }
}

type BoxedLedgerQuery = stock_line_ledger::BoxedQuery<'static, DBType>;

fn create_filtered_query(
    connection: &StorageConnection,
    filter: Option<StockLineLedgerFilter>,
) -> BoxedLedgerQuery {
    let mut query = stock_line_ledger::table.into_boxed();
    query = query.filter(stock_line_ledger::datetime.is_not_null());

    if let Some(f) = filter {
        let StockLineLedgerFilter {
            stock_line_id,
            item_id,
            store_id,
            datetime,
            master_list_id,
            stock_line,
        } = f;

        if let Some(stock_line_filter) = stock_line {
            let store_id_value = store_id.as_ref().and_then(|s| s.equal_to.clone());

            let stock_line = StockLineRepository::create_filtered_query(
                connection,
                Some(stock_line_filter),
                store_id_value.clone(),
            );
            let stock_line_ids = stock_line.select(stock_line::id.nullable());

            query = query.filter(stock_line_ledger::stock_line_id.eq_any(stock_line_ids));
        }

        apply_equal_filter!(query, stock_line_id, stock_line_ledger::stock_line_id);
        apply_equal_filter!(query, item_id, stock_line_ledger::item_id);
        apply_equal_filter!(query, store_id, stock_line_ledger::store_id);
        apply_date_time_filter!(query, datetime, stock_line_ledger::datetime);

        if let Some(master_list_id) = master_list_id {
            let item_ids = MasterListLineRepository::create_filtered_query(
                Some(MasterListLineFilter::new().master_list_id(master_list_id)),
                None,
            )
            .unwrap()
            .select(item::id);

            query = query.filter(stock_line_ledger::item_id.eq_any(item_ids));
        }
    }

    query
}

#[cfg(test)]
mod tests {
    use crate::{
        mock::{
            ledger::{get_test_ledger_datetime, mock_ledger_data},
            MockData, MockDataInserts,
        },
        test_db,
    };

    use super::*;

    #[actix_rt::test]
    async fn stock_line_ledger_repository() {
        // Prepare
        let (items, stock_lines, invoices, invoice_lines) = mock_ledger_data();
        let (_, storage_connection, _, _) = test_db::setup_all_with_data(
            "stock_line_ledger_repository",
            MockDataInserts::all(),
            MockData {
                items,
                stock_lines,
                invoices,
                invoice_lines,
                ..Default::default()
            },
        )
        .await;

        let repo = StockLineLedgerRepository::new(&storage_connection);
        let filter = StockLineLedgerFilter::new()
            .stock_line_id(EqualFilter::equal_to("ledger_stock_line_a".to_string()));
        let sort = StockLineLedgerSort {
            key: StockLineLedgerSortField::Datetime,
            desc: Some(true),
        };
        // Check deserialization (into rust types)
        let result = repo.query(Pagination::all(), Some(filter), Some(sort));
        assert!(result.is_ok());

        let result = result.unwrap();

        // Validate the results based on the mock_ledger_data
        // PICKED+ outbounds, RECEIVED+ inbounds, VERIFIED adjustments should be included

        assert_eq!(result[0].id, "verified_inventory_adjustment_line");
        assert_eq!(result[1].id, "picked_outbound_line");
        assert_eq!(result[2].id, "received_inbound_line");

        // There are ledger entries for another item, and another stock line, check those aren't included
        assert_eq!(result.len(), 3);

        // Check that the results are in the expected order (reverse chronological)
        assert_eq!(result[0].datetime, get_test_ledger_datetime(5));
        assert_eq!(result[1].datetime, get_test_ledger_datetime(4));
        assert_eq!(result[2].datetime, get_test_ledger_datetime(2));

        // Check the running balance (reverse chronological)
        assert_eq!(result[0].running_balance, 50.0); // verified inventory addition
        assert_eq!(result[1].running_balance, 0.0); // picked outbound
        assert_eq!(result[2].running_balance, 50.0); // received inbound
    }
}
