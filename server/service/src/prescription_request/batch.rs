use repository::RepositoryError;

use crate::{
    service_provider::ServiceContext, BatchMutationsProcessor, InputWithResult, WithDBError,
};

use super::delete::{delete_prescription_request, DeletePrescriptionRequestError};
use crate::prescription_request_line::delete::{
    delete_prescription_request_line, DeletePrescriptionRequestLineError,
};

/// The two mass deletes this vertical has: requests from the list, and lines
/// from the detail's line table. Deletes only — both are created and edited one
/// at a time, and only a selection acts on several at once.
#[derive(Clone, Debug, Default)]
pub struct BatchPrescriptionRequest {
    pub delete: Option<Vec<String>>,
    pub delete_lines: Option<Vec<String>>,
    pub continue_on_error: Option<bool>,
}

pub type DeletePrescriptionRequestsResult =
    Vec<InputWithResult<String, Result<String, DeletePrescriptionRequestError>>>;
pub type DeletePrescriptionRequestLinesResult =
    Vec<InputWithResult<String, Result<String, DeletePrescriptionRequestLineError>>>;

#[derive(Debug, Default)]
pub struct BatchPrescriptionRequestResult {
    pub delete: DeletePrescriptionRequestsResult,
    pub delete_lines: DeletePrescriptionRequestLinesResult,
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

            // Lines first: deleting a request takes its lines with it, so a
            // batch naming both would otherwise have the line delete fail on a
            // row its own batch had already removed.
            let (has_errors, result) = processor.do_mutations(input.delete_lines, |ctx, id| {
                delete_prescription_request_line(ctx, store_id, id)
            });
            results.delete_lines = result;
            if has_errors && !continue_on_error {
                return Err(WithDBError::err(results));
            }

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
