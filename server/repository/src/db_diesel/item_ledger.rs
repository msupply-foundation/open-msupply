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

#[cfg(test)]
mod tests {
    use crate::{
        mock::{
            ledger::{get_test_ledger_datetime, mock_ledger_data},
            MockData, MockDataInserts,
        },
        test_db, ItemLinkRowRepository,
    };

    use super::*;

    #[actix_rt::test]
    async fn item_ledger_repository() {
        // Insert invoice lines for each status to test the view
        let (items, stock_lines, invoices, invoice_lines) = mock_ledger_data();
        let (_, storage_connection, _, _) = test_db::setup_all_with_data(
            "item_ledger_repository",
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

        let repo = ItemLedgerRepository::new(&storage_connection);
        let filter = ItemLedgerFilter::new().item_id(EqualFilter::equal_to("ledger_test_item".to_string()));

        let result = repo.query(Pagination::all(), Some(filter.clone())).unwrap();

        // Validate the results based on the mock_ledger_data
        // PICKED+ outbounds, RECEIVED+ inbounds, VERIFIED adjustments should be included

        assert_eq!(result[0].id, "verified_inventory_adjustment_line");
        assert_eq!(result[1].id, "picked_outbound_line_stock_line_b");
        assert_eq!(result[2].id, "picked_outbound_line");
        assert_eq!(result[3].id, "verified_inbound_line_stock_line_b");
        assert_eq!(result[4].id, "received_inbound_line");

        // There is a ledger entry for another item, check it is not included
        assert_eq!(result.len(), 5);

        // Check that the results are in the expected order (reverse chronological)
        assert_eq!(result[0].datetime, get_test_ledger_datetime(5));
        assert_eq!(result[1].datetime, get_test_ledger_datetime(4));
        assert_eq!(result[2].datetime, get_test_ledger_datetime(4));
        assert_eq!(result[3].datetime, get_test_ledger_datetime(3)); // the received time of the verified inbound
        assert_eq!(result[4].datetime, get_test_ledger_datetime(2));

        // Check the running balance (reverse chronological)
        assert_eq!(result[4].running_balance, 50.0); // received first inbound
        assert_eq!(result[3].running_balance, 100.0); // received another inbound
        assert_eq!(result[2].running_balance, 50.0); // picked outbound
        assert_eq!(result[1].running_balance, 0.0); // picked outbound second line
        assert_eq!(result[0].running_balance, 50.0); // verified inventory addition

        let item_link_repo = ItemLinkRowRepository::new(&storage_connection);
        let mut item_link_b = item_link_repo
            .find_one_by_id("ledger_test_item_b")
            .unwrap()
            .unwrap();
        item_link_b.item_id = "ledger_test_item".to_string();
        item_link_repo.upsert_one(&item_link_b).unwrap();

        let result = repo.query(Pagination::all(), Some(filter)).unwrap();

        assert_eq!(result[0].id, "verified_inventory_adjustment_b_line");
        assert_eq!(result[1].id, "verified_inventory_adjustment_line");
        assert_eq!(result[2].id, "picked_outbound_line_stock_line_b");
        assert_eq!(result[3].id, "picked_outbound_line");
        assert_eq!(result[4].id, "verified_inbound_line_stock_line_b");
        assert_eq!(result[5].id, "received_inbound_line");

        // There is a ledger entry for another item, check it is not included
        assert_eq!(result.len(), 6);

        // Check that the results are in the expected order (reverse chronological)
        assert_eq!(result[0].datetime, get_test_ledger_datetime(6));
        assert_eq!(result[1].datetime, get_test_ledger_datetime(5));
        assert_eq!(result[2].datetime, get_test_ledger_datetime(4));
        assert_eq!(result[3].datetime, get_test_ledger_datetime(4));
        assert_eq!(result[4].datetime, get_test_ledger_datetime(3)); // the received time of the verified inbound
        assert_eq!(result[5].datetime, get_test_ledger_datetime(2));

        // Check the running balance (reverse chronological)
        assert_eq!(result[5].running_balance, 50.0); // received first inbound
        assert_eq!(result[4].running_balance, 100.0); // received another inbound
        assert_eq!(result[3].running_balance, 50.0); // picked outbound
        assert_eq!(result[2].running_balance, 0.0); // picked outbound second line
        assert_eq!(result[1].running_balance, 50.0); // verified inventory addition
        assert_eq!(result[0].running_balance, 100.0); // verified inventory addition (line b)
    }
}
