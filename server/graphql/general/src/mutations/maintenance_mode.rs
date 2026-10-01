use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    processors::pause::{are_processors_paused, set_processors_paused, SetProcessorsPausedError},
    sync::maintenance_mode::{
        is_maintenance_mode, pending_integration_records, set_maintenance_mode,
        SetMaintenanceModeError as ServiceError,
    },
};

const SERVER_ADMIN: ResourceAccessRequest = ResourceAccessRequest {
    resource: Resource::ServerAdmin,
    store_id: None,
    require_central_standalone: false,
};

/// State of central's processor pause.
#[derive(SimpleObject)]
pub struct ProcessorsPausedNode {
    pub is_paused: bool,
}

/// State of central's maintenance mode.
#[derive(SimpleObject)]
pub struct MaintenanceModeNode {
    pub is_on: bool,
    /// Rows in OMS central's own sync buffer (pulled from the legacy mSupply central server)
    /// still waiting to be integrated. Maintenance mode cannot be turned off while this is above
    /// zero.
    pub pending_integration_records: u64,
}

pub struct IntegrationIncomplete {
    pub pending_integration_records: u64,
}

#[Object]
impl IntegrationIncomplete {
    pub async fn pending_integration_records(&self) -> u64 {
        self.pending_integration_records
    }

    pub async fn description(&self) -> &str {
        "OMS central's own sync buffer still has records to integrate. Run a sync and wait for \
         it to finish before turning maintenance mode off"
    }
}

#[derive(Interface)]
#[graphql(field(name = "description", ty = "&str"))]
pub enum SetMaintenanceModeErrorInterface {
    IntegrationIncomplete(IntegrationIncomplete),
}

#[derive(SimpleObject)]
pub struct SetMaintenanceModeError {
    pub error: SetMaintenanceModeErrorInterface,
}

#[derive(Union)]
pub enum SetMaintenanceModeResponse {
    Response(MaintenanceModeNode),
    Error(SetMaintenanceModeError),
}

/// Whether central's processors are paused. Always false on a remote.
pub fn processors_paused_query(ctx: &Context<'_>) -> Result<bool> {
    validate_auth(ctx, &SERVER_ADMIN)?;

    let service_context = ctx.service_provider().basic_context()?;
    Ok(are_processors_paused(&service_context.connection)?)
}

/// Pause or resume central's transfer and general processors. Returns the new state.
pub fn set_processors_paused_mutation(
    ctx: &Context<'_>,
    paused: bool,
) -> Result<ProcessorsPausedNode> {
    let user = validate_auth(ctx, &SERVER_ADMIN)?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context("".to_string(), user.user_id)?;

    let is_paused =
        set_processors_paused(service_provider, &service_context, paused).map_err(|error| {
            let graphql_error = match error {
                SetProcessorsPausedError::NotACentralServer => {
                    StandardGraphqlError::BadUserInput("Not a central server".to_string())
                }
                SetProcessorsPausedError::HeldByMaintenanceMode => {
                    StandardGraphqlError::BadUserInput("Held by maintenance mode".to_string())
                }
                SetProcessorsPausedError::DatabaseError(error) => {
                    StandardGraphqlError::InternalError(format!("{error:?}"))
                }
            };
            graphql_error.extend()
        })?;

    Ok(ProcessorsPausedNode { is_paused })
}

/// Maintenance mode and how much of OMS central's own buffer is left to integrate.
pub fn maintenance_mode_query(ctx: &Context<'_>) -> Result<MaintenanceModeNode> {
    validate_auth(ctx, &SERVER_ADMIN)?;

    let connection = ctx.service_provider().basic_context()?.connection;
    Ok(MaintenanceModeNode {
        is_on: is_maintenance_mode(&connection)?,
        pending_integration_records: pending_integration_records(&connection)?,
    })
}

/// Whether maintenance mode is on. Unauthenticated, so the login screen can say so up front.
pub fn is_maintenance_mode_query(ctx: &Context<'_>) -> Result<bool> {
    let connection = ctx.service_provider().basic_context()?.connection;
    Ok(is_maintenance_mode(&connection)?)
}

pub fn set_maintenance_mode_mutation(
    ctx: &Context<'_>,
    on: bool,
) -> Result<SetMaintenanceModeResponse> {
    let user = validate_auth(ctx, &SERVER_ADMIN)?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context("".to_string(), user.user_id)?;

    let result = set_maintenance_mode(service_provider, &service_context, ctx.get_auth_data(), on);

    let graphql_error = match result {
        Ok(is_on) => {
            return Ok(SetMaintenanceModeResponse::Response(MaintenanceModeNode {
                is_on,
                pending_integration_records: pending_integration_records(
                    &service_context.connection,
                )?,
            }))
        }
        Err(ServiceError::IntegrationIncomplete(pending_integration_records)) => {
            return Ok(SetMaintenanceModeResponse::Error(SetMaintenanceModeError {
                error: SetMaintenanceModeErrorInterface::IntegrationIncomplete(
                    IntegrationIncomplete {
                        pending_integration_records,
                    },
                ),
            }))
        }
        Err(ServiceError::NotACentralServer) => {
            StandardGraphqlError::BadUserInput("Not a central server".to_string())
        }
        Err(ServiceError::InternalError(error)) => StandardGraphqlError::InternalError(error),
        Err(ServiceError::DatabaseError(error)) => {
            StandardGraphqlError::InternalError(format!("{error:?}"))
        }
    };

    Err(graphql_error.extend())
}

#[cfg(test)]
mod test {
    use graphql_core::{assert_graphql_query, test_helpers::setup_graphql_test};
    use repository::mock::MockDataInserts;
    use serde_json::json;
    use service::sync::test_util_set_is_central_server;

    use crate::{CentralGeneralMutations, GeneralQueries};

    #[actix_rt::test]
    async fn test_graphql_maintenance_mode_round_trip() {
        let (_, _, _, settings) = setup_graphql_test(
            GeneralQueries,
            CentralGeneralMutations,
            "test_graphql_maintenance_mode_round_trip",
            MockDataInserts::none(),
        )
        .await;
        test_util_set_is_central_server(true);
        let variables: Option<serde_json::Value> = None;

        let state = r#"query {
            isMaintenanceMode
            isSyncPaused
            isSyncApiPaused
            areProcessorsPaused
            maintenanceMode { isOn pendingIntegrationRecords }
        }"#;
        let set = |on: bool| {
            format!(
                r#"mutation {{
                    setMaintenanceMode(on: {on}) {{
                        __typename
                        ... on MaintenanceModeNode {{ isOn pendingIntegrationRecords }}
                    }}
                }}"#
            )
        };
        let expected_state = |on: bool| {
            json!({
                "isMaintenanceMode": on,
                "isSyncPaused": on,
                "isSyncApiPaused": on,
                "areProcessorsPaused": on,
                "maintenanceMode": { "isOn": on, "pendingIntegrationRecords": 0 },
            })
        };

        assert_graphql_query!(&settings, state, &variables, &expected_state(false), None);
        assert_graphql_query!(
            &settings,
            &set(true),
            &variables,
            &json!({ "setMaintenanceMode": {
                "__typename": "MaintenanceModeNode", "isOn": true, "pendingIntegrationRecords": 0
            }}),
            None
        );
        assert_graphql_query!(&settings, state, &variables, &expected_state(true), None);
        assert_graphql_query!(
            &settings,
            &set(false),
            &variables,
            &json!({ "setMaintenanceMode": {
                "__typename": "MaintenanceModeNode", "isOn": false, "pendingIntegrationRecords": 0
            }}),
            None
        );
        assert_graphql_query!(&settings, state, &variables, &expected_state(false), None);

        // The processor pause also works on its own.
        assert_graphql_query!(
            &settings,
            r#"mutation { setProcessorsPaused(paused: true) { isPaused } }"#,
            &variables,
            &json!({ "setProcessorsPaused": { "isPaused": true } }),
            None
        );
    }
}
