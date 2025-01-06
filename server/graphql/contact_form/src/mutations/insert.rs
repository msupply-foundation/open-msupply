use async_graphql::*;
use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use repository::contact_form_row::ContactFormRow;
use repository::contact_form_row::ContactType;
use serde::Serialize;
use service::{
    auth::{Resource, ResourceAccessRequest},
    contact_form::{InsertContactForm as ServiceInput, InsertContactFormError as ServiceError},
};

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")] // only needed to be comparable in tests
pub enum ContactFormNodeType {
    Feedback,
    Support,
}

impl ContactFormNodeType {
    pub fn from_domain(domain_type: &ContactType) -> Self {
        match domain_type {
            ContactType::Feedback => ContactFormNodeType::Feedback,
            ContactType::Support => ContactFormNodeType::Support,
        }
    }

    pub fn to_domain(self) -> ContactType {
        match self {
            ContactFormNodeType::Feedback => ContactType::Feedback,
            ContactFormNodeType::Support => ContactType::Support,
        }
    }
}

#[derive(InputObject)]
pub struct InsertContactFormInput {
    pub id: String,
    pub contact_type: ContactFormNodeType,
    pub reply_email: String,
    pub body: String,
}

pub struct InsertResponse {
    pub id: String,
}

#[Object]
impl InsertResponse {
    pub async fn id(&self) -> &str {
        &self.id
    }
}

#[derive(Union)]
#[graphql(name = "InsertContactFormResponse")]
pub enum InsertContactFormResponse {
    Response(InsertResponse),
}

pub fn insert_contact_form(
    ctx: &Context<'_>,
    store_id: &str,
    input: InsertContactFormInput,
) -> Result<InsertContactFormResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateContactForm,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    map_response(service_provider.contact_form_service.insert_contact_form(
        &service_context,
        &store_id,
        input.to_domain(),
    ))
}

pub fn map_response(
    from: Result<ContactFormRow, ServiceError>,
) -> Result<InsertContactFormResponse> {
    match from {
        Ok(contact_form) => Ok(InsertContactFormResponse::Response(InsertResponse {
            id: contact_form.id,
        })),
        Err(error) => map_error(error),
    }
}

impl InsertContactFormInput {
    pub fn to_domain(self) -> ServiceInput {
        let InsertContactFormInput {
            id,
            contact_type,
            reply_email,
            body,
        } = self;

        ServiceInput {
            id,
            contact_type: contact_type.to_domain(),
            reply_email,
            body,
        }
    }
}

fn map_error(error: ServiceError) -> Result<InsertContactFormResponse> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        ServiceError::MessageNotProvided
        | ServiceError::ContactFormAlreadyExists
        | ServiceError::EmailNotProvided
        | ServiceError::EmailIsInvalid => BadUserInput(formatted_error),

        ServiceError::DatabaseError(_) | ServiceError::InternalError(_) => {
            InternalError(formatted_error)
        }
    };

    Err(graphql_error.extend())
}
