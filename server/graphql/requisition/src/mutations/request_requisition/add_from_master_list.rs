use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{RecordDoesNotExist, CannotEditRequisition}, standard_graphql_error::validate_auth,
    standard_graphql_error::StandardGraphqlError, ContextExt,
};
use graphql_types::types::RequisitionLineConnector;
use service::{
    permission_validation::{Resource, ResourceAccessRequest},
    requisition::request_requisition::{
        AddFromMasterList as ServiceInput, AddFromMasterListError as ServiceError,
    },
};

#[derive(InputObject)]
pub struct AddFromMasterListInput {
    pub request_requisition_id: String,
    pub master_list_id: String,
}

#[derive(Interface)]
#[graphql(name = "AddFromMasterListErrorInterface")]
#[graphql(field(name = "description", type = "String"))]
pub enum DeleteErrorInterface {
    RecordDoesNotExist(RecordDoesNotExist),
    MasterListNotFoundForThisStore(MasterListNotFoundForThisStore),
    CannotEditRequisition(CannotEditRequisition),
}

#[derive(SimpleObject)]
#[graphql(name = "AddFromMasterListError")]
pub struct DeleteError {
    pub error: DeleteErrorInterface,
}

#[derive(Union)]
#[graphql(name = "AddFromMasterListResponse")]
pub enum AddFromMasterListResponse {
    Error(DeleteError),
    Response(RequisitionLineConnector),
}

pub fn add_from_master_list(
    ctx: &Context<'_>,
    store_id: &str,
    input: AddFromMasterListInput,
) -> Result<AddFromMasterListResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::EditRequisition,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context()?;

    let response = match service_provider.requisition_service.add_from_master_list(
        &service_context,
        store_id,
        input.to_domain(),
    ) {
        Ok(requisition_lines) => AddFromMasterListResponse::Response(
            RequisitionLineConnector::from_vec(requisition_lines),
        ),
        Err(error) => AddFromMasterListResponse::Error(DeleteError {
            error: map_error(error)?,
        }),
    };

    Ok(response)
}

impl AddFromMasterListInput {
    fn to_domain(self) -> ServiceInput {
        let AddFromMasterListInput {
            request_requisition_id,
            master_list_id,
        } = self;
        ServiceInput {
            request_requisition_id,
            master_list_id,
        }
    }
}

fn map_error(error: ServiceError) -> Result<DeleteErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::RequisitionDoesNotExist => {
            return Ok(DeleteErrorInterface::RecordDoesNotExist(
                RecordDoesNotExist {},
            ))
        }
        ServiceError::CannotEditRequisition => {
            return Ok(DeleteErrorInterface::CannotEditRequisition(
                CannotEditRequisition {},
            ))
        }
        ServiceError::MasterListNotFoundForThisStore => {
            return Ok(DeleteErrorInterface::MasterListNotFoundForThisStore(
                MasterListNotFoundForThisStore {},
            ))
        }
        // Standard Graphql Errors
        ServiceError::NotThisStoreRequisition => BadUserInput(formatted_error),
        ServiceError::NotARequestRequisition => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

pub struct MasterListNotFoundForThisStore;
#[Object]
impl MasterListNotFoundForThisStore {
    pub async fn description(&self) -> &'static str {
        "Master list for this store is not found (might not be visible in this store)"
    }
}
