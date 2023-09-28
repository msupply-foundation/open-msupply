use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{
        DatabaseError, InternalError, RecordAlreadyExist, UniqueValueViolation,
    },
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::TemperatureBreachConfigNode;
use service::{
    auth::{Resource, ResourceAccessRequest},
    temperature_breach_config::insert::{InsertTemperatureBreachConfig, InsertTemperatureBreachConfigError as ServiceError},
};

pub fn insert_temperature_breach_config(
    ctx: &Context<'_>,
    store_id: &str,
    input: InsertTemperatureBreachConfigInput,
) -> Result<InsertTemperatureBreachConfigResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateTemperatureBreachConfig,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    match service_provider
        .temperature_breach_config_service
        .insert_temperature_breach_config(&service_context, input.into())
    {
        Ok(temperature_breach_config) => Ok(InsertTemperatureBreachConfigResponse::Response(TemperatureBreachConfigNode::from_domain(
            temperature_breach_config,
        ))),
        Err(error) => Ok(InsertTemperatureBreachConfigResponse::Error(InsertTemperatureBreachConfigError {
            error: map_error(error)?,
        })),
    }
}

#[derive(InputObject)]
pub struct InsertTemperatureBreachConfigInput {
    pub id: String,
    pub description: String,
    pub is_active: bool,
}

impl From<InsertTemperatureBreachConfigInput> for InsertTemperatureBreachConfig {
    fn from(
        InsertTemperatureBreachConfigInput {
            id,
            description,
            is_active: _,
        }: InsertTemperatureBreachConfigInput,
    ) -> Self {
        InsertTemperatureBreachConfig {
            id,
            description,
            is_active: true,
        }
    }
}
#[derive(SimpleObject)]
pub struct InsertTemperatureBreachConfigError {
    pub error: InsertTemperatureBreachConfigErrorInterface,
}

#[derive(Union)]
pub enum InsertTemperatureBreachConfigResponse {
    Error(InsertTemperatureBreachConfigError),
    Response(TemperatureBreachConfigNode),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum InsertTemperatureBreachConfigErrorInterface {
    TemperatureBreachConfigAlreadyExists(RecordAlreadyExist),
    InternalError(InternalError),
    DatabaseError(DatabaseError),
}

fn map_error(error: ServiceError) -> Result<InsertTemperatureBreachConfigErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Standard Graphql Errors
        ServiceError::TemperatureBreachConfigAlreadyExists => BadUserInput(formatted_error),
        ServiceError::CreatedRecordNotFound => InternalError(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

#[cfg(test)]
mod test {

    use async_graphql::EmptyMutation;
    use graphql_core::{
        assert_graphql_query, assert_standard_graphql_error, test_helpers::setup_graphl_test,
    };
    use repository::{mock::MockDataInserts, temperature_breach_config::{TemperatureBreachConfig, TemperatureBreachRowType}, TemperatureBreachConfigRow, StorageConnectionManager};
    use serde_json::json;

    use service::{
        temperature_breach_config::{
            insert::{InsertTemperatureBreachConfig, InsertTemperatureBreachConfigError},
            TemperatureBreachConfigServiceTrait,
        },
        service_provider::{ServiceContext, ServiceProvider},
    };

    use crate::TemperatureBreachConfigMutations;

    type InsertTemperatureBreachConfigMethod =
        dyn Fn(InsertTemperatureBreachConfig) -> Result<TemperatureBreachConfig, InsertTemperatureBreachConfigError> + Sync + Send;

    pub struct TestService(pub Box<InsertTemperatureBreachConfigMethod>);

    impl TemperatureBreachConfigServiceTrait for TestService {
        fn insert_temperature_breach_config(
            &self,
            _: &ServiceContext,
            input: InsertTemperatureBreachConfig,
        ) -> Result<TemperatureBreachConfig, InsertTemperatureBreachConfigError> {
            (self.0)(input)
        }
    }

    pub fn service_provider(
        temperature_breach_config_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone(), "app_data");
        service_provider.temperature_breach_config_service = Box::new(temperature_breach_config_service);
        service_provider
    }

    #[actix_rt::test]
    async fn test_graphql_insert_temperature_breach_config_errors() {
        let (_, _, connection_manager, settings) = setup_graphl_test(
            EmptyMutation,
            TemperatureBreachConfigMutations,
            "test_graphql_insert_temperature_breach_config_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: InsertTemperatureBreachConfigInput!) {
            insertTemperatureBreachConfig(input: $input, storeId: \"store_a\") {
              ... on InsertTemperatureBreachConfigError {
                error {
                  __typename
                }
              }
            }
          }
        "#;

        let variables = Some(json!({
          "input": {
            "id": "n/a",
            "description": "n/a",
          }
        }));

        // Record Already Exists
        let test_service = TestService(Box::new(|_| Err(InsertTemperatureBreachConfigError::TemperatureBreachConfigAlreadyExists)));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            mutation,
            &variables,
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        // Created record does not exist (this shouldn't happen, but want to test internal error)
        let mutation = r#"
         mutation ($input: InsertTemperatureBreachConfigInput!) {
             insertTemperatureBreachConfig(input: $input, storeId: \"store_a\") {
               ... on InsertTemperatureBreachConfigError {
                 error {
                   ... on InternalError {
                       __typename
                       description
                       fullError
                   }
                 }
               }
             }
           }
         "#;

        let test_service = TestService(Box::new(|_| Err(InsertTemperatureBreachConfigError::CreatedRecordNotFound)));
        let expected_message = "Internal error";
        assert_standard_graphql_error!(
            &settings,
            mutation,
            &variables,
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );
    }

    #[actix_rt::test]
    async fn test_graphql_insert_temperature_breach_config_success() {
        let (_, _, connection_manager, settings) = setup_graphl_test(
            EmptyMutation,
            TemperatureBreachConfigMutations,
            "test_graphql_insert_temperature_breach_config_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: InsertTemperatureBreachConfigInput!) {
            insertTemperatureBreachConfig(input: $input, storeId: \"store_a\") {
              ... on TemperatureBreachConfigNode {
                id
                description
                isActive
              }
            }
          }
        "#;

        let variables = Some(json!({
          "input": {
            "id": "n/a",
            "description": "n/a",
          }
        }));

        // Record Already Exists
        let test_service = TestService(Box::new(|_| {
            Ok(TemperatureBreachConfig {
                temperature_breach_config_row: TemperatureBreachConfigRow {
                    id: "id".to_owned(),
                    description: "description".to_owned(),
                    duration: 3600,
                    is_active: true,
                    store_id: Some("store_a".to_owned()),
                    minimum_temperature: -273.0,
                    maximum_temperature: 2,
                    r#type: TemperatureBreachRowType::ColdConsecutive,
                },
            })
        }));

        let expected = json!({
            "insertTemperatureBreachConfig": {
                "id": "id",
                "description": "description",
                "isActive": true,
            }
          }
        );

        assert_graphql_query!(
            &settings,
            mutation,
            &variables,
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );
    }
}
