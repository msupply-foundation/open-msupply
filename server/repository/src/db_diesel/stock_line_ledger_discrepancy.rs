use super::StorageConnection;

use crate::diesel_macros::apply_equal_filter;
use crate::{EqualFilter, RepositoryError, StockLineFilter};

use crate::{db_diesel::stock_line_row::stock_line, DBType, StockLineRepository};

use diesel::dsl::IntoBoxed;
use diesel::prelude::*;

table! {
    stock_line_ledger_discrepancy (stock_line_id) {
        stock_line_id -> Text,
    }
}

joinable!(stock_line_ledger_discrepancy -> stock_line (stock_line_id));
allow_tables_to_appear_in_same_query!(stock_line, stock_line_ledger_discrepancy);
#[derive(Clone, Queryable, Debug, PartialEq)]
#[diesel(table_name = stock_line_ledger_discrepancy)]
pub struct StockLineLedgerDiscrepancy {
    pub id: String,
}

pub struct StockLineLedgerDiscrepancyRepository<'a> {
    connection: &'a StorageConnection,
}

pub struct StockLineLedgerDiscrepancyFilter {
    pub stock_line: Option<StockLineFilter>,
    pub stock_line_id: Option<EqualFilter<String>>,
}

impl<'a> StockLineLedgerDiscrepancyRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        StockLineLedgerDiscrepancyRepository { connection }
    }

    pub fn query(
        &self,
        filter: Option<StockLineLedgerDiscrepancyFilter>,
    ) -> Result<Vec<StockLineLedgerDiscrepancy>, RepositoryError> {
        let query = create_filtered_query(filter);

        // Debug diesel query
        // println!("{}", diesel::debug_query::<DBType, _>(&query).to_string());

        let result =
            query.load::<StockLineLedgerDiscrepancy>(self.connection.lock().connection())?;

        Ok(result)
    }
}

fn create_filtered_query(
    filter: Option<StockLineLedgerDiscrepancyFilter>,
) -> IntoBoxed<'static, stock_line_ledger_discrepancy::table, DBType> {
    let mut query = stock_line_ledger_discrepancy::table.into_boxed();

    let Some(StockLineLedgerDiscrepancyFilter {
        stock_line,
        stock_line_id,
    }) = filter
    else {
        return query;
    };

    apply_equal_filter!(
        query,
        stock_line_id,
        stock_line_ledger_discrepancy::stock_line_id
    );

    if let Some(stock_line_filter) = stock_line {
        let stock_line_ids =
            StockLineRepository::create_filtered_query(Some(stock_line_filter), None)
                .select(stock_line::id);

        query = query.filter(stock_line_ledger_discrepancy::stock_line_id.eq_any(stock_line_ids));
    };

    query
}
