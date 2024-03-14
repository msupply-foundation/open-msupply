use async_graphql::*;
use chrono::NaiveDate;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::RequisitionNode;
use repository::Requisition;
use service::{
    auth::{Resource, ResourceAccessRequest},
    requisition::request_requisition::{
        InsertProgramRequestRequisition, InsertProgramRequestRequisitionError as ServiceError,
    },
};
use util::{constants::expected_delivery_date_offset, date_now_with_offset};

#[derive(InputObject)]
#[graphql(name = "InsertProgramRequestRequisitionInput")]
pub struct InsertProgramRequestRequisitionInput {
    pub id: String,
    pub other_party_id: String,
    pub colour: Option<String>,
    pub their_reference: Option<String>,
    pub comment: Option<String>,
    pub program_order_type_id: String,
    pub period_id: String,
    /// Defaults to 2 weeks from now
    pub expected_delivery_date: Option<NaiveDate>,
}

#[derive(Interface)]
#[graphql(name = "InsertProgramRequestRequisitionErrorInterface")]
#[graphql(field(name = "description", type = "String"))]
pub enum InsertErrorInterface {
    MaxOrdersReachedForPeriod(MaxOrdersReachedForPeriod),
}

#[derive(SimpleObject)]
#[graphql(name = "InsertProgramRequestRequisitionError")]
pub struct InsertError {
    pub error: InsertErrorInterface,
}

#[derive(Union)]
#[graphql(name = "InsertProgramRequestRequisitionResponse")]
pub enum InsertResponse {
    Error(InsertError),
    Response(RequisitionNode),
}

pub fn insert_program(
    ctx: &Context<'_>,
    store_id: &str,
    input: InsertProgramRequestRequisitionInput,
) -> Result<InsertResponse> {
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
            .insert_program_request_requisition(&service_context, input.to_domain()),
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

pub fn map_error(error: ServiceError) -> Result<InsertErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::MaxOrdersReachedForPeriod => {
            return Ok(InsertErrorInterface::MaxOrdersReachedForPeriod(
                MaxOrdersReachedForPeriod,
            ))
        }
        // Standard Graphql Errors
        ServiceError::RequisitionAlreadyExists => BadUserInput(formatted_error),
        ServiceError::SupplierNotValid => BadUserInput(formatted_error),
        ServiceError::ProgramOrderTypeDoesNotExist => BadUserInput(formatted_error),

        ServiceError::NewlyCreatedRequisitionDoesNotExist => InternalError(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

impl InsertProgramRequestRequisitionInput {
    pub fn to_domain(self) -> InsertProgramRequestRequisition {
        let InsertProgramRequestRequisitionInput {
            id,
            other_party_id,
            colour,
            their_reference,
            comment,
            expected_delivery_date,
            program_order_type_id,
            period_id,
        } = self;

        InsertProgramRequestRequisition {
            id,
            other_party_id,
            colour,
            their_reference,
            comment,
            expected_delivery_date: expected_delivery_date
                .or(Some(date_now_with_offset(expected_delivery_date_offset()))),
            program_order_type_id,
            period_id,
        }
    }
}

pub struct MaxOrdersReachedForPeriod;

#[Object]
impl MaxOrdersReachedForPeriod {
    pub async fn description(&self) -> &'static str {
        "Maximum orders reached for program, order type and period"
    }
}

#[cfg(test)]
mod test {
    use async_graphql::EmptyMutation;
    use chrono::NaiveDate;
    use graphql_core::{assert_graphql_query, test_helpers::setup_graphql_test};
    use repository::{
        mock::{mock_program_request_draft_requisition, MockDataInserts},
        Requisition, StorageConnectionManager,
    };
    use serde_json::json;
    use service::{
        requisition::{
            request_requisition::{
                InsertProgramRequestRequisition,
                InsertProgramRequestRequisitionError as ServiceError,
            },
            RequisitionServiceTrait,
        },
        service_provider::{ServiceContext, ServiceProvider},
    };
    use util::inline_init;

    use crate::RequisitionMutations;

    type InsertLineMethod =
        dyn Fn(InsertProgramRequestRequisition) -> Result<Requisition, ServiceError> + Sync + Send;

    pub struct TestService(pub Box<InsertLineMethod>);

    impl RequisitionServiceTrait for TestService {
        fn insert_program_request_requisition(
            &self,
            _: &ServiceContext,
            input: InsertProgramRequestRequisition,
        ) -> Result<Requisition, ServiceError> {
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

    #[actix_rt::test]
    async fn test_graphql_insert_program_request_requisition_success() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            RequisitionMutations,
            "test_graphql_insert_program_request_requisition_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($storeId: String, $input: InsertProgramRequestRequisitionInput!) {
            insertProgramRequestRequisition(storeId: $storeId, input: $input) {
              ... on InsertProgramRequestRequisitionError {
                error {
                  __typename
                }
              }
            }
          }
        "#;

        // MaxOrdersReachedForPeriod
        let test_service = TestService(Box::new(|_| Err(ServiceError::MaxOrdersReachedForPeriod)));

        let expected = json!({
            "insertProgramRequestRequisition": {
              "error": {
                "__typename": "MaxOrdersReachedForPeriod"
              }
            }
          }
        );

        assert_graphql_query!(
            &settings,
            mutation,
            &Some(json!({
              "input": {
                "id": "id input",
                "otherPartyId": "other party input",
                "programOrderTypeId": "program_order_type_id",
                "periodId": "period_id",
              },
              "storeId": "store_a"
            })),
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );

        let mutation = r#"
        mutation ($storeId: String, $input: InsertProgramRequestRequisitionInput!) {
            insertProgramRequestRequisition(storeId: $storeId, input: $input) {
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
                InsertProgramRequestRequisition {
                    id: "id input".to_string(),
                    other_party_id: "other party input".to_string(),
                    colour: Some("colour input".to_string()),
                    their_reference: Some("reference input".to_string()),
                    comment: Some("comment input".to_string()),
                    expected_delivery_date: Some(NaiveDate::from_ymd_opt(2022, 01, 03).unwrap()),
                    program_order_type_id: "program_order_type_id".to_string(),
                    period_id: "period_id".to_string(),
                }
            );
            Ok(inline_init(|r: &mut Requisition| {
                r.requisition_row = mock_program_request_draft_requisition()
            }))
        }));

        let variables = json!({
          "input": {
            "id": "id input",
            "otherPartyId": "other party input",
            "colour": "colour input",
            "theirReference": "reference input",
            "comment": "comment input",
            "expectedDeliveryDate": "2022-01-03",
            "programOrderTypeId": "program_order_type_id",
            "periodId": "period_id",
          },
          "storeId": "store_a"
        });

        let expected = json!({
            "insertProgramRequestRequisition": {
                "id": mock_program_request_draft_requisition().id
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
