use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{CannotEditRequisition, ForeignKey, ForeignKeyError, RecordNotFound},
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::{generic_errors::RequisitionReasonNotProvided, types::RequisitionLineNode};
use service::{
    auth::{Resource, ResourceAccessRequest},
    requisition_line::response_requisition_line::{
        UpdateResponseRequisitionLine as ServiceInput,
        UpdateResponseRequisitionLineError as ServiceError,
    },
};

#[derive(InputObject)]
#[graphql(name = "UpdateResponseRequisitionLineInput")]
pub struct UpdateInput {
    pub id: String,
    pub supply_quantity: Option<f64>,
    pub comment: Option<String>,
    // Manual Requisition fields
    pub requested_quantity: Option<f64>,
    pub stock_on_hand: Option<f64>,
    pub initial_stock_on_hand: Option<f64>,
    pub average_monthly_consumption: Option<f64>,
    pub incoming_units: Option<f64>,
    pub outgoing_units: Option<f64>,
    pub loss_in_units: Option<f64>,
    pub addition_in_units: Option<f64>,
    pub expiring_units: Option<f64>,
    pub days_out_of_stock: Option<f64>,
    pub option_id: Option<String>,
}

#[derive(Interface)]
#[graphql(name = "UpdateResponseRequisitionLineErrorInterface")]
#[graphql(field(name = "description", ty = "String"))]
pub enum UpdateErrorInterface {
    RecordNotFound(RecordNotFound),
    RequisitionDoesNotExist(ForeignKeyError),
    ReasonNotProvided(RequisitionReasonNotProvided),
    CannotEditRequisition(CannotEditRequisition),
}

#[derive(SimpleObject)]
#[graphql(name = "UpdateResponseRequisitionLineError")]
pub struct UpdateError {
    pub error: UpdateErrorInterface,
}

#[derive(Union)]
#[graphql(name = "UpdateResponseRequisitionLineResponse")]
pub enum UpdateResponse {
    Error(UpdateError),
    Response(RequisitionLineNode),
}
pub fn update(ctx: &Context<'_>, store_id: &str, input: UpdateInput) -> Result<UpdateResponse> {
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
        .requisition_line_service
        .update_response_requisition_line(&service_context, input.to_domain())
    {
        Ok(requisition_line) => {
            UpdateResponse::Response(RequisitionLineNode::from_domain(requisition_line))
        }
        Err(error) => UpdateResponse::Error(UpdateError {
            error: map_error(error)?,
        }),
    };

    Ok(response)
}

impl UpdateInput {
    pub fn to_domain(self) -> ServiceInput {
        let UpdateInput {
            id,
            supply_quantity,
            requested_quantity,
            stock_on_hand,
            initial_stock_on_hand,
            comment,
            average_monthly_consumption,
            incoming_units,
            outgoing_units,
            loss_in_units,
            addition_in_units,
            expiring_units,
            days_out_of_stock,
            option_id,
        } = self;

        ServiceInput {
            id,
            supply_quantity,
            requested_quantity,
            stock_on_hand,
            initial_stock_on_hand,
            comment,
            average_monthly_consumption,
            incoming_units,
            outgoing_units,
            loss_in_units,
            addition_in_units,
            expiring_units,
            days_out_of_stock,
            option_id,
        }
    }
}

fn map_error(error: ServiceError) -> Result<UpdateErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::RequisitionLineDoesNotExist => {
            return Ok(UpdateErrorInterface::RecordNotFound(RecordNotFound {}))
        }
        ServiceError::RequisitionDoesNotExist => {
            return Ok(UpdateErrorInterface::RequisitionDoesNotExist(
                ForeignKeyError(ForeignKey::RequisitionId),
            ))
        }
        ServiceError::CannotEditRequisition => {
            return Ok(UpdateErrorInterface::CannotEditRequisition(
                CannotEditRequisition {},
            ))
        }
        ServiceError::ReasonNotProvided(line) => {
            return Ok(UpdateErrorInterface::ReasonNotProvided(
                RequisitionReasonNotProvided::from_domain(line),
            ));
        }
        // Standard Graphql Errors
        ServiceError::NotThisStoreRequisition => BadUserInput(formatted_error),
        ServiceError::NotAResponseRequisition => BadUserInput(formatted_error),
        ServiceError::UpdatedRequisitionLineDoesNotExist => InternalError(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

#[cfg(test)]
mod test {
    use crate::RequisitionLineMutations;
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
        requisition_line::{
            response_requisition_line::{
                UpdateResponseRequisitionLine as ServiceInput,
                UpdateResponseRequisitionLineError as ServiceError,
            },
            RequisitionLineServiceTrait,
        },
        service_provider::{ServiceContext, ServiceProvider},
    };

    type UpdateLineMethod =
        dyn Fn(ServiceInput) -> Result<RequisitionLine, ServiceError> + Sync + Send;

    pub struct TestService(pub Box<UpdateLineMethod>);

    impl RequisitionLineServiceTrait for TestService {
        fn update_response_requisition_line(
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
        let mut service_provider = ServiceProvider::new(connection_manager.clone());
        service_provider.requisition_line_service = Box::new(test_service);
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
    async fn test_graphql_update_response_requisition_line_errors() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            RequisitionLineMutations,
            "test_graphql_update_response_requisition_line_structured_errors",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($input: UpdateResponseRequisitionLineInput!, $storeId: String) {
            updateResponseRequisitionLine(storeId: $storeId, input: $input) {
              ... on UpdateResponseRequisitionLineError {
                error {
                  __typename
                }
              }
            }
          }
        "#;

        // RecordNotFound
        let test_service =
            TestService(Box::new(|_| Err(ServiceError::RequisitionLineDoesNotExist)));

        let expected = json!({
            "updateResponseRequisitionLine": {
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

        // RequisitionDoesNotExist
        let test_service = TestService(Box::new(|_| Err(ServiceError::RequisitionDoesNotExist)));

        let expected = json!({
            "updateResponseRequisitionLine": {
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

        // CannotEditRequisition
        let test_service = TestService(Box::new(|_| Err(ServiceError::CannotEditRequisition)));

        let expected = json!({
            "updateResponseRequisitionLine": {
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

        // UpdatedRequisitionLineDoesNotExist
        let test_service = TestService(Box::new(|_| {
            Err(ServiceError::UpdatedRequisitionLineDoesNotExist)
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
    async fn test_graphql_update_response_requisition_line_success() {
        let (_, _, connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            RequisitionLineMutations,
            "test_graphql_update_response_requisition_line_success",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation ($storeId: String, $input: UpdateResponseRequisitionLineInput!) {
            updateResponseRequisitionLine(storeId: $storeId, input: $input) {
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
                    id: "update line id input".to_string(),
                    supply_quantity: Some(1.0),
                    requested_quantity: None,
                    stock_on_hand: None,
                    comment: Some("comment".to_string()),
                    ..Default::default()
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
            "id": "update line id input",
            "supplyQuantity": 1,
            "requestedQuantity": null,
            "stockOnHand": null,
            "comment": "comment",
            "averageMonthlyConsumption": null,
            "incomingUnits": null,
            "outgoingUnits": null,
            "lossInUnits": null,
            "additionInUnits": null,
            "expiringUnits": null,
            "daysOutOfStock": null,
            "optionId": null
          },
          "storeId": "store_a"
        });

        let expected = json!({
            "updateResponseRequisitionLine": {
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
