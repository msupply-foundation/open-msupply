use crate::{
    database::{
        repository::RepositoryError,
        schema::{
            diesel_schema::{
                invoice::dsl as invoice_dsl, name_table::dsl as name_dsl, store::dsl as store_dsl,
            },
            InvoiceLineStatsRow, InvoiceRow, NameRow, StoreRow,
        },
    },
    server::service::graphql::schema::queries::pagination::{Pagination, PaginationOption},
};

use super::{get_connection, DBBackendConnection};

use diesel::{
    prelude::*,
    r2d2::{ConnectionManager, Pool},
};

pub struct InvoiceQueryRepository {
    pool: Pool<ConnectionManager<DBBackendConnection>>,
}

pub type InvoiceQueryJoin = (InvoiceRow, NameRow, StoreRow);

impl InvoiceQueryRepository {
    pub fn new(pool: Pool<ConnectionManager<DBBackendConnection>>) -> Self {
        InvoiceQueryRepository { pool }
    }

    /// Calculates invoice line stats for a given invoice
    pub async fn stats(
        &self,
        invoice_ids: &[String],
    ) -> Result<Vec<InvoiceLineStatsRow>, RepositoryError> {
        use crate::database::schema::diesel_schema::invoice_line_stats::dsl as invoice_line_stats_dsl;
        let connection = get_connection(&self.pool)?;

        Ok(invoice_line_stats_dsl::invoice_line_stats
            .filter(invoice_line_stats_dsl::invoice_id.eq_any(invoice_ids))
            .load::<InvoiceLineStatsRow>(&connection)?)
    }

    pub fn count(&self) -> Result<i64, RepositoryError> {
        let connection = get_connection(&self.pool)?;
        Ok(invoice_dsl::invoice.count().get_result(&*connection)?)
    }

    /// Gets all invoices
    pub fn all(
        &self,
        pagination: &Option<Pagination>,
    ) -> Result<Vec<InvoiceQueryJoin>, RepositoryError> {
        let connection = get_connection(&self.pool)?;

        Ok(invoice_dsl::invoice
            .inner_join(name_dsl::name_table)
            .inner_join(store_dsl::store)
            .order(invoice_dsl::id.asc())
            .offset(pagination.offset())
            .limit(pagination.first())
            .load::<InvoiceQueryJoin>(&*connection)?)
    }
}
