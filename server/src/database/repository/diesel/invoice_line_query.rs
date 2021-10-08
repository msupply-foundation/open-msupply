use crate::{
    database::{
        repository::RepositoryError,
        schema::{
            diesel_schema::{
                invoice_line::dsl as invoice_line_dsl, stock_line::dsl as stock_line_dsl,
            },
            InvoiceLineRow, StockLineRow,
        },
    },
    domain::invoice_line::{InvoiceLine, StockLine},
};

use super::StorageConnection;

use diesel::{dsl, prelude::*, sql_types::Double};

pub type InvoiceLineQueryJoin = (InvoiceLineRow, StockLineRow);

#[derive(Clone)]
pub struct InvoiceLineStats {
    pub invoice_id: String,
    pub total_after_tax: f64,
}

impl From<InvoiceLineQueryJoin> for InvoiceLine {
    fn from((invoice_line, stock_line): InvoiceLineQueryJoin) -> Self {
        InvoiceLine {
            id: invoice_line.id,
            invoice_id: invoice_line.invoice_id,
            item_id: invoice_line.item_id,
            item_name: invoice_line.item_name,
            item_code: invoice_line.item_code,
            pack_size: invoice_line.pack_size,
            number_of_packs: invoice_line.number_of_packs,
            cost_price_per_pack: invoice_line.cost_price_per_pack,
            sell_price_per_pack: invoice_line.sell_price_per_pack,
            batch: invoice_line.batch,
            expiry_date: invoice_line.expiry_date,
            // TODO resolve stock_line on demand:
            stock_line: StockLine {
                available_number_of_packs: stock_line.available_number_of_packs,
            },
        }
    }
}

pub struct InvoiceLineQueryRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> InvoiceLineQueryRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        InvoiceLineQueryRepository { connection }
    }

    /// Returns all invoice lines for the provided invoice ids.
    pub fn find_many_by_invoice_ids(
        &self,
        invoice_ids: &[String],
    ) -> Result<Vec<InvoiceLine>, RepositoryError> {
        Ok(invoice_line_dsl::invoice_line
            .filter(invoice_line_dsl::invoice_id.eq_any(invoice_ids))
            .inner_join(stock_line_dsl::stock_line)
            .load::<InvoiceLineQueryJoin>(&self.connection.connection)?
            .into_iter()
            .map(InvoiceLine::from)
            .collect())
    }

    /// Calculates invoice line stats for a given invoice ids
    pub fn stats(&self, invoice_ids: &[String]) -> Result<Vec<InvoiceLineStats>, RepositoryError> {
        let results = invoice_line_dsl::invoice_line
            .select((
                invoice_line_dsl::invoice_id,
                dsl::sql::<Double>("sum(total_after_tax) as total_after_tax"),
            ))
            .group_by(invoice_line_dsl::invoice_id)
            .filter(invoice_line_dsl::invoice_id.eq_any(invoice_ids))
            .load(&self.connection.connection)?;

        Ok(results
            .iter()
            .map(|v: &(String, f64)| InvoiceLineStats {
                invoice_id: v.0.to_string(),
                total_after_tax: v.1,
            })
            .collect())
    }
}
