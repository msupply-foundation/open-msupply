use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{OtherPartyNotASupplier, OtherPartyNotVisible},
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::RequisitionNode;
use repository::Requisition;
use service::{
    auth::{Resource, ResourceAccessRequest},
    requisition::request_requisition::{
        InsertFromResponseRequisition, InsertFromResponseRequisitionError as ServiceError,
    },
};

#[derive(InputObject)]
#[graphql(name = "InsertFromResponseRequisitionInput")]
pub struct InsertFromResponseRequisitionInput {
    pub id: String,
    pub response_requisition_id: String,
    pub other_party_id: String,
    pub comment: Option<String>,
}

#[derive(Interface)]
#[graphql(name = "InsertFromResponseRequisitionErrorInterface")]
#[graphql(field(name = "description", ty = "String"))]
pub enum InsertFromResponseErrorInterface {
    OtherPartyNotVisible(OtherPartyNotVisible),
    OtherPartyNotASupplier(OtherPartyNotASupplier),
}

#[derive(SimpleObject)]
#[graphql(name = "InsertFromResponseRequisitionError")]
pub struct InsertFromResponseError {
    pub error: InsertFromResponseErrorInterface,
}

#[derive(Union)]
#[graphql(name = "InsertFromResponseRequisitionResponse")]
pub enum InsertFromResponse {
    Error(InsertFromResponseError),
    Response(RequisitionNode),
}

pub fn insert_from_response_requisition(
    ctx: &Context<'_>,
    store_id: &str,
    input: InsertFromResponseRequisitionInput,
) -> Result<InsertFromResponse> {
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
            .insert_from_response_requisition(&service_context, input.to_domain()),
    )
}

pub fn map_response(from: Result<Requisition, ServiceError>) -> Result<InsertFromResponse> {
    let result = match from {
        Ok(requisition) => InsertFromResponse::Response(RequisitionNode::from_domain(requisition)),
        Err(error) => InsertFromResponse::Error(InsertFromResponseError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

pub fn map_error(error: ServiceError) -> Result<InsertFromResponseErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::OtherPartyNotASupplier => {
            return Ok(InsertFromResponseErrorInterface::OtherPartyNotASupplier(
                OtherPartyNotASupplier,
            ))
        }
        ServiceError::OtherPartyNotVisible => {
            return Ok(InsertFromResponseErrorInterface::OtherPartyNotVisible(
                OtherPartyNotVisible,
            ))
        }
        // Standard Graphql Errors
        ServiceError::RequisitionAlreadyExists
        | ServiceError::OtherPartyDoesNotExist
        | ServiceError::OtherPartyIsNotAStore => BadUserInput(formatted_error),
        ServiceError::NewlyCreatedRequisitionDoesNotExist => InternalError(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
        ServiceError::PluginError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

impl InsertFromResponseRequisitionInput {
    pub fn to_domain(self) -> InsertFromResponseRequisition {
        let InsertFromResponseRequisitionInput {
            id,
            response_requisition_id,
            other_party_id,
            comment,
        } = self;

        InsertFromResponseRequisition {
            id,
            response_requisition_id,
            other_party_id,
            comment,
        }
    }
}

#[cfg(test)]
mod test {
    use crate::RequisitionMutations;
    use async_graphql::EmptyMutation;
    use graphql_core::{
        assert_graphql_query, assert_standard_graphql_error, test_helpers::setup_graphql_test,
    };
    use repository::{
        mock::{mock_request_draft_requisition, MockDataInserts},
        Requisition, StorageConnectionManager,
    };
    use serde_json::json;
    use service::{
        requisition::{
            request_requisition::{
                InsertFromResponseRequisition as ServiceInput,
                InsertFromResponseRequisitionError as ServiceError,
            },
            RequisitionServiceTrait,
        },
        service_provider::{ServiceContext, ServiceProvider},
    };

    type InsertLineMethod = dyn Fn(ServiceInput) -> Result<Requisition, ServiceError> + Sync + Send;

    pub struct TestService(pub Box<InsertLineMethod>);

    impl RequisitionServiceTrait for TestService {
        fn insert_from_response_requisition(
            &self,
            _: &ServiceContext,
            input: ServiceInput,
        ) -> Result<Requisition, ServiceError> {
            self.0(input)
        }
    }

    fn service_provider(
        test_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone());
        service_provider.requisition_service = Box::new(test_service);
        service_provider
    }

    fn empty_variables() -> serde_json::Value {
        json!({
          "input": {
            "id": "n/a",
            "responseRequisitionId": "req1",
            "otherPartyId": "n/a"
          },
          "storeId": "n/a"
        })
    }

    #[actix_rt::test]
    async fn test_graphql_insert_from_response_requisition_errors() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            RequisitionMutations,
            "test_graphql_insert_from_response_requisition_structured_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: InsertFromResponseRequisitionInput!, $storeId: String) {
            insertFromResponseRequisition(storeId: $storeId, input: $input) {
              ... on InsertFromResponseRequisitionError {
                error {
                  __typename
                }
              }
            }
          }
        "#;

        // OtherPartyNotASupplier
        let test_service = TestService(Box::new(|_| Err(ServiceError::OtherPartyNotASupplier)));

        let expected = json!({
            "insertFromResponseRequisition": {
              "error": {
                "__typename": "OtherPartyNotASupplier"
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

        // RequisitionAlreadyExists
        let test_service = TestService(Box::new(|_| Err(ServiceError::RequisitionAlreadyExists)));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables()),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        // OtherPartyDoesNotExist
        let test_service = TestService(Box::new(|_| Err(ServiceError::OtherPartyDoesNotExist)));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables()),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        // OtherPartyIsNotAStore
        let test_service = TestService(Box::new(|_| Err(ServiceError::OtherPartyIsNotAStore)));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables()),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        // NewlyCreatedRequisitionDoesNotExist
        let test_service = TestService(Box::new(|_| {
            Err(ServiceError::NewlyCreatedRequisitionDoesNotExist)
        }));
        let expected_message = "Internal error";
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
    async fn test_graphql_insert_from_response_requisition_success() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            RequisitionMutations,
            "test_graphql_insert_from_response_requisition_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($storeId: String, $input: InsertFromResponseRequisitionInput!) {
            insertFromResponseRequisition(storeId: $storeId, input: $input) {
                ... on RequisitionNode {
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
                    response_requisition_id: "req1".to_string(),
                    other_party_id: "other party input".to_string(),
                    comment: Some("comment input".to_string()),
                }
            );
            Ok(Requisition {
                requisition_row: mock_request_draft_requisition(),
                ..Default::default()
            })
        }));

        let variables = json!({
          "input": {
            "id": "id input",
            "responseRequisitionId": "req1",
            "otherPartyId": "other party input",
            "comment": "comment input"
          },
          "storeId": "store_a"
        });

        let expected = json!({
            "insertFromResponseRequisition": {
                "id": mock_request_draft_requisition().id
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
