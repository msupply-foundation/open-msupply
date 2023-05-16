use repository::{
    EqualFilter, Invoice, InvoiceFilter, InvoiceLineFilter, InvoiceLineRepository,
    InvoiceLineRowType, InvoiceRepository, InvoiceRowType, RepositoryError, StockLine,
    StockLineFilter, StockLineRepository,
};

use crate::service_provider::ServiceContext;

#[derive(Debug, PartialEq)]
pub struct Repack {
    pub invoice: Invoice,
    pub stock_from: StockLine,
    pub stock_to: StockLine,
}

pub fn get_repack(ctx: &ServiceContext, invoice_id: &str) -> Result<Repack, RepositoryError> {
    let connection = &ctx.connection;

    let invoice = InvoiceRepository::new(connection)
        .query_by_filter(
            InvoiceFilter::new()
                .id(EqualFilter::equal_to(invoice_id))
                .store_id(EqualFilter::equal_to(&ctx.store_id))
                .r#type(InvoiceRowType::Repack.equal_to()),
        )?
        .pop()
        .ok_or(RepositoryError::NotFound)?;

    let invoice_lines = InvoiceLineRepository::new(connection)
        .query_by_filter(InvoiceLineFilter::new().invoice_id(EqualFilter::equal_to(invoice_id)))?;

    let stock_from_id = invoice_lines
        .iter()
        .find_map(|line| {
            if line.invoice_line_row.r#type == InvoiceLineRowType::StockOut {
                line.stock_line_option
                    .as_ref()
                    .map(|stock_line| stock_line.id.clone())
            } else {
                None
            }
        })
        .ok_or(RepositoryError::NotFound)?;

    let stock_to_id = invoice_lines
        .iter()
        .find_map(|line| {
            if line.invoice_line_row.r#type == InvoiceLineRowType::StockIn {
                line.stock_line_option
                    .as_ref()
                    .map(|stock_line| stock_line.id.clone())
            } else {
                None
            }
        })
        .ok_or(RepositoryError::NotFound)?;

    let stock_from = StockLineRepository::new(connection)
        .query_by_filter(
            StockLineFilter::new().id(EqualFilter::equal_to(&stock_from_id)),
            Some(ctx.store_id.clone()),
        )?
        .pop()
        .ok_or(RepositoryError::NotFound)?;

    let stock_to = StockLineRepository::new(connection)
        .query_by_filter(
            StockLineFilter::new().id(EqualFilter::equal_to(&stock_to_id)),
            Some(ctx.store_id.clone()),
        )?
        .pop()
        .ok_or(RepositoryError::NotFound)?;

    Ok(Repack {
        invoice,
        stock_from,
        stock_to,
    })
}
