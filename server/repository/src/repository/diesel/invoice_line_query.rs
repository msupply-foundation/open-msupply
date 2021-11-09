use crate::{
    repository::RepositoryError,
    schema::{
        diesel_schema::{invoice_line, invoice_line::dsl as invoice_line_dsl},
        InvoiceLineRow,
    },
};
use domain::{
    invoice_line::{InvoiceLine, InvoiceLineFilter, InvoiceLineSort},
    Pagination,
};

use super::{DBType, StorageConnection};

use diesel::{dsl, prelude::*, sql_types::Double};

#[derive(Clone)]
pub struct InvoiceLineStats {
    pub invoice_id: String,
    pub total_after_tax: f64,
}

impl From<InvoiceLineRow> for InvoiceLine {
    fn from(invoice_line: InvoiceLineRow) -> Self {
        InvoiceLine {
            id: invoice_line.id,
            stock_line_id: invoice_line.stock_line_id,
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
            note: invoice_line.note,
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

    pub fn count(&self, filter: Option<InvoiceLineFilter>) -> Result<i64, RepositoryError> {
        // TODO (beyond M1), check that store_id matches current store
        let query = create_filtered_query(filter);

        Ok(query.count().get_result(&self.connection.connection)?)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<InvoiceLineFilter>,
        _: Option<InvoiceLineSort>,
    ) -> Result<Vec<InvoiceLine>, RepositoryError> {
        // TODO (beyond M1), check that store_id matches current store
        let query = create_filtered_query(filter);

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<InvoiceLineRow>(&self.connection.connection)?;

        Ok(result.into_iter().map(InvoiceLine::from).collect())
    }

    /// Returns all invoice lines for the provided invoice ids.
    pub fn find_many_by_invoice_ids(
        &self,
        invoice_ids: &[String],
    ) -> Result<Vec<InvoiceLine>, RepositoryError> {
        Ok(invoice_line_dsl::invoice_line
            .filter(invoice_line_dsl::invoice_id.eq_any(invoice_ids))
            .load::<InvoiceLineRow>(&self.connection.connection)?
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

type BoxedInvoiceLineQuery = invoice_line::BoxedQuery<'static, DBType>;

fn create_filtered_query(filter: Option<InvoiceLineFilter>) -> BoxedInvoiceLineQuery {
    let mut query = invoice_line::table.into_boxed();

    if let Some(f) = filter {
        if let Some(value) = f.id {
            if let Some(eq) = value.equal_to {
                query = query.filter(invoice_line_dsl::id.eq(eq));
            }
        }

        if let Some(invoice_id) = f.invoice_id {
            if let Some(eq) = invoice_id.equal_to {
                query = query.filter(invoice_line_dsl::invoice_id.eq(eq));
            }
        }
    }

    query
}
