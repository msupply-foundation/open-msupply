use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{OtherPartyNotACustomer, OtherPartyNotVisible},
    standard_graphql_error::validate_auth,
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};
use graphql_types::types::RequisitionNode;
use repository::Requisition;
use service::{
    auth::{Resource, ResourceAccessRequest},
    requisition::response_requisition::{
        InsertResponseRequisition as ServiceInput, InsertResponseRequisitionError as ServiceError,
    },
};

#[derive(InputObject)]
#[graphql(name = "InsertResponseRequisitionInput")]
pub struct InsertInput {
    pub id: String,
    pub other_party_id: String,
    pub max_months_of_stock: f64,
    pub min_months_of_stock: f64,
}

#[derive(Interface)]
#[graphql(name = "InsertResponseRequisitionErrorInterface")]
#[graphql(field(name = "description", ty = "String"))]
pub enum InsertErrorInterface {
    OtherPartyNotVisible(OtherPartyNotVisible),
    OtherPartyNotACustomer(OtherPartyNotACustomer),
}

#[derive(SimpleObject)]
#[graphql(name = "InsertResponseRequisitionError")]
pub struct InsertError {
    pub error: InsertErrorInterface,
}

#[derive(Union)]
#[graphql(name = "InsertResponseRequisitionResponse")]
pub enum InsertResponse {
    Error(InsertError),
    Response(RequisitionNode),
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
            .requisition_service
            .insert_response_requisition(&service_context, input.to_domain()),
    )
}

pub fn map_response(from: Result<Requisition, ServiceError>) -> Result<InsertResponse> {
    let result = match from {
        Ok(requisition) => InsertResponse::Response(RequisitionNode::from_domain(requisition)),
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
            other_party_id,
            max_months_of_stock,
            min_months_of_stock,
        } = self;

        ServiceInput {
            id,
            other_party_id,
            max_months_of_stock,
            min_months_of_stock,
        }
    }
}

pub fn map_error(error: ServiceError) -> Result<InsertErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::OtherPartyNotACustomer => {
            return Ok(InsertErrorInterface::OtherPartyNotACustomer(
                OtherPartyNotACustomer,
            ))
        }
        ServiceError::OtherPartyNotVisible => {
            return Ok(InsertErrorInterface::OtherPartyNotVisible(
                OtherPartyNotVisible,
            ))
        }
        // Standard Graphql Errors
        ServiceError::RequisitionAlreadyExists => BadUserInput(formatted_error),
        ServiceError::OtherPartyDoesNotExist => BadUserInput(formatted_error),
        ServiceError::NewlyCreatedRequisitionDoesNotExist => InternalError(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

#[cfg(test)]
mod test {
    use async_graphql::EmptyMutation;
    use chrono::NaiveDate;
    use graphql_core::{
        assert_graphql_query, assert_standard_graphql_error, test_helpers::setup_graphql_test,
    };
    use repository::{
        mock::MockDataInserts, Requisition, RequisitionRow, RequisitionStatus, RequisitionType,
        StorageConnectionManager,
    };
    use serde_json::json;
    use service::{
        requisition::{
            response_requisition::{
                InsertResponseRequisition as ServiceInput,
                InsertResponseRequisitionError as ServiceError,
            },
            RequisitionServiceTrait,
        },
        service_provider::{ServiceContext, ServiceProvider},
    };
    use util::inline_init;

    use crate::RequisitionMutations;

    type InsertLineMethod = dyn Fn(ServiceInput) -> Result<Requisition, ServiceError> + Sync + Send;

    pub struct TestService(pub Box<InsertLineMethod>);

    impl RequisitionServiceTrait for TestService {
        fn insert_response_requisition(
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
            "otherPartyId": "n/a",
            "maxMonthsOfStock": 0,
            "minMonthsOfStock": 0
          },
          "storeId": "n/a"
        })
    }

    #[actix_rt::test]
    async fn test_graphql_insert_response_requisition_errors() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            RequisitionMutations,
            "test_graphql_insert_response_requisition_structured_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: InsertResponseRequisitionInput!, $storeId: String) {
            insertResponseRequisition(storeId: $storeId, input: $input) {
              ... on InsertResponseRequisitionError {
                error {
                  __typename
                }
              }
            }
          }
        "#;

        // OtherPartyNotACustomer
        let test_service = TestService(Box::new(|_| Err(ServiceError::OtherPartyNotACustomer)));

        let expected = json!({
            "insertResponseRequisition": {
              "error": {
                "__typename": "OtherPartyNotACustomer"
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
    async fn test_graphql_insert_response_requisition_success() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            RequisitionMutations,
            "test_graphql_insert_response_requisition_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($storeId: String, $input: InsertResponseRequisitionInput!) {
            insertResponseRequisition(storeId: $storeId, input: $input) {
                ... on RequisitionNode {
                    id
                }
            }
          }
        "#;

        fn mock_response_draft_requisition() -> RequisitionRow {
            inline_init(|r: &mut RequisitionRow| {
                r.id = "mock_response_draft_requisition".to_string();
                r.requisition_number = 1;
                r.name_link_id = "name_b".to_string();
                r.store_id = "store_a".to_string();
                r.r#type = RequisitionType::Response;
                r.status = RequisitionStatus::Draft;
                r.created_datetime = NaiveDate::from_ymd_opt(2021, 1, 1)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap();
                r.max_months_of_stock = 1.0;
                r.min_months_of_stock = 0.9;
            })
        }

        // Success
        let test_service = TestService(Box::new(|input| {
            assert_eq!(
                input,
                ServiceInput {
                    id: "id input".to_string(),
                    other_party_id: "other party input".to_string(),
                    max_months_of_stock: 1.0,
                    min_months_of_stock: 2.0,
                }
            );
            Ok(inline_init(|r: &mut Requisition| {
                r.requisition_row = mock_response_draft_requisition()
            }))
        }));

        let variables = json!({
          "input": {
            "id": "id input",
            "otherPartyId": "other party input",
            "maxMonthsOfStock": 1,
            "minMonthsOfStock": 2,
          },
          "storeId": "store_a"
        });

        let expected = json!({
            "insertResponseRequisition": {
                "id": mock_response_draft_requisition().id
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
