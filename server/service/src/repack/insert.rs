use repository::{
    InvoiceLineRowRepository, InvoiceRow, InvoiceRowRepository, LocationMovementRowRepository,
    RepositoryError, StockLineRow, StockLineRowRepository,
};

use crate::service_provider::ServiceContext;

use super::{
    generate::{generate, GenerateRepack},
    validate,
};

#[derive(Default)]
pub struct InsertRepack {
    pub stock_line_id: String,
    pub number_of_packs: f64,
    pub new_pack_size: i32,
    pub new_location_id: Option<String>,
}

#[derive(Debug, PartialEq)]
pub enum InsertRepackError {
    StockLineDoesNotExist,
    NotThisStoreStockLine,
    CannotHaveFractionalRepack,
    NewlyCreatedInvoiceDoesNotExist,
    StockReducedBelowZero(StockLineRow),
    DatabaseError(RepositoryError),
    InternalError(String),
}

pub fn insert_repack(
    ctx: &ServiceContext,
    input: InsertRepack,
) -> Result<InvoiceRow, InsertRepackError> {
    let result = ctx
        .connection
        .transaction_sync(|connection| {
            let stock_line = validate(connection, &ctx.store_id, &input)?;
            let GenerateRepack {
                repack_invoice,
                repack_invoice_lines,
                stock_lines,
                location_movement,
            } = generate(ctx, stock_line, input)?;

            let stock_line_repo = StockLineRowRepository::new(connection);

            for line in stock_lines {
                stock_line_repo.upsert_one(&line)?;
            }

            let invoice_repo = InvoiceRowRepository::new(connection);
            invoice_repo.upsert_one(&repack_invoice)?;

            let invoice_line_repo = InvoiceLineRowRepository::new(connection);
            for line in repack_invoice_lines {
                invoice_line_repo.upsert_one(&line)?;
            }

            if let Some(movements) = location_movement {
                let location_movement_repo = LocationMovementRowRepository::new(connection);
                for movement in movements {
                    location_movement_repo.upsert_one(&movement)?;
                }
            }

            invoice_repo
                .find_one_by_id_option(&repack_invoice.id)?
                .ok_or(InsertRepackError::NewlyCreatedInvoiceDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(result)
}

impl From<RepositoryError> for InsertRepackError {
    fn from(error: RepositoryError) -> Self {
        InsertRepackError::DatabaseError(error)
    }
}
