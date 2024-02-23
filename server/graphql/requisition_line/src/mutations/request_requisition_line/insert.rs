use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{CannotEditRequisition, ForeignKey, ForeignKeyError},
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::RequisitionLineNode;
use repository::RequisitionLine;
use service::{
    auth::{Resource, ResourceAccessRequest},
    requisition_line::request_requisition_line::{
        InsertRequestRequisitionLine as ServiceInput,
        InsertRequestRequisitionLineError as ServiceError,
    },
};

#[derive(InputObject)]
#[graphql(name = "InsertRequestRequisitionLineInput")]
pub struct InsertInput {
    pub id: String,
    pub item_id: String,
    pub requisition_id: String,
    pub requested_quantity: Option<u32>,
    pub comment: Option<String>,
}

#[derive(Interface)]
#[graphql(name = "InsertRequestRequisitionLineErrorInterface")]
#[graphql(field(name = "description", type = "String"))]
pub enum InsertErrorInterface {
    RequisitionDoesNotExist(ForeignKeyError),
    CannotEditRequisition(CannotEditRequisition),
    RequisitionLineWithItemIdExists(RequisitionLineWithItemIdExists),
}

#[derive(SimpleObject)]
#[graphql(name = "InsertRequestRequisitionLineError")]
pub struct InsertError {
    pub error: InsertErrorInterface,
}

#[derive(Union)]
#[graphql(name = "InsertRequestRequisitionLineResponse")]
pub enum InsertResponse {
    Error(InsertError),
    Response(RequisitionLineNode),
}
pub fn insert(ctx: &Context<'_>, store_id: &str, input: InsertInput) -> Result<InsertResponse> {
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
            .requisition_line_service
            .insert_request_requisition_line(&service_context, input.to_domain()),
    )
}

pub fn map_response(from: Result<RequisitionLine, ServiceError>) -> Result<InsertResponse> {
    let result = match from {
        Ok(requisition_line) => {
            InsertResponse::Response(RequisitionLineNode::from_domain(requisition_line))
        }
        Err(error) => InsertResponse::Error(InsertError {
            error: map_error(error)?,
        }),
    };

    Ok(result)
}

impl InsertInput {
    pub fn to_domain(self) -> ServiceInput {
        let InsertInput {
            id,
            item_id,
            requisition_id,
            requested_quantity,
            comment,
        } = self;

        ServiceInput {
            id,
            item_id,
            requisition_id,
            requested_quantity,
            comment,
        }
    }
}

fn map_error(error: ServiceError) -> Result<InsertErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::ItemAlreadyExistInRequisition => {
            return Ok(InsertErrorInterface::RequisitionLineWithItemIdExists(
                RequisitionLineWithItemIdExists {},
            ))
        }
        ServiceError::RequisitionDoesNotExist => {
            return Ok(InsertErrorInterface::RequisitionDoesNotExist(
                ForeignKeyError(ForeignKey::RequisitionId),
            ))
        }
        ServiceError::CannotEditRequisition => {
            return Ok(InsertErrorInterface::CannotEditRequisition(
                CannotEditRequisition {},
            ))
        }
        // Standard Graphql Errors
        ServiceError::RequisitionLineAlreadyExists => BadUserInput(formatted_error),
        ServiceError::NotThisStoreRequisition => BadUserInput(formatted_error),
        ServiceError::NotARequestRequisition => BadUserInput(formatted_error),
        ServiceError::ItemDoesNotExist => BadUserInput(formatted_error),
        ServiceError::CannotAddItemToProgramRequisition => BadUserInput(formatted_error),
        ServiceError::CannotFindItemStatusForRequisitionLine => InternalError(formatted_error),
        ServiceError::NewlyCreatedRequisitionLineDoesNotExist => InternalError(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
pub struct RequisitionLineWithItemIdExists;
#[Object]
impl RequisitionLineWithItemIdExists {
    pub async fn description(&self) -> &'static str {
        "Requisition line already exists for this item"
    }
}

#[cfg(test)]
mod test {
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
        requisition_line::{
            request_requisition_line::{
                InsertRequestRequisitionLine as ServiceInput,
                InsertRequestRequisitionLineError as ServiceError,
            },
            RequisitionLineServiceTrait,
        },
        service_provider::{ServiceContext, ServiceProvider},
    };

    use crate::RequisitionLineMutations;

    type InsertLineMethod =
        dyn Fn(ServiceInput) -> Result<RequisitionLine, ServiceError> + Sync + Send;

    pub struct TestService(pub Box<InsertLineMethod>);

    impl RequisitionLineServiceTrait for TestService {
        fn insert_request_requisition_line(
            &self,
            _: &ServiceContext,
            input: ServiceInput,
        ) -> Result<RequisitionLine, ServiceError> {
            self.0(input)
        }
    }

    fn service_provider(
        test_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone(), "app_data");
        service_provider.requisition_line_service = Box::new(test_service);
        service_provider
    }

    fn empty_variables() -> serde_json::Value {
        json!({
          "input": {
            "id": "n/a",
            "requisitionId": "n/a",
            "itemId": "n/a"
          },
          "storeId": "n/a"
        })
    }

    #[actix_rt::test]
    async fn test_graphql_insert_request_requisition_line_errors() {
        let (_, _, connection_manager, settings) = setup_graphl_test(
            EmptyMutation,
            RequisitionLineMutations,
            "test_graphql_insert_request_requisition_line_structured_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: InsertRequestRequisitionLineInput!, $storeId: String) {
            insertRequestRequisitionLine(storeId: $storeId, input: $input) {
              ... on InsertRequestRequisitionLineError {
                error {
                  __typename
                }
              }
            }
          }
        "#;

        // RequisitionLineWithItemIdExists
        let test_service = TestService(Box::new(|_| {
            Err(ServiceError::ItemAlreadyExistInRequisition)
        }));

        let expected = json!({
            "insertRequestRequisitionLine": {
              "error": {
                "__typename": "RequisitionLineWithItemIdExists"
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
            "insertRequestRequisitionLine": {
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

        // RequisitionDoesNotExist
        let test_service = TestService(Box::new(|_| Err(ServiceError::RequisitionDoesNotExist)));

        let expected = json!({
            "insertRequestRequisitionLine": {
              "error": {
                "__typename": "ForeignKeyError"
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

        // RequisitionLineAlreadyExists
        let test_service = TestService(Box::new(|_| {
            Err(ServiceError::RequisitionLineAlreadyExists)
        }));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables()),
            &expected_message,
            None,
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

        // ItemDoesNotExist
        let test_service = TestService(Box::new(|_| Err(ServiceError::ItemDoesNotExist)));
        let expected_message = "Bad user input";
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &Some(empty_variables()),
            &expected_message,
            None,
            Some(service_provider(test_service, &connection_manager))
        );

        // CannotFindItemStatusForRequisitionLine
        let test_service = TestService(Box::new(|_| {
            Err(ServiceError::CannotFindItemStatusForRequisitionLine)
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

        // NewlyCreatedRequisitionLineDoesNotExist
        let test_service = TestService(Box::new(|_| {
            Err(ServiceError::NewlyCreatedRequisitionLineDoesNotExist)
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
    async fn test_graphql_insert_request_requisition_line_success() {
        let (_, _, connection_manager, settings) = setup_graphl_test(
            EmptyMutation,
            RequisitionLineMutations,
            "test_graphql_insert_request_requisition_line_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($storeId: String, $input: InsertRequestRequisitionLineInput!) {
            insertRequestRequisitionLine(storeId: $storeId, input: $input) {
                ... on RequisitionLineNode {
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
                    id: "new line id input".to_string(),
                    item_id: mock_item_a().id,
                    requisition_id: "requisition id input".to_string(),
                    requested_quantity: Some(1),
                    comment: Some("comment".to_string())
                }
            );
            Ok(RequisitionLine {
                requisition_row: mock_request_draft_requisition(),
                requisition_line_row: mock_sent_request_requisition_line(),
                item_row: mock_item_a(),
            })
        }));

        let variables = json!({
          "input": {
            "id": "new line id input",
            "requisitionId": "requisition id input",
            "itemId": "item_a",
            "requestedQuantity": 1,
            "comment": "comment"
          },
          "storeId": "store_a"
        });

        let expected = json!({
            "insertRequestRequisitionLine": {
                "id": mock_sent_request_requisition_line().id
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
