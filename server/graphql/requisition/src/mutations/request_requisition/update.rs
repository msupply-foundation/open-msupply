use async_graphql::*;
use chrono::NaiveDate;
use graphql_core::{
    simple_generic_errors::{
        CannotEditRequisition, OtherPartyNotASupplier, OtherPartyNotVisible, RecordNotFound,
    },
    standard_graphql_error::validate_auth,
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};
use graphql_types::types::RequisitionNode;
use repository::Requisition;
use service::{
    auth::{Resource, ResourceAccessRequest},
    requisition::request_requisition::{
        UpdateRequestRequisition as ServiceInput, UpdateRequestRequisitionError as ServiceError,
        UpdateRequestRequisitionStatus,
    },
};

#[derive(InputObject)]
#[graphql(name = "UpdateRequestRequisitionInput")]
pub struct UpdateInput {
    pub id: String,
    pub colour: Option<String>,
    pub their_reference: Option<String>,
    pub comment: Option<String>,
    pub max_months_of_stock: Option<f64>,
    pub min_months_of_stock: Option<f64>,
    pub status: Option<UpdateRequestRequisitionStatusInput>,
    pub other_party_id: Option<String>,
    pub expected_delivery_date: Option<NaiveDate>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug)]
pub enum UpdateRequestRequisitionStatusInput {
    Sent,
}

#[derive(Interface)]
#[graphql(name = "UpdateRequestRequisitionErrorInterface")]
#[graphql(field(name = "description", type = "String"))]
pub enum UpdateErrorInterface {
    OtherPartyNotVisible(OtherPartyNotVisible),
    OtherPartyNotASupplier(OtherPartyNotASupplier),
    RecordNotFound(RecordNotFound),
    CannotEditRequisition(CannotEditRequisition),
}

#[derive(SimpleObject)]
#[graphql(name = "UpdateRequestRequisitionError")]
pub struct UpdateError {
    pub error: UpdateErrorInterface,
}

#[derive(Union)]
#[graphql(name = "UpdateRequestRequisitionResponse")]
pub enum UpdateResponse {
    Error(UpdateError),
    Response(RequisitionNode),
}

pub fn update(ctx: &Context<'_>, store_id: &str, input: UpdateInput) -> Result<UpdateResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateRequisition,
            store_id: Some(store_id.to_string()),
        },
    )?;

    if input.status == Some(UpdateRequestRequisitionStatusInput::Sent) {
        validate_auth(
            ctx,
            &ResourceAccessRequest {
                resource: Resource::RequisitionSend,
                store_id: Some(store_id.to_string()),
            },
        )?;
    }

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    map_response(
        service_provider
            .requisition_service
            .update_request_requisition(&service_context, input.to_domain()),
    )
}

pub fn map_response(from: Result<Requisition, ServiceError>) -> Result<UpdateResponse> {
    let result = match from {
        Ok(requisition) => UpdateResponse::Response(RequisitionNode::from_domain(requisition)),
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
            colour,
            their_reference,
            comment,
            max_months_of_stock,
            min_months_of_stock,
            status,
            other_party_id,
            expected_delivery_date,
        } = self;

        ServiceInput {
            id,
            colour,
            their_reference,
            comment,
            max_months_of_stock,
            min_months_of_stock,
            status: status.map(|status| status.to_domain()),
            other_party_id,
            expected_delivery_date,
        }
    }
}

fn map_error(error: ServiceError) -> Result<UpdateErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::RequisitionDoesNotExist => {
            return Ok(UpdateErrorInterface::RecordNotFound(RecordNotFound))
        }
        ServiceError::CannotEditRequisition => {
            return Ok(UpdateErrorInterface::CannotEditRequisition(
                CannotEditRequisition,
            ))
        }
        ServiceError::OtherPartyNotASupplier => {
            return Ok(UpdateErrorInterface::OtherPartyNotASupplier(
                OtherPartyNotASupplier,
            ))
        }
        ServiceError::OtherPartyNotVisible => {
            return Ok(UpdateErrorInterface::OtherPartyNotVisible(
                OtherPartyNotVisible,
            ))
        }
        // Standard Graphql Errors
        ServiceError::NotThisStoreRequisition => BadUserInput(formatted_error),
        ServiceError::NotARequestRequisition => BadUserInput(formatted_error),
        ServiceError::OtherPartyDoesNotExist => BadUserInput(formatted_error),
        ServiceError::OtherPartyIsNotAStore => BadUserInput(formatted_error),
        ServiceError::CannotEditProgramRequisitionInformation => BadUserInput(formatted_error),
        ServiceError::UpdatedRequisitionDoesNotExist => InternalError(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

impl UpdateRequestRequisitionStatusInput {
    pub fn to_domain(self) -> UpdateRequestRequisitionStatus {
        use UpdateRequestRequisitionStatusInput::*;
        match self {
            Sent => UpdateRequestRequisitionStatus::Sent,
        }
    }
}

#[cfg(test)]
mod test {
    use async_graphql::EmptyMutation;
    use chrono::NaiveDate;
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
                UpdateRequestRequisition as ServiceInput,
                UpdateRequestRequisitionError as ServiceError, UpdateRequestRequisitionStatus,
            },
            RequisitionServiceTrait,
        },
        service_provider::{ServiceContext, ServiceProvider},
    };
    use util::inline_init;

    use crate::RequisitionMutations;

    type UpdateLineMethod = dyn Fn(ServiceInput) -> Result<Requisition, ServiceError> + Sync + Send;

    pub struct TestService(pub Box<UpdateLineMethod>);

    impl RequisitionServiceTrait for TestService {
        fn update_request_requisition(
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
    async fn test_graphql_update_request_requisition_errors() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            RequisitionMutations,
            "test_graphql_update_request_requisition_structured_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: UpdateRequestRequisitionInput!, $storeId: String) {
            updateRequestRequisition(storeId: $storeId, input: $input) {
              ... on UpdateRequestRequisitionError {
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
            "updateRequestRequisition": {
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
            "updateRequestRequisition": {
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

        // UpdatedRequisitionDoesNotExist
        let test_service = TestService(Box::new(|_| {
            Err(ServiceError::UpdatedRequisitionDoesNotExist)
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

        // OtherPartyNotASupplier
        let test_service = TestService(Box::new(|_| Err(ServiceError::OtherPartyNotASupplier)));

        let expected = json!({
            "updateRequestRequisition": {
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
    }

    #[actix_rt::test]
    async fn test_graphql_update_request_requisition_success() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            RequisitionMutations,
            "test_graphql_update_request_requisition_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($storeId: String, $input: UpdateRequestRequisitionInput!) {
            updateRequestRequisition(storeId: $storeId, input: $input) {
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
                    colour: Some("colour input".to_string()),
                    their_reference: Some("reference input".to_string()),
                    comment: Some("comment input".to_string()),
                    max_months_of_stock: Some(1.0),
                    min_months_of_stock: Some(2.0),
                    other_party_id: Some("other_party_id".to_string()),
                    status: Some(UpdateRequestRequisitionStatus::Sent),
                    expected_delivery_date: Some(NaiveDate::from_ymd_opt(2022, 1, 3).unwrap())
                }
            );
            Ok(inline_init(|r: &mut Requisition| {
                r.requisition_row = mock_request_draft_requisition()
            }))
        }));

        let variables = json!({
          "input": {
            "id": "id input",
            "maxMonthsOfStock": 1,
            "minMonthsOfStock": 2,
            "colour": "colour input",
            "theirReference": "reference input",
            "comment": "comment input",
            "status": "SENT",
            "otherPartyId": "other_party_id",
            "expectedDeliveryDate": "2022-01-03"
          },
          "storeId": "store_a"
        });

        let expected = json!({
            "updateRequestRequisition": {
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
