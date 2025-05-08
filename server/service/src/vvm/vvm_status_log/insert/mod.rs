use repository::{
    vvm_status::vvm_status_log_row::{VVMStatusLogRow, VVMStatusLogRowRepository},
    RepositoryError, TransactionError,
};

use crate::service_provider::ServiceContext;

mod generate;
use generate::{generate, GenerateInput};
mod validate;
use validate::validate;
mod test;

#[derive(PartialEq, Debug)]
pub enum InsertVVMStatusLogError {
    VVMStatusLogAlreadyExists,
    VVMStatusDoesNotExist,
    StockLineDoesNotExist,
    DatabaseError(RepositoryError),
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct InsertVVMStatusLogInput {
    pub id: String,
    pub status_id: String,
    pub stock_line_id: String,
    pub comment: Option<String>,
    pub invoice_line_id: Option<String>,
}

pub fn insert_vvm_status_log(
    ctx: &ServiceContext,
    store_id: &str,
    input: InsertVVMStatusLogInput,
) -> Result<VVMStatusLogRow, InsertVVMStatusLogError> {
    let vvm_status_log = ctx
        .connection
        .transaction_sync(|connection| {
            validate(&input, connection)?;
            let vvm_status_log = generate(GenerateInput {
                user_id: ctx.user_id.clone(),
                store_id: store_id.to_string(),
                insert_input: input,
            });

            VVMStatusLogRowRepository::new(connection).upsert_one(&vvm_status_log)?;

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
