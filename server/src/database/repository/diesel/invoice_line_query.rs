use crate::database::{
    repository::RepositoryError,
    schema::{
        diesel_schema::{
            invoice_line::dsl as invoice_line_dsl, item::dsl as item_dsl,
            stock_line::dsl as stock_line_dsl,
        },
        InvoiceLineRow, ItemRow, StockLineRow,
    },
};

use super::{get_connection, DBBackendConnection};

use diesel::{
    dsl,
    prelude::*,
    r2d2::{ConnectionManager, Pool},
    sql_types::Double,
};

pub type InvoiceLineQueryJoin = (InvoiceLineRow, ItemRow, StockLineRow);

#[derive(Clone)]
pub struct InvoiceLineStats {
    pub invoice_id: String,
    pub total_after_tax: f64,
}

pub struct InvoiceLineQueryRepository {
    pool: Pool<ConnectionManager<DBBackendConnection>>,
}

impl InvoiceLineQueryRepository {
    pub fn new(pool: Pool<ConnectionManager<DBBackendConnection>>) -> Self {
        InvoiceLineQueryRepository { pool }
    }

    pub async fn find_many_by_invoice_id(
        &self,
        invoice_id: &str,
    ) -> Result<Vec<InvoiceLineQueryJoin>, RepositoryError> {
        let connection = get_connection(&self.pool)?;
        Ok(invoice_line_dsl::invoice_line
            .filter(invoice_line_dsl::invoice_id.eq(invoice_id))
            .inner_join(item_dsl::item)
            .inner_join(stock_line_dsl::stock_line)
            .load::<InvoiceLineQueryJoin>(&*connection)?)
    }

    /// Calculates invoice line stats for a given invoice ids
    pub async fn stats(
        &self,
        invoice_ids: &[String],
    ) -> Result<Vec<InvoiceLineStats>, RepositoryError> {
        let connection = get_connection(&self.pool)?;
        let results = invoice_line_dsl::invoice_line
            .select((
                invoice_line_dsl::invoice_id,
                dsl::sql::<Double>("sum(total_after_tax) as total_after_tax"),
            ))
            .group_by(invoice_line_dsl::invoice_id)
            .filter(invoice_line_dsl::invoice_id.eq_any(invoice_ids))
            .load(&connection)?;

        Ok(results
            .iter()
            .map(|v: &(String, f64)| InvoiceLineStats {
                invoice_id: v.0.to_string(),
                total_after_tax: v.1,
            })
            .collect())
    }
}
