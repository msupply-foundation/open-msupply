use async_graphql::*;
use graphql_core::{
    standard_graphql_error::validate_auth,
    standard_graphql_error::StandardGraphqlError::{BadUserInput, InternalError},
    ContextExt,
};
use graphql_types::types::IdResponse;
use repository::{SyncMessageRow, SyncMessageRowType};
use service::auth::{Resource, ResourceAccessRequest};
use service::sync_message::insert::{
    InsertSyncMessageError as ServiceError, InsertSyncMessageInput as ServiceInput,
};

#[derive(Enum, Copy, Clone, Eq, PartialEq)]
#[graphql(name = "SyncMessageRowTypeInput")]
pub enum SyncMessageRowTypeInput {
    // RequestFieldChange, Not supported yet
    SupportUpload,
    // Other, Not supported yet
}

impl From<SyncMessageRowTypeInput> for SyncMessageRowType {
    fn from(input: SyncMessageRowTypeInput) -> Self {
        match input {
            SyncMessageRowTypeInput::SupportUpload => SyncMessageRowType::SupportUpload,
        }
    }
}

#[derive(InputObject)]
#[graphql(name = "InsertSyncMessageInput")]
pub struct InsertInput {
    pub id: String,
    pub to_store_id: Option<String>,
    pub body: Option<String>,
    pub r#type: SyncMessageRowTypeInput,
}

impl InsertInput {
    pub fn to_domain(self) -> ServiceInput {
        let InsertInput {
            id,
            to_store_id,
            body,
            r#type,
        } = self;

        ServiceInput {
            id,
            to_store_id,
            body,
            r#type: r#type.into(),
        }
    }
}

#[derive(Union)]
#[graphql(name = "InsertSyncMessageResponse")]
pub enum InsertResponse {
    Response(IdResponse),
}

pub fn insert_sync_message(
    ctx: &Context<'_>,
    store_id: &str,
    input: InsertInput,
) -> Result<InsertResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::ServerAdmin,
            store_id: Some(store_id.to_string()),
        },
    )?;
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    map_response(
        service_provider
            .sync_message_service
            .insert_sync_message(&service_context, input.to_domain()),
    )
}

fn map_response(from: Result<SyncMessageRow, ServiceError>) -> Result<InsertResponse> {
    match from {
        Ok(sync_message) => Ok(InsertResponse::Response(IdResponse(sync_message.id))),
        Err(error) => map_error(error),
    }
}

fn map_error(error: ServiceError) -> Result<InsertResponse> {
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        ServiceError::SyncMessageAlreadyExists | ServiceError::ToStoreDoesNotExist => {
            BadUserInput(formatted_error)
        }
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
