use repository::{
    vvm_status::vvm_status_log_row::{VVMStatusLogRow, VVMStatusLogRowRepository},
    RepositoryError, TransactionError,
};

use crate::service_provider::ServiceContext;

mod generate;
use generate::generate;
mod validate;
use validate::validate;
mod test;

#[derive(PartialEq, Debug)]
pub enum InsertVVMStatusLogError {
    VVMStatusLogAlreadyExists,
    VVMStatusDoesNotExist,
    StockLineDoesNotExist,
    InvoiceLineDoesNotExist,
    DatabaseError(RepositoryError),
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct InsertVVMStatusLogInput {
    pub id: String,
    pub status_id: String,
    pub stock_line_id: String,
    pub comment: Option<String>,
    pub invoice_line_id: String,
}

pub fn insert_vvm_status_log(
    ctx: &ServiceContext,
    input: InsertVVMStatusLogInput,
) -> Result<VVMStatusLogRow, InsertVVMStatusLogError> {
    let vvm_status_log = ctx
        .connection
        .transaction_sync(|connection| {
            validate(&input, connection)?;
            let vvm_status_log = generate(ctx, input);

            let repository = VVMStatusLogRowRepository::new(connection);

            repository.upsert_one(&vvm_status_log)?;

            Ok(vvm_status_log)
        })
        .map_err(|error: TransactionError<InsertVVMStatusLogError>| error.to_inner_error())?;

    Ok(vvm_status_log)
}

impl From<RepositoryError> for InsertVVMStatusLogError {
    fn from(error: RepositoryError) -> Self {
        InsertVVMStatusLogError::DatabaseError(error)
    }
}
