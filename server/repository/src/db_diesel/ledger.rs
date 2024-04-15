use crate::{diesel_macros::apply_equal_filter, EqualFilter, InvoiceRowType, RepositoryError};

use super::{ledger::ledger::dsl as ledger_dsl, StorageConnection};

use chrono::NaiveDateTime;
use diesel::prelude::*;

table! {
    #[sql_name = "stock_movement"]
    ledger (id) {
        id -> Text,
        stock_line_id -> Text,
        item_id -> Text,
        store_id -> Text,
        quantity -> BigInt,
        datetime -> Timestamp,
        invoice_type -> crate::db_diesel::invoice_row::InvoiceRowTypeMapping,
    }
}

#[derive(Clone, Queryable, Debug, PartialEq)]
pub struct LedgerRow {
    pub id: String,
    pub stock_line_id: String,
    pub item_id: String,
    pub store_id: String,
    pub quantity: i64,
    pub datetime: NaiveDateTime,
    pub invoice_type: InvoiceRowType,
}

#[derive(Clone, Default)]
pub struct LedgerFilter {
    pub stock_line_id: Option<EqualFilter<String>>,
}

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

    pub fn query(&self, filter: Option<LedgerFilter>) -> Result<Vec<LedgerRow>, RepositoryError> {
        let mut query = ledger_dsl::ledger.into_boxed();

        query = query.filter(ledger_dsl::datetime.is_not_null());

        if let Some(f) = filter {
            let LedgerFilter { stock_line_id } = f;

            apply_equal_filter!(query, stock_line_id, ledger_dsl::stock_line_id);
        }

        // SORT HERE

        let final_query = query;

        // Debug diesel query
        // println!(
        //     "{}",
        //     diesel::debug_query::<crate::DBType, _>(&final_query).to_string()
        // );

        let result = final_query.load::<LedgerRow>(&self.connection.connection)?;

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
        // Check deserialization (into rust types)
        assert!(matches!(repo.query(Some(filter)), Ok(_)));
    }
}
