use repository::RepositoryError;

use crate::{
    service_provider::ServiceContext, BatchMutationsProcessor, InputWithResult, WithDBError,
};

use super::delete::{delete_prescription_request, DeletePrescriptionRequestError};

/// A mass delete from the request list. Deletes only — a request is created and
/// edited one at a time, and only the list selects several at once.
#[derive(Clone, Debug, Default)]
pub struct BatchPrescriptionRequest {
    pub delete: Option<Vec<String>>,
    pub continue_on_error: Option<bool>,
}

pub type DeletePrescriptionRequestsResult =
    Vec<InputWithResult<String, Result<String, DeletePrescriptionRequestError>>>;

#[derive(Debug, Default)]
pub struct BatchPrescriptionRequestResult {
    pub delete: DeletePrescriptionRequestsResult,
}

/// All or nothing unless `continue_on_error`: one refusal rolls the transaction
/// back, so a selection holding a request that has already been handed over
/// leaves every other request in it untouched, and the list the user is looking
/// at stays true.
pub fn batch_prescription_request(
    ctx: &ServiceContext,
    store_id: &str,
    input: BatchPrescriptionRequest,
) -> Result<BatchPrescriptionRequestResult, RepositoryError> {
    let result = ctx
        .connection
        .transaction_sync(|_| {
            let continue_on_error = input.continue_on_error.unwrap_or(false);
            let mut results = BatchPrescriptionRequestResult::default();

            let processor = BatchMutationsProcessor::new(ctx);

            let (has_errors, result) = processor.do_mutations(input.delete, |ctx, id| {
                delete_prescription_request(ctx, store_id, id)
            });
            results.delete = result;
            if has_errors && !continue_on_error {
                return Err(WithDBError::err(results));
            }

            Ok(results)
                as Result<
                    BatchPrescriptionRequestResult,
                    WithDBError<BatchPrescriptionRequestResult>,
                >
        })
        .map_err(|error| error.to_inner_error())
        .or_else(|error| match error {
            WithDBError::DatabaseError(repository_error) => Err(repository_error),
            WithDBError::Error(batch_response) => Ok(batch_response),
        })?;

    Ok(result)
}
