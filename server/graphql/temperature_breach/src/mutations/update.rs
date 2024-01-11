use async_graphql::*;
use graphql_core::{
    simple_generic_errors::RecordNotFound,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::TemperatureBreachNode;
use repository::TemperatureBreach;
use service::{
    auth::{Resource, ResourceAccessRequest},
    temperature_breach::update::{
        UpdateTemperatureBreachAcknowledgement as ServiceInput,
        UpdateTemperatureBreachError as ServiceError,
    },
};

use super::CommentNotProvided;

#[derive(InputObject)]
#[graphql(name = "UpdateTemperatureBreachInput")]
pub struct UpdateInput {
    pub id: String,
    pub unacknowledged: bool,
    pub comment: Option<String>,
}

#[derive(Interface)]
#[graphql(name = "UpdateTemperatureBreachErrorInterface")]
#[graphql(field(name = "description", type = "String"))]
pub enum UpdateErrorInterface {
    RecordNotFound(RecordNotFound),
    CommentNotProvided(CommentNotProvided),
}

#[derive(SimpleObject)]
#[graphql(name = "UpdateTemperatureBreachError")]
pub struct UpdateError {
    pub error: UpdateErrorInterface,
}

#[derive(Union)]
#[graphql(name = "UpdateTemperatureBreachResponse")]
pub enum UpdateResponse {
    Response(TemperatureBreachNode),
    Error(UpdateError),
}

pub fn update(ctx: &Context<'_>, store_id: &str, input: UpdateInput) -> Result<UpdateResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateTemperatureBreach,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    map_response(
        service_provider
            .temperature_breach_service
            .update_temperature_breach_acknowledgement(&service_context, input.to_domain()),
    )
}

pub fn map_response(from: Result<TemperatureBreach, ServiceError>) -> Result<UpdateResponse> {
    let result = match from {
        Ok(requisition_line) => {
            UpdateResponse::Response(TemperatureBreachNode::from_domain(requisition_line))
        }
        Err(error) => UpdateResponse::Error(UpdateError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

impl UpdateInput {
    pub fn to_domain(self) -> ServiceInput {
        let UpdateInput {
            id,
            unacknowledged,
            comment,
        } = self;

        ServiceInput {
            id,
            unacknowledged,
            comment,
        }
    }
}

fn map_error(error: ServiceError) -> Result<UpdateErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        ServiceError::TemperatureBreachDoesNotExist => BadUserInput(formatted_error),
        ServiceError::TemperatureBreachDoesNotBelongToCurrentStore => BadUserInput(formatted_error),
        ServiceError::LocationIsOnHold => BadUserInput(formatted_error),
        ServiceError::UpdatedRecordNotFound => InternalError(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
        ServiceError::CommentNotProvided => BadUserInput(formatted_error),
    };

    Err(graphql_error.extend())
}

#[cfg(test)]
mod test {
    use async_graphql::EmptyMutation;
    use graphql_core::{
        assert_graphql_query, assert_standard_graphql_error, test_helpers::setup_graphl_test,
    };
    use repository::{
        mock::{mock_temperature_breach_1, MockDataInserts},
        StorageConnectionManager, TemperatureBreach, TemperatureBreachRow,
    };
    use serde_json::json;

    use service::{
        service_provider::{ServiceContext, ServiceProvider},
        temperature_breach::{
            update::{
                UpdateTemperatureBreach as ServiceInput,
                UpdateTemperatureBreachError as ServiceError,
            },
            TemperatureBreachServiceTrait,
        },
    };

    use crate::TemperatureBreachMutations;

    type UpdateLineMethod =
        dyn Fn(ServiceInput) -> Result<TemperatureBreach, ServiceError> + Sync + Send;

    pub struct TestService(pub Box<UpdateLineMethod>);

    impl TemperatureBreachServiceTrait for TestService {
        fn update_temperature_breach(
            &self,
            _: &ServiceContext,
            input: ServiceInput,
        ) -> Result<TemperatureBreach, ServiceError> {
            self.0(input)
        }
    }

    fn service_provider(
        test_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone(), "app_data");
        service_provider.temperature_breach_service = Box::new(test_service);
        service_provider
    }

    fn empty_variables(id: &str) -> serde_json::Value {
        json!({
          "input": {
            "id": id,
            "unacknowledged": true,
          },
          "storeId": "n/a"
        })
    }

    #[actix_rt::test]
    async fn test_graphql_update_temperature_breach_errors() {
        let (_, _, connection_manager, settings) = setup_graphl_test(
            EmptyMutation,
            TemperatureBreachMutations,
            "test_graphql_update_temperature_breach_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: UpdateTemperatureBreachInput!, $storeId: String) {
            updateTemperatureBreach(storeId: $storeId, input: $input) {
              ... on UpdateTemperatureBreachError {
                error {
                  __typename
                }
              }
            }
          }
        "#;

        // RecordNotFound
        let test_service = TestService(Box::new(|_| {
            Err(ServiceError::TemperatureBreachDoesNotExist)
        }));
        let expected = json!({
            "updateTemperatureBreach": {
              "error": {
                "__typename": "RecordNotFound"
              }
            }
          }
        );

        assert_graphql_query!(
            &settings,
            mutation,
            &Some(empty_variables("n/a")),
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );

        // TemperatureBreachDoesNotBelongToCurrentStore
        let test_service = TestService(Box::new(|_| {
            Err(ServiceError::TemperatureBreachDoesNotBelongToCurrentStore)
        }));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables(&mock_temperature_breach_1().id)),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        // CommentNotProvided
        let test_service = TestService(Box::new(|_| Err(ServiceError::CommentNotProvided)));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables(&mock_temperature_breach_1().id)),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );
    }

    #[actix_rt::test]
    async fn test_graphql_update_temperature_breach_success() {
        let (_, _, connection_manager, settings) = setup_graphl_test(
            EmptyMutation,
            TemperatureBreachMutations,
            "test_graphql_update_temperature_breach_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
            mutation ($storeId: String, $input: UpdateTemperatureBreachInput!) {
                updateTemperatureBreach(storeId: $storeId, input: $input) {
                    ... on TemperatureBreachNode {
                        id
                        unacknowledged
                        comment
                    }
                }
              }
            "#;

        // Success
        let test_service = TestService(Box::new(|input| {
            assert_eq!(input.id, mock_temperature_breach_1().id);
            let expected = TemperatureBreach {
                temperature_breach_row: TemperatureBreachRow {
                    unacknowledged: false,
                    comment: Some("some comment".to_string()),
                    ..mock_temperature_breach_1()
                },
            };
            Ok(expected)
        }));

        let variables = json!({
          "input": {
            "id": "temperature_breach_1",
            "unacknowledged": false,
            "comment": "some comment",
          },
          "storeId": "store_a"
        });

        let expected = json!({
            "updateTemperatureBreach": {
                "id": mock_temperature_breach_1().id,
                "unacknowledged": false,
                "comment": "some comment",
            }
          }
        );

        assert_graphql_query!(
            &settings,
            mutation,
            &Some(variables),
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );
    }
}
