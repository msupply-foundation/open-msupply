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
    requisition::response_requisition::{
        SupplyRequestedQuantity as ServiceInput, SupplyRequestedQuantityError as ServiceError,
    },
};

#[derive(InputObject)]
pub struct SupplyRequestedQuantityInput {
    pub response_requisition_id: String,
}

#[derive(Interface)]
#[graphql(name = "SupplyRequestedQuantityErrorInterface")]
#[graphql(field(name = "description", type = "String"))]
pub enum DeleteErrorInterface {
    RecordNotFound(RecordNotFound),
    CannotEditRequisition(CannotEditRequisition),
}

#[derive(SimpleObject)]
#[graphql(name = "SupplyRequestedQuantityError")]
pub struct DeleteError {
    pub error: DeleteErrorInterface,
}

#[derive(Union)]
#[graphql(name = "SupplyRequestedQuantityResponse")]
pub enum SupplyRequestedQuantityResponse {
    Error(DeleteError),
    Response(RequisitionLineConnector),
}

pub fn supply_requested_quantity(
    ctx: &Context<'_>,
    store_id: &str,
    input: SupplyRequestedQuantityInput,
) -> Result<SupplyRequestedQuantityResponse> {
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
        .supply_requested_quantity(&service_context, input.to_domain())
    {
        Ok(requisition_lines) => SupplyRequestedQuantityResponse::Response(
            RequisitionLineConnector::from_vec(requisition_lines),
        ),
        Err(error) => SupplyRequestedQuantityResponse::Error(DeleteError {
            error: map_error(error)?,
        }),
    };

    Ok(response)
}

impl SupplyRequestedQuantityInput {
    pub fn to_domain(self) -> ServiceInput {
        let SupplyRequestedQuantityInput {
            response_requisition_id,
        } = self;
        ServiceInput {
            response_requisition_id,
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
        ServiceError::NotAResponseRequisition => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

#[cfg(test)]
mod test {
    use crate::RequisitionMutations;
    use async_graphql::EmptyMutation;
    use graphql_core::{
        assert_graphql_query, assert_standard_graphql_error, test_helpers::setup_graphl_test,
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
            response_requisition::{
                SupplyRequestedQuantity as ServiceInput,
                SupplyRequestedQuantityError as ServiceError,
            },
            RequisitionServiceTrait,
        },
        service_provider::{ServiceContext, ServiceProvider},
    };

    type DeleteLineMethod =
        dyn Fn(ServiceInput) -> Result<Vec<RequisitionLine>, ServiceError> + Sync + Send;

    pub struct TestService(pub Box<DeleteLineMethod>);

    impl RequisitionServiceTrait for TestService {
        fn supply_requested_quantity(
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
            "responseRequisitionId": "n/a"
          },
          "storeId": "n/a"
        })
    }

    #[actix_rt::test]
    async fn test_graphql_supply_requested_quantity_errors() {
        let (_, _, connection_manager, settings) = setup_graphl_test(
            EmptyMutation,
            RequisitionMutations,
            "test_graphql_supply_requested_quantity_structured_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: SupplyRequestedQuantityInput!, $storeId: String) {
            supplyRequestedQuantity(storeId: $storeId, input: $input) {
              ... on SupplyRequestedQuantityError {
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
            "supplyRequestedQuantity": {
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
            "supplyRequestedQuantity": {
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

        // NotAResponseRequisition
        let test_service = TestService(Box::new(|_| Err(ServiceError::NotAResponseRequisition)));
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
    async fn test_graphql_supply_requested_quantity_success() {
        let (_, _, connection_manager, settings) = setup_graphl_test(
            EmptyMutation,
            RequisitionMutations,
            "test_graphql_supply_requested_quantity_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($storeId: String, $input: SupplyRequestedQuantityInput!) {
            supplyRequestedQuantity(storeId: $storeId, input: $input) {
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
                    response_requisition_id: "id input".to_string(),
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
            "responseRequisitionId": "id input"
          },
          "storeId": "store_a"
        });

        let expected = json!({
            "supplyRequestedQuantity": {
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
