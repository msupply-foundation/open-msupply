use crate::types::temperature_breach::TemperatureBreachNode;
use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use repository::TemperatureBreach;
use service::{
    auth::{Resource, ResourceAccessRequest},
    cold_chain::update_temperature_breach::{
        UpdateTemperatureBreachAcknowledgement as ServiceInput,
        UpdateTemperatureBreachError as ServiceError,
    },
};

#[derive(InputObject)]
#[graphql(name = "UpdateTemperatureBreachInput")]
pub struct UpdateInput {
    pub id: String,
    pub unacknowledged: bool,
    pub comment: Option<String>,
}

#[derive(Union)]
#[graphql(name = "UpdateTemperatureBreachResponse")]
pub enum UpdateResponse {
    Response(TemperatureBreachNode),
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
            .cold_chain_service
            .update_temperature_breach_acknowledgement(&service_context, input.to_domain()),
    )
}

pub fn map_response(from: Result<TemperatureBreach, ServiceError>) -> Result<UpdateResponse> {
    let result = match from {
        Ok(requisition_line) => {
            UpdateResponse::Response(TemperatureBreachNode::from_domain(requisition_line))
        }
        Err(error) => {
            return map_error(error);
        }
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

fn map_error(error: ServiceError) -> Result<UpdateResponse> {
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
        assert_graphql_query, assert_standard_graphql_error, test_helpers::setup_graphql_test,
    };
    use repository::{
        mock::{mock_temperature_breach_1, MockDataInserts},
        StorageConnectionManager, TemperatureBreach, TemperatureBreachRow,
    };
    use serde_json::json;

    use service::{
        cold_chain::{
            update_temperature_breach::{
                UpdateTemperatureBreach as ServiceInput,
                UpdateTemperatureBreachError as ServiceError,
            },
            ColdChainServiceTrait,
        },
        service_provider::{ServiceContext, ServiceProvider},
    };

    use crate::ColdChainMutations;

    type UpdateLineMethod =
        dyn Fn(ServiceInput) -> Result<TemperatureBreach, ServiceError> + Sync + Send;

    pub struct TestService(pub Box<UpdateLineMethod>);

    impl ColdChainServiceTrait for TestService {
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
        service_provider.cold_chain_service = Box::new(test_service);
        service_provider
    }

    fn empty_variables(id: &str, comment: &str) -> serde_json::Value {
        json!({
          "input": {
            "id": id,
            "unacknowledged": true,
            "comment": comment,
          },
          "storeId": "n/a"
        })
    }

    #[actix_rt::test]
    async fn test_graphql_update_temperature_breach_errors() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            ColdChainMutations,
            "test_graphql_update_temperature_breach_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: UpdateTemperatureBreachInput!, $storeId: String) {
            updateTemperatureBreach(storeId: $storeId, input: $input) {
                ... on TemperatureBreachNode {
                    id
                }
            }
          }
        "#;

        // RecordNotFound
        let test_service = TestService(Box::new(|_| {
            Err(ServiceError::TemperatureBreachDoesNotExist)
        }));

        let expected_message = "Bad user input";
        let expected_extensions = json!({"details": "TemperatureBreachDoesNotExist"});
        assert_standard_graphql_error!(
            &settings,
            mutation,
            &Some(empty_variables("n/a", "Test")),
            &expected_message,
            Some(expected_extensions),
            Some(service_provider(test_service, &connection_manager))
        );

        // TemperatureBreachDoesNotBelongToCurrentStore
        let test_service = TestService(Box::new(|_| {
            Err(ServiceError::TemperatureBreachDoesNotBelongToCurrentStore)
        }));
        let expected_message = "Bad user input";
        let expected_extensions =
            json!({"details": "TemperatureBreachDoesNotBelongToCurrentStore"});
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables(&mock_temperature_breach_1().id, "test")),
            &expected_message,
            Some(expected_extensions),
            Some(service_provider(test_service, &connection_manager))
        );

        // CommentNotProvided
        let test_service = TestService(Box::new(|_| Err(ServiceError::CommentNotProvided)));
        let expected_message = "Bad user input";
        let expected_extensions = json!({"details": "CommentNotProvided"});
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables(&mock_temperature_breach_1().id, "")),
            &expected_message,
            Some(expected_extensions),
            Some(service_provider(test_service, &connection_manager))
        );
    }

    #[actix_rt::test]
    async fn test_graphql_update_temperature_breach_success() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            ColdChainMutations,
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
