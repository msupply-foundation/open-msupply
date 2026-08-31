use async_graphql::*;
use graphql_core::standard_graphql_error::validate_auth;
use graphql_core::ContextExt;
use service::auth::{Resource, ResourceAccessRequest};
use service::prescription_request::batch::{
    BatchPrescriptionRequest as ServiceInput, BatchPrescriptionRequestResult as ServiceResult,
};

use super::delete::{map_delete_response, DeleteResponse};
use super::line::{map_delete_line_response, DeleteLineResponse};

#[derive(SimpleObject)]
#[graphql(concrete(
    name = "DeletePrescriptionRequestResponseWithId",
    params(DeleteResponse)
))]
#[graphql(concrete(
    name = "DeletePrescriptionRequestLineResponseWithId",
    params(DeleteLineResponse)
))]
pub struct MutationWithId<T: OutputType> {
    pub id: String,
    pub response: T,
}

#[derive(InputObject)]
#[graphql(name = "BatchPrescriptionRequestInput")]
pub struct BatchInput {
    pub delete_prescription_requests: Option<Vec<String>>,
    pub delete_prescription_request_lines: Option<Vec<String>>,
    pub continue_on_error: Option<bool>,
}

impl BatchInput {
    fn to_domain(self) -> ServiceInput {
        let BatchInput {
            delete_prescription_requests,
            delete_prescription_request_lines,
            continue_on_error,
        } = self;
        ServiceInput {
            delete: delete_prescription_requests,
            delete_lines: delete_prescription_request_lines,
            continue_on_error,
        }
    }
}

#[derive(SimpleObject)]
#[graphql(name = "BatchPrescriptionRequestResponse")]
pub struct BatchResponse {
    delete_prescription_requests: Option<Vec<MutationWithId<DeleteResponse>>>,
    delete_prescription_request_lines: Option<Vec<MutationWithId<DeleteLineResponse>>>,
}

/// The list's mass delete. One refusal fails the whole call and nothing is
/// removed, so a selection is never partly deleted (unless the caller opts into
/// `continue_on_error`).
pub fn batch_prescription_request(
    ctx: &Context<'_>,
    store_id: &str,
    input: BatchInput,
) -> Result<BatchResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutatePrescription,
            store_id: Some(store_id.to_string()),
            require_central_standalone: false,
        },
    )?;
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    let response = service_provider
        .prescription_request_service
        .batch_prescription_request(&service_context, store_id, input.to_domain())?;

    map_response(response)
}

fn map_response(
    ServiceResult {
        delete,
        delete_lines,
    }: ServiceResult,
) -> Result<BatchResponse> {
    // A refusal anywhere in the batch has already rolled the transaction back,
    // and surfaces as the request's own error rather than a per-id result — the
    // whole call failed, and saying so once is truer than reporting an outcome
    // per id when every one of them is "not deleted".
    let mut delete_result = Vec::new();
    for request in delete {
        delete_result.push(MutationWithId {
            id: request.input.clone(),
            response: map_delete_response(request.result)?,
        });
    }

    let mut delete_line_result = Vec::new();
    for line in delete_lines {
        delete_line_result.push(MutationWithId {
            id: line.input.clone(),
            response: map_delete_line_response(line.result)?,
        });
    }

    Ok(BatchResponse {
        delete_prescription_requests: vec_or_none(delete_result),
        delete_prescription_request_lines: vec_or_none(delete_line_result),
    })
}

fn vec_or_none<T>(vec: Vec<T>) -> Option<Vec<T>> {
    if vec.is_empty() {
        None
    } else {
        Some(vec)
    }
}
