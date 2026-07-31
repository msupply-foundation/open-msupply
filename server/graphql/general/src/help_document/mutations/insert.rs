use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{DatabaseError, InternalError, RecordAlreadyExist},
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::HelpDocumentNode;
use repository::HelpDocument;
use service::{
    auth::{Resource, ResourceAccessRequest},
    help_document::{InsertHelpDocument, InsertHelpDocumentError as ServiceError},
};

#[derive(InputObject)]
pub struct InsertHelpDocumentInput {
    pub id: String,
    pub title: String,
}

#[derive(SimpleObject)]
pub struct InsertHelpDocumentError {
    pub error: InsertHelpDocumentErrorInterface,
}

#[derive(Union)]
pub enum InsertHelpDocumentResponse {
    Error(InsertHelpDocumentError),
    Response(HelpDocumentNode),
}

#[derive(Interface)]
#[graphql(field(name = "description", ty = "String"))]
pub enum InsertHelpDocumentErrorInterface {
    HelpDocumentAlreadyExists(RecordAlreadyExist),
    InternalError(InternalError),
    DatabaseError(DatabaseError),
}

pub fn insert_help_document(
    ctx: &Context<'_>,
    input: InsertHelpDocumentInput,
) -> Result<InsertHelpDocumentResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateHelpDocuments,
            store_id: None,
            require_central_standalone: false,
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    let result = service_provider
        .help_document_service
        .insert_help_document(&service_context, input.to_domain());

    map_response(result)
}

impl InsertHelpDocumentInput {
    pub fn to_domain(self) -> InsertHelpDocument {
        InsertHelpDocument {
            id: self.id,
            title: self.title,
        }
    }
}

fn map_response(
    from: Result<HelpDocument, ServiceError>,
) -> Result<InsertHelpDocumentResponse> {
    let result = match from {
        Ok(help_document) => {
            InsertHelpDocumentResponse::Response(HelpDocumentNode::from_domain(help_document))
        }
        Err(error) => InsertHelpDocumentResponse::Error(InsertHelpDocumentError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

fn map_error(error: ServiceError) -> Result<InsertHelpDocumentErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{error:#?}");

    let graphql_error = match error {
        ServiceError::HelpDocumentAlreadyExists => {
            return Ok(InsertHelpDocumentErrorInterface::HelpDocumentAlreadyExists(
                RecordAlreadyExist,
            ))
        }
        ServiceError::EmptyTitle => BadUserInput(formatted_error),
        ServiceError::CreatedRecordNotFound => InternalError(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
