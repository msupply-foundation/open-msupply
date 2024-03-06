use async_graphql::*;
use graphql_core::standard_graphql_error::validate_auth;
use graphql_core::ContextExt;
use graphql_invoice::mutations::inbound_shipment;
use graphql_invoice_line::mutations::inbound_shipment_line;
use service::auth::Resource;
use service::auth::ResourceAccessRequest;
use service::invoice::inbound_shipment::*;

use crate::to_standard_error;
use crate::VecOrNone;

type ServiceInput = BatchInboundShipment;
type ServiceResult = BatchInboundShipmentResult;

#[derive(SimpleObject)]
#[graphql(concrete(
    name = "InsertInboundShipmentResponseWithId",
    params(inbound_shipment::insert::InsertResponse)
))]
#[graphql(concrete(
    name = "UpdateInboundShipmentResponseWithId",
    params(inbound_shipment::update::UpdateResponse)
))]
#[graphql(concrete(
    name = "DeleteInboundShipmentResponseWithId",
    params(inbound_shipment::delete::DeleteResponse)
))]
#[graphql(concrete(
    name = "InsertInboundShipmentLineResponseWithId",
    params(inbound_shipment_line::line::insert::InsertResponse)
))]
#[graphql(concrete(
    name = "UpdateInboundShipmentLineResponseWithId",
    params(inbound_shipment_line::line::update::UpdateResponse)
))]
#[graphql(concrete(
    name = "DeleteInboundShipmentLineResponseWithId",
    params(inbound_shipment_line::line::delete::DeleteResponse)
))]
#[graphql(concrete(
    name = "InsertInboundShipmentServiceLineResponseWithId",
    params(inbound_shipment_line::service_line::insert::InsertResponse)
))]
#[graphql(concrete(
    name = "UpdateInboundShipmentServiceLineResponseWithId",
    params(inbound_shipment_line::service_line::update::UpdateResponse)
))]
#[graphql(concrete(
    name = "DeleteInboundShipmentServiceLineResponseWithId",
    params(inbound_shipment_line::service_line::delete::DeleteResponse)
))]
#[graphql(concrete(
    name = "ZeroInboundShipmentLineQuantityResponseWithId",
    params(
        inbound_shipment_line::line::zero_line_quantity::ZeroInboundShipmentLineQuantityResponse
    )
))]

pub struct MutationWithId<T: OutputType> {
    pub id: String,
    pub response: T,
}

type InsertShipmentsResponse =
    Option<Vec<MutationWithId<inbound_shipment::insert::InsertResponse>>>;
type InsertShipmentLinesResponse =
    Option<Vec<MutationWithId<inbound_shipment_line::line::insert::InsertResponse>>>;
type UpdateShipmentLinesResponse =
    Option<Vec<MutationWithId<inbound_shipment_line::line::update::UpdateResponse>>>;
type DeleteShipmentLinesResponse =
    Option<Vec<MutationWithId<inbound_shipment_line::line::delete::DeleteResponse>>>;
type InsertShipmentServiceLinesResponse =
    Option<Vec<MutationWithId<inbound_shipment_line::service_line::insert::InsertResponse>>>;
type UpdateShipmentServiceLinesResponse =
    Option<Vec<MutationWithId<inbound_shipment_line::service_line::update::UpdateResponse>>>;
type DeleteShipmentServiceLinesResponse =
    Option<Vec<MutationWithId<inbound_shipment_line::service_line::delete::DeleteResponse>>>;
type UpdateShipmentsResponse =
    Option<Vec<MutationWithId<inbound_shipment::update::UpdateResponse>>>;
type DeleteShipmentsResponse =
    Option<Vec<MutationWithId<inbound_shipment::delete::DeleteResponse>>>;
type ZeroLinesQuantityResponse =
    Option<Vec<MutationWithId<inbound_shipment_line::line::zero_line_quantity::ZeroInboundShipmentLineQuantityResponse>>>;

#[derive(SimpleObject)]
#[graphql(name = "BatchInboundShipmentResponse")]
pub struct BatchResponse {
    insert_inbound_shipments: InsertShipmentsResponse,
    insert_inbound_shipment_lines: InsertShipmentLinesResponse,
    update_inbound_shipment_lines: UpdateShipmentLinesResponse,
    delete_inbound_shipment_lines: DeleteShipmentLinesResponse,
    zero_lines_quantity: ZeroLinesQuantityResponse,
    insert_inbound_shipment_service_lines: InsertShipmentServiceLinesResponse,
    update_inbound_shipment_service_lines: UpdateShipmentServiceLinesResponse,
    delete_inbound_shipment_service_lines: DeleteShipmentServiceLinesResponse,
    update_inbound_shipments: UpdateShipmentsResponse,
    delete_inbound_shipments: DeleteShipmentsResponse,
}

#[derive(InputObject)]
#[graphql(name = "BatchInboundShipmentInput")]
pub struct BatchInput {
    pub insert_inbound_shipments: Option<Vec<inbound_shipment::insert::InsertInput>>,
    pub insert_inbound_shipment_lines:
        Option<Vec<inbound_shipment_line::line::insert::InsertInput>>,
    pub update_inbound_shipment_lines:
        Option<Vec<inbound_shipment_line::line::update::UpdateInput>>,
    pub delete_inbound_shipment_lines:
        Option<Vec<inbound_shipment_line::line::delete::DeleteInput>>,
    pub insert_inbound_shipment_service_lines:
        Option<Vec<inbound_shipment_line::service_line::insert::InsertInput>>,
    pub update_inbound_shipment_service_lines:
        Option<Vec<inbound_shipment_line::service_line::update::UpdateInput>>,
    pub delete_inbound_shipment_service_lines:
        Option<Vec<inbound_shipment_line::service_line::delete::DeleteInput>>,
    pub zero_lines_quantity: Option<
        Vec<inbound_shipment_line::line::zero_line_quantity::ZeroInboundShipmentLineQuantityInput>,
    >,
    pub update_inbound_shipments: Option<Vec<inbound_shipment::update::UpdateInput>>,
    pub delete_inbound_shipments: Option<Vec<inbound_shipment::delete::DeleteInput>>,
    pub continue_on_error: Option<bool>,
}

pub fn batch(ctx: &Context<'_>, store_id: &str, input: BatchInput) -> Result<BatchResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateInboundShipment,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    let response = service_provider
        .invoice_service
        .batch_inbound_shipment(&service_context, input.to_domain())?;

    Ok(BatchResponse::from_domain(response)?)
}

impl BatchInput {
    fn to_domain(self) -> ServiceInput {
        let BatchInput {
            insert_inbound_shipments,
            insert_inbound_shipment_lines,
            update_inbound_shipment_lines,
            delete_inbound_shipment_lines,
            zero_lines_quantity,
            insert_inbound_shipment_service_lines,
            update_inbound_shipment_service_lines,
            delete_inbound_shipment_service_lines,
            update_inbound_shipments,
            delete_inbound_shipments,
            continue_on_error,
        } = self;

        ServiceInput {
            insert_shipment: insert_inbound_shipments
                .map(|inputs| inputs.into_iter().map(|input| input.to_domain()).collect()),
            insert_line: insert_inbound_shipment_lines
                .map(|inputs| inputs.into_iter().map(|input| input.to_domain()).collect()),
            update_line: update_inbound_shipment_lines
                .map(|inputs| inputs.into_iter().map(|input| input.to_domain()).collect()),
            delete_line: delete_inbound_shipment_lines
                .map(|inputs| inputs.into_iter().map(|input| input.to_domain()).collect()),
            zero_lines_quantity: zero_lines_quantity
                .map(|inputs| inputs.into_iter().map(|input| input.to_domain()).collect()),
            insert_service_line: insert_inbound_shipment_service_lines
                .map(|inputs| inputs.into_iter().map(|input| input.to_domain()).collect()),
            update_service_line: update_inbound_shipment_service_lines
                .map(|inputs| inputs.into_iter().map(|input| input.to_domain()).collect()),
            delete_service_line: delete_inbound_shipment_service_lines
                .map(|inputs| inputs.into_iter().map(|input| input.to_domain()).collect()),
            update_shipment: update_inbound_shipments
                .map(|inputs| inputs.into_iter().map(|input| input.to_domain()).collect()),
            delete_shipment: delete_inbound_shipments
                .map(|inputs| inputs.into_iter().map(|input| input.to_domain()).collect()),
            continue_on_error,
        }
    }
}

impl BatchResponse {
    fn from_domain(
        ServiceResult {
            insert_shipment,
            insert_line,
            update_line,
            delete_line,
            insert_service_line,
            update_service_line,
            delete_service_line,
            zero_lines_quantity,
            update_shipment,
            delete_shipment,
        }: ServiceResult,
    ) -> Result<BatchResponse> {
        let result = BatchResponse {
            insert_inbound_shipments: map_insert_shipments(insert_shipment)?,
            insert_inbound_shipment_lines: map_insert_lines(insert_line)?,
            update_inbound_shipment_lines: map_update_lines(update_line)?,
            delete_inbound_shipment_lines: map_delete_lines(delete_line)?,
            insert_inbound_shipment_service_lines: map_insert_service_lines(insert_service_line)?,
            update_inbound_shipment_service_lines: map_update_service_lines(update_service_line)?,
            delete_inbound_shipment_service_lines: map_delete_service_lines(delete_service_line)?,
            update_inbound_shipments: map_update_shipments(update_shipment)?,
            delete_inbound_shipments: map_delete_shipments(delete_shipment)?,
            zero_lines_quantity: map_zero_lines_quantity(zero_lines_quantity)?,
        };

        Ok(result)
    }
}

fn map_insert_shipments(responses: InsertShipmentsResult) -> Result<InsertShipmentsResponse> {
    let mut result = Vec::new();
    for response in responses {
        let mapped_response = match inbound_shipment::insert::map_response(response.result) {
            Ok(response) => response,
            Err(standard_error) => return Err(to_standard_error(response.input, standard_error)),
        };
        result.push(MutationWithId {
            id: response.input.id.clone(),
            response: mapped_response,
        });
    }

    Ok(result.vec_or_none())
}

fn map_update_shipments(responses: UpdateShipmentsResult) -> Result<UpdateShipmentsResponse> {
    let mut result = Vec::new();
    for response in responses {
        let mapped_response = match inbound_shipment::update::map_response(response.result) {
            Ok(response) => response,
            Err(standard_error) => return Err(to_standard_error(response.input, standard_error)),
        };
        result.push(MutationWithId {
            id: response.input.id.clone(),
            response: mapped_response,
        });
    }

    Ok(result.vec_or_none())
}

fn map_delete_shipments(responses: DeleteShipmentsResult) -> Result<DeleteShipmentsResponse> {
    let mut result = Vec::new();
    for response in responses {
        let mapped_response = match inbound_shipment::delete::map_response(response.result) {
            Ok(response) => response,
            Err(standard_error) => return Err(to_standard_error(response.input, standard_error)),
        };
        result.push(MutationWithId {
            id: response.input.id.clone(),
            response: mapped_response,
        });
    }

    Ok(result.vec_or_none())
}

fn map_zero_lines_quantity(
    responses: ZeroLinesQuantityResult,
) -> Result<ZeroLinesQuantityResponse> {
    let mut result = Vec::new();
    for response in responses {
        let mapped_response =
            match inbound_shipment_line::line::zero_line_quantity::map_response(response.result) {
                Ok(response) => response,
                Err(standard_error) => {
                    return Err(to_standard_error(response.input, standard_error))
                }
            };
        result.push(MutationWithId {
            id: response.input.id.clone(),
            response: mapped_response,
        });
    }

    Ok(result.vec_or_none())
}

fn map_insert_lines(responses: InsertLinesResult) -> Result<InsertShipmentLinesResponse> {
    let mut result = Vec::new();
    for response in responses {
        let mapped_response =
            match inbound_shipment_line::line::insert::map_response(response.result) {
                Ok(response) => response,
                Err(standard_error) => {
                    return Err(to_standard_error(response.input, standard_error))
                }
            };
        result.push(MutationWithId {
            id: response.input.id.clone(),
            response: mapped_response,
        });
    }

    Ok(result.vec_or_none())
}

fn map_update_lines(responses: UpdateLinesResult) -> Result<UpdateShipmentLinesResponse> {
    let mut result = Vec::new();
    for response in responses {
        let mapped_response =
            match inbound_shipment_line::line::update::map_response(response.result) {
                Ok(response) => response,
                Err(standard_error) => {
                    return Err(to_standard_error(response.input, standard_error))
                }
            };
        result.push(MutationWithId {
            id: response.input.id.clone(),
            response: mapped_response,
        });
    }

    Ok(result.vec_or_none())
}

fn map_delete_lines(responses: DeleteLinesResult) -> Result<DeleteShipmentLinesResponse> {
    let mut result = Vec::new();
    for response in responses {
        let mapped_response =
            match inbound_shipment_line::line::delete::map_response(response.result) {
                Ok(response) => response,
                Err(standard_error) => {
                    return Err(to_standard_error(response.input, standard_error))
                }
            };
        result.push(MutationWithId {
            id: response.input.id.clone(),
            response: mapped_response,
        });
    }

    Ok(result.vec_or_none())
}

fn map_insert_service_lines(
    responses: InsertServiceLinesResult,
) -> Result<InsertShipmentServiceLinesResponse> {
    let mut result = Vec::new();
    for response in responses {
        let mapped_response =
            match inbound_shipment_line::service_line::insert::map_response(response.result) {
                Ok(response) => response,
                Err(standard_error) => {
                    return Err(to_standard_error(response.input, standard_error))
                }
            };
        result.push(MutationWithId {
            id: response.input.id.clone(),
            response: mapped_response,
        });
    }

    Ok(result.vec_or_none())
}

fn map_update_service_lines(
    responses: UpdateServiceLinesResult,
) -> Result<UpdateShipmentServiceLinesResponse> {
    let mut result = Vec::new();
    for response in responses {
        let mapped_response =
            match inbound_shipment_line::service_line::update::map_response(response.result) {
                Ok(response) => response,
                Err(standard_error) => {
                    return Err(to_standard_error(response.input, standard_error))
                }
            };
        result.push(MutationWithId {
            id: response.input.id.clone(),
            response: mapped_response,
        });
    }

    Ok(result.vec_or_none())
}

fn map_delete_service_lines(
    responses: DeleteServiceLinesResult,
) -> Result<DeleteShipmentServiceLinesResponse> {
    let mut result = Vec::new();
    for response in responses {
        let mapped_response =
            match inbound_shipment_line::service_line::delete::map_response(response.result) {
                Ok(response) => response,
                Err(standard_error) => {
                    return Err(to_standard_error(response.input, standard_error))
                }
            };
        result.push(MutationWithId {
            id: response.input.id.clone(),
            response: mapped_response,
        });
    }

    Ok(result.vec_or_none())
}

#[cfg(test)]
mod test {
    use async_graphql::EmptyMutation;
    use graphql_core::{
        assert_graphql_query, assert_standard_graphql_error, test_helpers::setup_graphl_test,
    };
    use repository::{
        mock::MockDataInserts, InvoiceLine, RepositoryError, StorageConnectionManager,
    };
    use serde_json::json;
    use service::{
        invoice::{
            inbound_shipment::{
                BatchInboundShipment, BatchInboundShipmentResult, DeleteInboundShipment,
                DeleteInboundShipmentError, InsertInboundShipment, InsertInboundShipmentError,
                UpdateInboundShipment, UpdateInboundShipmentError,
            },
            InvoiceServiceTrait,
        },
        invoice_line::inbound_shipment_line::{
            DeleteInboundShipmentLine, DeleteInboundShipmentLineError, InsertInboundShipmentLine,
            InsertInboundShipmentLineError, UpdateInboundShipmentLine,
            UpdateInboundShipmentLineError,
        },
        service_provider::{ServiceContext, ServiceProvider},
        InputWithResult,
    };
    use util::inline_init;

    use crate::BatchMutations;

    type ServiceInput = BatchInboundShipment;
    type ServiceResponse = BatchInboundShipmentResult;

    type Method = dyn Fn(ServiceInput) -> Result<ServiceResponse, RepositoryError> + Sync + Send;

    pub struct TestService(pub Box<Method>);

    impl InvoiceServiceTrait for TestService {
        fn batch_inbound_shipment(
            &self,
            _: &ServiceContext,
            input: ServiceInput,
        ) -> Result<ServiceResponse, RepositoryError> {
            self.0(input)
        }
    }

    fn service_provider(
        test_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone(), "app_data");
        service_provider.invoice_service = Box::new(test_service);
        service_provider
    }

    #[actix_rt::test]
    async fn test_graphql_batch_inbound_shipment() {
        let (_, _, connection_manager, settings) = setup_graphl_test(
            EmptyMutation,
            BatchMutations,
            "test_graphql_batch_inbound_shipment",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation mut($input: BatchInboundShipmentInput!, $storeId: String!) {
            batchInboundShipment(input: $input, storeId: $storeId) {
              insertInboundShipments {
                id
                response {
                  ... on InsertInboundShipmentError {
                    error {
                      __typename
                    }
                  }
                }
              }
              insertInboundShipmentLines {
                id
                response {
                  ... on InsertInboundShipmentLineError {
                    error {
                      __typename
                    }
                  }
                }
              }
              updateInboundShipmentLines {
                id
                response {
                  ... on UpdateInboundShipmentLineError {
                    error {
                      __typename
                    }
                  }
                  ... on InvoiceLineNode {
                      id
                  }
                }
              }
              deleteInboundShipmentLines {
                response {
                  ... on DeleteInboundShipmentLineError {
                    error {
                      __typename
                    }
                  }
                }
                id
              }
              updateInboundShipments {
                id
                response {
                  ... on UpdateInboundShipmentError {
                    error {
                      __typename
                    }
                  }
                }
              }
              deleteInboundShipments {
                id
                response {
                  ... on DeleteInboundShipmentError {
                    error {
                      __typename
                    }
                  }
                }
              }
            }
          }
          
        "#;

        let expected = json!({
            "batchInboundShipment": {
              "insertInboundShipments": [
                {
                  "id": "id1",
                  "response": {
                    "error": {
                      "__typename": "OtherPartyNotASupplier"
                    }
                  }
                }
              ],

              "insertInboundShipmentLines": [
                {
                  "id": "id2",
                  "response": {
                    "error": {
                      "__typename": "ForeignKeyError"
                    }
                  }
                }
              ],
              "updateInboundShipmentLines": [
                {
                  "id": "id3",
                  "response": {
                    "error": {
                      "__typename": "RecordNotFound"
                    }
                  }
                }
              ],
              "deleteInboundShipmentLines": [
                {
                  "id": "id4",
                  "response": {
                    "error": {
                      "__typename": "RecordNotFound"
                    }
                  }
                }
              ],
              "updateInboundShipments": [
                {
                  "id": "id5",
                  "response": {
                    "error": {
                      "__typename": "RecordNotFound"
                    }
                  }
                }
              ],
              "deleteInboundShipments": [
                {
                  "id": "id6",
                  "response": {
                    "error": {
                      "__typename": "RecordNotFound"
                    }
                  }
                }
              ]
            }
          }
        );

        let variables = Some(json!({
            "storeId": "n/a",
            "input": {}
        }
        ));

        // Structured Errors
        let test_service = TestService(Box::new(|_| {
            Ok(BatchInboundShipmentResult {
                insert_shipment: vec![InputWithResult {
                    input: inline_init(|input: &mut InsertInboundShipment| {
                        input.id = "id1".to_string()
                    }),
                    result: Err(InsertInboundShipmentError::OtherPartyNotASupplier),
                }],
                insert_line: vec![InputWithResult {
                    input: inline_init(|input: &mut InsertInboundShipmentLine| {
                        input.id = "id2".to_string()
                    }),
                    result: Err(InsertInboundShipmentLineError::InvoiceDoesNotExist {}),
                }],
                update_line: vec![InputWithResult {
                    input: inline_init(|input: &mut UpdateInboundShipmentLine| {
                        input.id = "id3".to_string()
                    }),
                    result: Err(UpdateInboundShipmentLineError::LineDoesNotExist {}),
                }],
                delete_line: vec![InputWithResult {
                    input: inline_init(|input: &mut DeleteInboundShipmentLine| {
                        input.id = "id4".to_string()
                    }),
                    result: Err(DeleteInboundShipmentLineError::LineDoesNotExist {}),
                }],
                update_shipment: vec![InputWithResult {
                    input: inline_init(|input: &mut UpdateInboundShipment| {
                        input.id = "id5".to_string()
                    }),
                    result: Err(UpdateInboundShipmentError::InvoiceDoesNotExist {}),
                }],
                delete_shipment: vec![InputWithResult {
                    input: inline_init(|input: &mut DeleteInboundShipment| {
                        input.id = "id6".to_string()
                    }),
                    result: Err(DeleteInboundShipmentError::InvoiceDoesNotExist {}),
                }],
                insert_service_line: vec![],
                update_service_line: vec![],
                delete_service_line: vec![],
                zero_lines_quantity: vec![],
            })
        }));

        assert_graphql_query!(
            &settings,
            mutation,
            &variables,
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );

        // Standard Error
        let test_service = TestService(Box::new(|_| {
            Ok(BatchInboundShipmentResult {
                insert_shipment: vec![InputWithResult {
                    input: inline_init(|input: &mut InsertInboundShipment| {
                        input.id = "id1".to_string()
                    }),
                    result: Err(InsertInboundShipmentError::OtherPartyNotASupplier),
                }],
                insert_line: vec![InputWithResult {
                    input: inline_init(|input: &mut InsertInboundShipmentLine| {
                        input.id = "id2".to_string()
                    }),
                    result: Err(InsertInboundShipmentLineError::InvoiceDoesNotExist {}),
                }],
                update_line: vec![],
                delete_line: vec![],
                update_shipment: vec![],
                delete_shipment: vec![InputWithResult {
                    input: inline_init(|input: &mut DeleteInboundShipment| {
                        input.id = "id6".to_string()
                    }),
                    result: Err(DeleteInboundShipmentError::NotAnInboundShipment {}),
                }],
                insert_service_line: vec![],
                update_service_line: vec![],
                delete_service_line: vec![],
                zero_lines_quantity: vec![],
            })
        }));
        let expected_message = "Bad user input";
        let expected_extensions = json!({
            "input":
                format!(
                    "{:#?}",
                    inline_init(|input: &mut DeleteInboundShipment| {
                        input.id = "id6".to_string()
                    })
                )
        });
        assert_standard_graphql_error!(
            &settings,
            &mutation,
            &variables,
            &expected_message,
            Some(expected_extensions),
            Some(service_provider(test_service, &connection_manager))
        );

        // Success

        let expected = json!({
            "batchInboundShipment": {
              "deleteInboundShipmentLines": null,
              "deleteInboundShipments": null,
              "insertInboundShipmentLines": null,
              "insertInboundShipments": null,
              "updateInboundShipmentLines": [
                {
                  "id": "id3",
                  "response": {
                    "id": "id3"
                  }
                }
              ],
              "updateInboundShipments": null
            }
          }
        );

        let test_service = TestService(Box::new(|_| {
            Ok(BatchInboundShipmentResult {
                insert_shipment: vec![],
                insert_line: vec![],
                update_line: vec![InputWithResult {
                    input: inline_init(|input: &mut UpdateInboundShipmentLine| {
                        input.id = "id3".to_string()
                    }),
                    result: Ok(inline_init(|input: &mut InvoiceLine| {
                        input.invoice_line_row.id = "id3".to_string()
                    })),
                }],
                delete_line: vec![],
                update_shipment: vec![],
                delete_shipment: vec![],
                insert_service_line: vec![],
                update_service_line: vec![],
                delete_service_line: vec![],
                zero_lines_quantity: vec![],
            })
        }));

        assert_graphql_query!(
            &settings,
            mutation,
            &variables,
            &expected,
            Some(service_provider(test_service, &connection_manager))
        );
    }
}
