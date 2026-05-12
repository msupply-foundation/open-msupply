use async_graphql::*;
use graphql_core::{standard_graphql_error::StandardGraphqlError, ContextExt};
use service::{
    initialisation_status::get_initialisation_status,
    standalone_central::{
        InitialiseAsCentralServerError as ServiceError, InitialiseAsCentralServerInput,
    },
    sync::sync_status::status::InitialisationStatus,
};

pub async fn initialise_as_central_server(
    ctx: &Context<'_>,
    input: InitialiseAsCentralServerInputNode,
) -> Result<InitialiseAsCentralServerResponse> {
    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    if get_initialisation_status(service_provider, &service_context)?
        != InitialisationStatus::PreInitialisation
    {
        return Ok(InitialiseAsCentralServerResponse::Error(
            InitialiseAsCentralServerError {
                error: InitialiseAsCentralServerErrorInterface::AlreadyInitialised(
                    AlreadyInitialised,
                ),
            },
        ));
    }

    match service_provider
        .standalone_central_service
        .initialise(&service_context, input.to_domain())
    {
        Ok(()) => Ok(InitialiseAsCentralServerResponse::Response(
            StandaloneCentralInitialisedNode,
        )),
        Err(error) => Ok(InitialiseAsCentralServerResponse::Error(
            InitialiseAsCentralServerError {
                error: map_error(error)?,
            },
        )),
    }
}

#[derive(InputObject)]
pub struct InitialiseAsCentralServerInputNode {
    pub store_name: String,
    pub admin_username: String,
    pub admin_password: String,
}

impl InitialiseAsCentralServerInputNode {
    pub fn to_domain(self) -> InitialiseAsCentralServerInput {
        let InitialiseAsCentralServerInputNode {
            store_name,
            admin_username,
            admin_password,
        } = self;
        InitialiseAsCentralServerInput {
            store_name,
            admin_username,
            admin_password,
        }
    }
}

pub struct StandaloneCentralInitialisedNode;
#[Object]
impl StandaloneCentralInitialisedNode {
    pub async fn success(&self) -> bool {
        true
    }
}

#[derive(SimpleObject)]
pub struct InitialiseAsCentralServerError {
    pub error: InitialiseAsCentralServerErrorInterface,
}

#[derive(Union)]
pub enum InitialiseAsCentralServerResponse {
    Error(InitialiseAsCentralServerError),
    Response(StandaloneCentralInitialisedNode),
}

#[derive(Interface)]
#[graphql(field(name = "description", ty = "&str"))]
pub enum InitialiseAsCentralServerErrorInterface {
    AlreadyInitialised(AlreadyInitialised),
    StoreNameRequired(StoreNameRequired),
    AdminUsernameRequired(AdminUsernameRequired),
    AdminPasswordRequired(AdminPasswordRequired),
    AdminUserCreationFailed(AdminUserCreationFailed),
}

pub struct AlreadyInitialised;
#[Object]
impl AlreadyInitialised {
    pub async fn description(&self) -> &str {
        "Server is already initialised"
    }
}

pub struct StoreNameRequired;
#[Object]
impl StoreNameRequired {
    pub async fn description(&self) -> &str {
        "Store name must not be empty"
    }
}

pub struct AdminUsernameRequired;
#[Object]
impl AdminUsernameRequired {
    pub async fn description(&self) -> &str {
        "Admin username must not be empty"
    }
}

pub struct AdminPasswordRequired;
#[Object]
impl AdminPasswordRequired {
    pub async fn description(&self) -> &str {
        "Admin password must not be empty"
    }
}

pub struct AdminUserCreationFailed;
#[Object]
impl AdminUserCreationFailed {
    pub async fn description(&self) -> &str {
        "Failed to create the admin user"
    }
}

fn map_error(error: ServiceError) -> Result<InitialiseAsCentralServerErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{error:#?}");

    let graphql_error = match error {
        // Structured errors
        ServiceError::AlreadyInitialised => {
            return Ok(InitialiseAsCentralServerErrorInterface::AlreadyInitialised(
                AlreadyInitialised,
            ))
        }
        ServiceError::StoreNameRequired => {
            return Ok(InitialiseAsCentralServerErrorInterface::StoreNameRequired(
                StoreNameRequired,
            ))
        }
        ServiceError::AdminUsernameRequired => {
            return Ok(
                InitialiseAsCentralServerErrorInterface::AdminUsernameRequired(
                    AdminUsernameRequired,
                ),
            )
        }
        ServiceError::AdminPasswordRequired => {
            return Ok(
                InitialiseAsCentralServerErrorInterface::AdminPasswordRequired(
                    AdminPasswordRequired,
                ),
            )
        }
        ServiceError::AdminUserCreationFailed(_) => {
            return Ok(
                InitialiseAsCentralServerErrorInterface::AdminUserCreationFailed(
                    AdminUserCreationFailed,
                ),
            )
        }
        // Standard Graphql Errors
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
