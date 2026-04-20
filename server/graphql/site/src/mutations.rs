use crate::queries::SiteNode;
use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    site::upsert::{UpsertSite, UpsertSiteError as ServiceError},
};

#[derive(InputObject)]
pub struct UpsertSiteInput {
    pub id: i32,
    pub code: Option<String>,
    pub name: String,
    pub password: Option<String>,
    pub clear_hardware_id: Option<bool>,
}

pub struct CodeMustBeProvided;
#[Object]
impl CodeMustBeProvided {
    pub async fn description(&self) -> &str {
        "Code must be provided"
    }
}

pub struct NameNotProvided;
#[Object]
impl NameNotProvided {
    pub async fn description(&self) -> &str {
        "Name must be provided"
    }
}

pub struct PasswordRequired;
#[Object]
impl PasswordRequired {
    pub async fn description(&self) -> &str {
        "Password is required"
    }
}

#[derive(Interface)]
#[graphql(field(name = "description", ty = "String"))]
pub enum UpsertSiteErrorInterface {
    CodeMustBeProvided(CodeMustBeProvided),
    NameNotProvided(NameNotProvided),
    PasswordRequired(PasswordRequired),
}

#[derive(SimpleObject)]
pub struct UpsertSiteError {
    pub error: UpsertSiteErrorInterface,
}

#[derive(Union)]
pub enum UpsertSiteResponse {
    Error(UpsertSiteError),
    Response(SiteNode),
}

pub fn upsert_site(ctx: &Context<'_>, input: UpsertSiteInput) -> Result<UpsertSiteResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateSites,
            store_id: None,
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    match service_provider
        .site_service
        .upsert_site(&service_context, input.to_domain())
    {
        Ok(site) => Ok(UpsertSiteResponse::Response(SiteNode { site })),
        Err(error) => Ok(UpsertSiteResponse::Error(UpsertSiteError {
            error: map_error(error)?,
        })),
    }
}

fn map_error(error: ServiceError) -> Result<UpsertSiteErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{error:#?}");

    let graphql_error = match error {
        ServiceError::CodeMustBeProvided => {
            return Ok(UpsertSiteErrorInterface::CodeMustBeProvided(
                CodeMustBeProvided,
            ))
        }
        ServiceError::NameNotProvided => {
            return Ok(UpsertSiteErrorInterface::NameNotProvided(NameNotProvided))
        }
        ServiceError::PasswordRequired => {
            return Ok(UpsertSiteErrorInterface::PasswordRequired(
                PasswordRequired,
            ))
        }
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

impl UpsertSiteInput {
    pub fn to_domain(self) -> UpsertSite {
        let UpsertSiteInput {
            id,
            code,
            name,
            password,
            clear_hardware_id,
        } = self;

        UpsertSite {
            id,
            code,
            name,
            password,
            clear_hardware_id: clear_hardware_id.unwrap_or(false),
        }
    }
}
