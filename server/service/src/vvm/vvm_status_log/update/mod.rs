use repository::{
    vvm_status::vvm_status_log_row::{VVMStatusLogRow, VVMStatusLogRowRepository},
    ActivityLogType, RepositoryError, TransactionError,
};

use crate::{activity_log::activity_log_entry, service_provider::ServiceContext};

mod generate;
use generate::generate;
mod validate;
use validate::validate;
mod test;

#[derive(PartialEq, Debug)]
pub enum UpdateVVMStatusLogError {
    VVMStatusLogDoesNotExist,
    VVMStatusDoesNotExist,
    UpdatedRecordNotFound,
    DatabaseError(RepositoryError),
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct UpdateVVMStatusLogInput {
    pub id: String,
    pub status_id: Option<String>,
    pub comment: Option<String>,
}

pub fn update_vvm_status_log(
    ctx: &ServiceContext,
    store_id: &str,
    input: UpdateVVMStatusLogInput,
) -> Result<VVMStatusLogRow, UpdateVVMStatusLogError> {
    let vvm_status_log = ctx
        .connection
        .transaction_sync(|connection| {
            let vvm_status_log = validate(&input, connection)?;
            let new_vvm_status_log = generate(store_id, &ctx.user_id, vvm_status_log, input);

            let vvm_status_log_repository = VVMStatusLogRowRepository::new(connection);

            vvm_status_log_repository.upsert_one(&new_vvm_status_log)?;

            activity_log_entry(
                ctx,
                ActivityLogType::VVMStatusLogUpdated,
                Some(new_vvm_status_log.id.clone()),
                None,
                None,
            )?;

            match vvm_status_log_repository.find_one_by_id(&new_vvm_status_log.id)? {
                Some(vvm_status_log) => Ok(vvm_status_log),
                None => Err(UpdateVVMStatusLogError::UpdatedRecordNotFound),
            }
        })
        .map_err(|error: TransactionError<UpdateVVMStatusLogError>| error.to_inner_error())?;

    Ok(vvm_status_log)
}

impl From<RepositoryError> for UpdateVVMStatusLogError {
    fn from(error: RepositoryError) -> Self {
        UpdateVVMStatusLogError::DatabaseError(error)
    }
}
