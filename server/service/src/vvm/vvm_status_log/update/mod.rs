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
    UpdatedRecordNotFound,
    DatabaseError(RepositoryError),
}

#[derive(PartialEq, Debug, Clone, Default)]
pub struct UpdateVVMStatusLogInput {
    pub id: String,
    pub comment: Option<String>,
}

pub fn update_vvm_status_log(
    ctx: &ServiceContext,
    input: UpdateVVMStatusLogInput,
) -> Result<VVMStatusLogRow, UpdateVVMStatusLogError> {
    let vvm_status_log = ctx
        .connection
        .transaction_sync(|connection| {
            let vvm_status_log = validate(&input, connection)?;
            let updated_vvm_status_log = generate(vvm_status_log, input.comment);

            let vvm_status_log_repository = VVMStatusLogRowRepository::new(connection);
            vvm_status_log_repository.upsert_one(&updated_vvm_status_log)?;

            activity_log_entry(
                ctx,
                ActivityLogType::VVMStatusLogUpdated,
                Some(updated_vvm_status_log.id.clone()),
                None,
                None,
            )?;

            vvm_status_log_repository
                .find_one_by_id(&updated_vvm_status_log.id)?
                .ok_or(UpdateVVMStatusLogError::UpdatedRecordNotFound)
        })
        .map_err(|error: TransactionError<UpdateVVMStatusLogError>| error.to_inner_error())?;

    Ok(vvm_status_log)
}

impl From<RepositoryError> for UpdateVVMStatusLogError {
    fn from(error: RepositoryError) -> Self {
        UpdateVVMStatusLogError::DatabaseError(error)
    }
}
