use async_graphql::*;
use graphql_core::{
    simple_generic_errors::RecordNotFound, standard_graphql_error::validate_auth,
    standard_graphql_error::StandardGraphqlError, ContextExt,
};
use graphql_types::types::DeleteResponse as GenericDeleteResponse;
use service::{
    auth::{Resource, ResourceAccessRequest},
    requisition::response_requisition::{
        DeleteResponseRequisition as ServiceInput, DeleteResponseRequisitionError as ServiceError,
    },
};

use crate::mutations::errors::{
    FinalisedRequisition, LineDeleteError, RequisitionWithShipment, TransferredRequisition,
};

#[derive(InputObject)]
#[graphql(name = "DeleteResponseRequisitionInput")]
pub struct DeleteInput {
    pub id: String,
}

#[derive(Interface)]
#[graphql(name = "DeleteResponseRequisitionErrorInterface")]
#[graphql(field(name = "description", ty = "String"))]
pub enum DeleteErrorInterface {
    RecordNotFound(RecordNotFound),
    FinalisedRequisition(FinalisedRequisition),
    TransferredRequisition(TransferredRequisition),
    RequisitionWithShipment(RequisitionWithShipment),
    LineDeleteError(LineDeleteError),
}

#[derive(SimpleObject)]
#[graphql(name = "DeleteResponseRequisitionError")]
pub struct DeleteError {
    pub error: DeleteErrorInterface,
}

#[derive(Union)]
#[graphql(name = "DeleteResponseRequisitionResponse")]
pub enum DeleteResponse {
    Error(DeleteError),
    Response(GenericDeleteResponse),
}

pub fn delete(ctx: &Context<'_>, store_id: &str, input: DeleteInput) -> Result<DeleteResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateRequisition,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    map_response(
        service_provider
            .requisition_service
            .delete_response_requisition(&service_context, input.to_domain()),
    )
}

pub fn map_response(from: Result<String, ServiceError>) -> Result<DeleteResponse> {
    let result = match from {
        Ok(id) => DeleteResponse::Response(GenericDeleteResponse(id)),
        Err(error) => DeleteResponse::Error(DeleteError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

impl DeleteInput {
    pub fn to_domain(self) -> ServiceInput {
        let DeleteInput { id } = self;
        ServiceInput { id }
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
        ServiceError::FinalisedRequisition => {
            return Ok(DeleteErrorInterface::FinalisedRequisition(
                FinalisedRequisition {},
            ))
        }
        ServiceError::TransferredRequisition => {
            return Ok(DeleteErrorInterface::TransferredRequisition(
                TransferredRequisition {},
            ))
        }
        ServiceError::RequisitionWithShipment => {
            return Ok(DeleteErrorInterface::RequisitionWithShipment(
                RequisitionWithShipment {},
            ))
        }
        ServiceError::LineDeleteError { .. } => {
            return Ok(DeleteErrorInterface::LineDeleteError(LineDeleteError {}))
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
    use async_graphql::EmptyMutation;
    use graphql_core::{
        assert_graphql_query, assert_standard_graphql_error, test_helpers::setup_graphql_test,
    };
    use repository::{mock::MockDataInserts, StorageConnectionManager};
    use serde_json::json;
    use service::{
        requisition::{
            response_requisition::{
                DeleteResponseRequisition as ServiceInput,
                DeleteResponseRequisitionError as ServiceError,
            },
            RequisitionServiceTrait,
        },
        service_provider::{ServiceContext, ServiceProvider},
    };

    use crate::RequisitionMutations;

    type DeleteLineMethod = dyn Fn(ServiceInput) -> Result<String, ServiceError> + Sync + Send;

    pub struct TestService(pub Box<DeleteLineMethod>);

    impl RequisitionServiceTrait for TestService {
        fn delete_response_requisition(
            &self,
            _: &ServiceContext,
            input: ServiceInput,
        ) -> Result<String, ServiceError> {
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
            "id": "n/a",
          },
          "storeId": "n/a"
        })
    }

    #[actix_rt::test]
    async fn test_graphql_delete_response_requisition_errors() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            RequisitionMutations,
            "test_graphql_delete_response_requisition_structured_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: DeleteResponseRequisitionInput!, $storeId: String) {
            deleteResponseRequisition(storeId: $storeId, input: $input) {
              ... on DeleteResponseRequisitionError {
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
            "deleteResponseRequisition": {
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

        // FinalisedRequisition
        let test_service = TestService(Box::new(|_| Err(ServiceError::FinalisedRequisition)));

        let expected = json!({
            "deleteResponseRequisition": {
              "error": {
                "__typename": "FinalisedRequisition"
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

        // TransferredRequisition
        let test_service = TestService(Box::new(|_| Err(ServiceError::TransferredRequisition)));

        let expected = json!({
            "deleteResponseRequisition": {
              "error": {
                "__typename": "TransferredRequisition"
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
    async fn test_graphql_delete_response_requisition_success() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            RequisitionMutations,
            "test_graphql_delete_response_requisition_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($storeId: String, $input: DeleteResponseRequisitionInput!) {
            deleteResponseRequisition(storeId: $storeId, input: $input) {
                ... on DeleteResponse {
                    id
                }
            }
          }
        "#;

        // Success
        let test_service = TestService(Box::new(|input| {
            assert_eq!(
                input,
                ServiceInput {
                    id: "id input".to_string(),
                }
            );
            Ok("deleted id".to_owned())
        }));

        let variables = json!({
          "input": {
            "id": "id input",
          },
          "storeId": "store_a"
        });

        let expected = json!({
            "deleteResponseRequisition": {
                "id": "deleted id"
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
