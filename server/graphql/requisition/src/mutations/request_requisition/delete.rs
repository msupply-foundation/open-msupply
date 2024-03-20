use async_graphql::*;
use graphql_types::types::DeleteResponse as GenericDeleteResponse;
use service::{
    auth::{Resource, ResourceAccessRequest},
    requisition::request_requisition::{
        DeleteRequestRequisition as ServiceInput, DeleteRequestRequisitionError as ServiceError,
    },
};

use graphql_core::{
    simple_generic_errors::{CannotEditRequisition, RecordNotFound},
    standard_graphql_error::validate_auth,
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};

use crate::mutations::errors::CannotDeleteRequisitionWithLines;
#[derive(InputObject, Clone)]
#[graphql(name = "DeleteRequestRequisitionInput")]
pub struct DeleteInput {
    pub id: String,
}

#[derive(Interface)]
#[graphql(name = "DeleteRequestRequisitionErrorInterface")]
#[graphql(field(name = "description", type = "String"))]
pub enum DeleteErrorInterface {
    RecordNotFound(RecordNotFound),
    CannotEditRequisition(CannotEditRequisition),
    CannotDeleteRequisitionWithLines(CannotDeleteRequisitionWithLines),
}

#[derive(SimpleObject)]
#[graphql(name = "DeleteRequestRequisitionError")]
pub struct DeleteError {
    pub error: DeleteErrorInterface,
}

#[derive(Union)]
#[graphql(name = "DeleteRequestRequisitionResponse")]
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
            .delete_request_requisition(&service_context, input.to_domain()),
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
    pub fn to_domain(&self) -> ServiceInput {
        let DeleteInput { id } = self;
        ServiceInput { id: id.to_string() }
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
        ServiceError::CannotDeleteRequisitionWithLines => {
            return Ok(DeleteErrorInterface::CannotDeleteRequisitionWithLines(
                CannotDeleteRequisitionWithLines {},
            ))
        }
        // Standard Graphql Errors
        ServiceError::NotThisStoreRequisition => BadUserInput(formatted_error),
        ServiceError::NotARequestRequisition => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
        ServiceError::LineDeleteError { .. } => InternalError(formatted_error),
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
            request_requisition::{
                DeleteRequestRequisition as ServiceInput,
                DeleteRequestRequisitionError as ServiceError,
            },
            RequisitionServiceTrait,
        },
        service_provider::{ServiceContext, ServiceProvider},
    };

    use crate::RequisitionMutations;

    type DeleteLineMethod = dyn Fn(ServiceInput) -> Result<String, ServiceError> + Sync + Send;

    pub struct TestService(pub Box<DeleteLineMethod>);

    impl RequisitionServiceTrait for TestService {
        fn delete_request_requisition(
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
    async fn test_graphql_delete_request_requisition_errors() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            RequisitionMutations,
            "test_graphql_delete_request_requisition_structured_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: DeleteRequestRequisitionInput!, $storeId: String) {
            deleteRequestRequisition(storeId: $storeId, input: $input) {
              ... on DeleteRequestRequisitionError {
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
            "deleteRequestRequisition": {
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
            "deleteRequestRequisition": {
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

        // CannotDeleteRequisitionWithLines
        let test_service = TestService(Box::new(|_| {
            Err(ServiceError::CannotDeleteRequisitionWithLines)
        }));

        let expected = json!({
            "deleteRequestRequisition": {
              "error": {
                "__typename": "CannotDeleteRequisitionWithLines"
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
    async fn test_graphql_delete_request_requisition_success() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            RequisitionMutations,
            "test_graphql_delete_request_requisition_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($storeId: String, $input: DeleteRequestRequisitionInput!) {
            deleteRequestRequisition(storeId: $storeId, input: $input) {
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
            "deleteRequestRequisition": {
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
