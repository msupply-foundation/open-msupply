use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{CannotEditRequisition, RecordNotFound},
    standard_graphql_error::validate_auth,
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};
use graphql_types::types::RequisitionLineConnector;
use service::{
    auth::{Resource, ResourceAccessRequest},
    requisition::request_requisition::{
        UseSuggestedQuantity as ServiceInput, UseSuggestedQuantityError as ServiceError,
    },
};

#[derive(InputObject)]
pub struct UseSuggestedQuantityInput {
    pub request_requisition_id: String,
}

#[derive(Interface)]
#[graphql(name = "UseSuggestedQuantityErrorInterface")]
#[graphql(field(name = "description", ty = "String"))]
pub enum DeleteErrorInterface {
    RecordNotFound(RecordNotFound),
    CannotEditRequisition(CannotEditRequisition),
}

#[derive(SimpleObject)]
#[graphql(name = "UseSuggestedQuantityError")]
pub struct DeleteError {
    pub error: DeleteErrorInterface,
}

#[derive(Union)]
#[graphql(name = "UseSuggestedQuantityResponse")]
pub enum UseSuggestedQuantityResponse {
    Error(DeleteError),
    Response(RequisitionLineConnector),
}

pub fn use_suggested_quantity(
    ctx: &Context<'_>,
    store_id: &str,
    input: UseSuggestedQuantityInput,
) -> Result<UseSuggestedQuantityResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateRequisition,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    let response = match service_provider
        .requisition_service
        .use_suggested_quantity(&service_context, input.to_domain())
    {
        Ok(requisition_lines) => UseSuggestedQuantityResponse::Response(
            RequisitionLineConnector::from_vec(requisition_lines),
        ),
        Err(error) => UseSuggestedQuantityResponse::Error(DeleteError {
            error: map_error(error)?,
        }),
    };

    Ok(response)
}

impl UseSuggestedQuantityInput {
    pub fn to_domain(self) -> ServiceInput {
        let UseSuggestedQuantityInput {
            request_requisition_id,
        } = self;
        ServiceInput {
            request_requisition_id,
        }
    }
}

fn map_error(error: ServiceError) -> Result<DeleteErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::RequisitionDoesNotExist => {
            return Ok(DeleteErrorInterface::RecordNotFound(RecordNotFound {}))
        }
        ServiceError::CannotEditRequisition => {
            return Ok(DeleteErrorInterface::CannotEditRequisition(
                CannotEditRequisition {},
            ))
        }
        // Standard Graphql Errors
        ServiceError::NotThisStoreRequisition => BadUserInput(formatted_error),
        ServiceError::NotARequestRequisition => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
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
        mock::{
            mock_item_a, mock_request_draft_requisition, mock_sent_request_requisition_line,
            MockDataInserts,
        },
        RequisitionLine, StorageConnectionManager,
    };
    use serde_json::json;

    use service::{
        requisition::{
            request_requisition::{
                UseSuggestedQuantity as ServiceInput, UseSuggestedQuantityError as ServiceError,
            },
            RequisitionServiceTrait,
        },
        service_provider::{ServiceContext, ServiceProvider},
    };

    use crate::RequisitionMutations;

    type DeleteLineMethod =
        dyn Fn(ServiceInput) -> Result<Vec<RequisitionLine>, ServiceError> + Sync + Send;

    pub struct TestService(pub Box<DeleteLineMethod>);

    impl RequisitionServiceTrait for TestService {
        fn use_suggested_quantity(
            &self,
            _: &ServiceContext,
            input: ServiceInput,
        ) -> Result<Vec<RequisitionLine>, ServiceError> {
            self.0(input)
        }
    }

    fn service_provider(
        test_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone(), "app_data");
        service_provider.requisition_service = Box::new(test_service);
        service_provider
    }

    fn empty_variables() -> serde_json::Value {
        json!({
          "input": {
            "requestRequisitionId": "n/a"
          },
          "storeId": "n/a"
        })
    }

    #[actix_rt::test]
    async fn test_graphql_use_suggested_quantity_errors() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            RequisitionMutations,
            "test_graphql_use_suggested_quantity_structured_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: UseSuggestedQuantityInput!, $storeId: String) {
            useSuggestedQuantity(storeId: $storeId, input: $input) {
              ... on UseSuggestedQuantityError {
                error {
                  __typename
                }
              }
            }
          }
        "#;

        // RequisitionDoesNotExist
        let test_service = TestService(Box::new(|_| Err(ServiceError::RequisitionDoesNotExist)));

        let expected = json!({
            "useSuggestedQuantity": {
              "error": {
                "__typename": "RecordNotFound"
              }
            }
          }
        );

        assert_graphql_query!(
            &settings,
            mutation,
            &Some(empty_variables()),
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );

        // CannotEditRequisition
        let test_service = TestService(Box::new(|_| Err(ServiceError::CannotEditRequisition)));

        let expected = json!({
            "useSuggestedQuantity": {
              "error": {
                "__typename": "CannotEditRequisition"
              }
            }
          }
        );

        assert_graphql_query!(
            &settings,
            mutation,
            &Some(empty_variables()),
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );

        // NotThisStoreRequisition
        let test_service = TestService(Box::new(|_| Err(ServiceError::NotThisStoreRequisition)));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables()),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        // NotARequestRequisition
        let test_service = TestService(Box::new(|_| Err(ServiceError::NotARequestRequisition)));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables()),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );
    }

    #[actix_rt::test]
    async fn test_graphql_use_suggested_quantity_success() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            RequisitionMutations,
            "test_graphql_use_suggested_quantity_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($storeId: String, $input: UseSuggestedQuantityInput!) {
            useSuggestedQuantity(storeId: $storeId, input: $input) {
                ... on RequisitionLineConnector{
                  nodes {
                    id
                  }
                }
            }
          }
        "#;

        // Success
        let test_service = TestService(Box::new(|input| {
            assert_eq!(
                input,
                ServiceInput {
                    request_requisition_id: "id input".to_string(),
                }
            );
            Ok(vec![RequisitionLine {
                requisition_line_row: mock_sent_request_requisition_line(),
                requisition_row: mock_request_draft_requisition(),
                item_row: mock_item_a(),
            }])
        }));

        let variables = json!({
          "input": {
            "requestRequisitionId": "id input"
          },
          "storeId": "store_a"
        });

        let expected = json!({
            "useSuggestedQuantity": {
              "nodes": [
                {
                  "id": mock_sent_request_requisition_line().id
                }
              ]
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
