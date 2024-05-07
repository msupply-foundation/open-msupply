use crate::{
    diesel_macros::{apply_equal_filter, apply_sort, apply_sort_no_case},
    EqualFilter, InvoiceType, Pagination, RepositoryError, Sort,
};

use super::{ledger::ledger::dsl as ledger_dsl, StorageConnection};

use chrono::NaiveDateTime;
use diesel::prelude::*;

table! {
    #[sql_name = "stock_movement"]
    ledger (id) {
        id -> Text,
        stock_line_id -> Nullable<Text>,
        name -> Text,
        item_id -> Text,
        store_id -> Text,
        quantity -> BigInt,
        datetime -> Timestamp,
        invoice_type -> crate::db_diesel::invoice_row::InvoiceTypeMapping,
        inventory_adjustment_reason -> Nullable<Text>,
        return_reason ->  Nullable<Text>,
    }
}

#[derive(Clone, Queryable, Debug, PartialEq)]
pub struct LedgerRow {
    pub id: String,
    pub stock_line_id: Option<String>,
    pub name: String,
    pub item_id: String,
    pub store_id: String,
    pub quantity: i64,
    pub datetime: NaiveDateTime,
    pub invoice_type: InvoiceType,
    pub inventory_adjustment_reason: Option<String>,
    pub return_reason: Option<String>,
}

#[derive(Clone, Default)]
pub struct LedgerFilter {
    pub stock_line_id: Option<EqualFilter<String>>,
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
}

pub struct LedgerRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> LedgerRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        LedgerRepository { connection }
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<LedgerFilter>,
        sort: Option<LedgerSort>,
    ) -> Result<Vec<LedgerRow>, RepositoryError> {
        let mut query = ledger_dsl::ledger.into_boxed();

        query = query.filter(ledger_dsl::datetime.is_not_null());

        if let Some(f) = filter {
            let LedgerFilter { stock_line_id } = f;

            apply_equal_filter!(query, stock_line_id, ledger_dsl::stock_line_id);
        }

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
        assert!(matches!(
            repo.query(Pagination::all(), Some(filter), Some(sort)),
            Ok(_)
        ));
    }
}
