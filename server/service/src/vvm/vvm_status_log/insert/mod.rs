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
    DatabaseError(RepositoryError),
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct InsertVVMStatusLogInput {
    pub id: String,
    pub status_id: String,
    pub stock_line_id: String,
    pub comment: Option<String>,
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
            let vvm_status_log = generate(store_id, &ctx.user_id, input);
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
