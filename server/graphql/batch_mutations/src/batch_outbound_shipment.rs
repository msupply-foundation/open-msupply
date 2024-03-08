use crate::{to_standard_error, VecOrNone};
use async_graphql::*;
use graphql_core::standard_graphql_error::validate_auth;
use graphql_core::ContextExt;
use graphql_invoice::mutations::outbound_shipment;
use graphql_invoice_line::mutations::outbound_shipment_line;
use service::auth::Resource;
use service::auth::ResourceAccessRequest;
use service::invoice::outbound_shipment::*;

#[derive(SimpleObject)]
#[graphql(concrete(
    name = "InsertOutboundShipmentResponseWithId",
    params(outbound_shipment::insert::InsertResponse)
))]
#[graphql(concrete(
    name = "UpdateOutboundShipmentResponseWithId",
    params(outbound_shipment::update::UpdateResponse)
))]
#[graphql(concrete(
    name = "DeleteOutboundShipmentResponseWithId",
    params(outbound_shipment::delete::DeleteResponse)
))]
#[graphql(concrete(
    name = "InsertOutboundShipmentLineResponseWithId",
    params(outbound_shipment_line::line::insert::InsertResponse)
))]
#[graphql(concrete(
    name = "UpdateOutboundShipmentLineResponseWithId",
    params(outbound_shipment_line::line::update::UpdateResponse)
))]
#[graphql(concrete(
    name = "DeleteOutboundShipmentLineResponseWithId",
    params(outbound_shipment_line::line::delete::DeleteResponse)
))]
#[graphql(concrete(
    name = "InsertOutboundShipmentServiceLineResponseWithId",
    params(outbound_shipment_line::service_line::insert::InsertResponse)
))]
#[graphql(concrete(
    name = "UpdateOutboundShipmentServiceLineResponseWithId",
    params(outbound_shipment_line::service_line::update::UpdateResponse)
))]
#[graphql(concrete(
    name = "DeleteOutboundShipmentServiceLineResponseWithId",
    params(outbound_shipment_line::service_line::delete::DeleteResponse)
))]
#[graphql(concrete(
    name = "InsertOutboundShipmentUnallocatedLineResponseWithId",
    params(outbound_shipment_line::unallocated_line::insert::InsertResponse)
))]
#[graphql(concrete(
    name = "UpdateOutboundShipmentUnallocatedLineResponseWithId",
    params(outbound_shipment_line::unallocated_line::update::UpdateResponse)
))]
#[graphql(concrete(
    name = "DeleteOutboundShipmentUnallocatedLineResponseWithId",
    params(outbound_shipment_line::unallocated_line::delete::DeleteResponse)
))]
#[graphql(concrete(
    name = "AllocateOutboundShipmentUnallocatedLineResponseWithId",
    params(outbound_shipment_line::unallocated_line::allocate::AllocateResponse)
))]
pub struct MutationWithId<T: OutputType> {
    pub id: String,
    pub response: T,
}

type ServiceInput = BatchOutboundShipment;
type ServiceResult = BatchOutboundShipmentResult;

type InsertShipmentsResponse =
    Option<Vec<MutationWithId<outbound_shipment::insert::InsertResponse>>>;
type InsertLinesResponse =
    Option<Vec<MutationWithId<outbound_shipment_line::line::insert::InsertResponse>>>;
type UpdateLinesResponse =
    Option<Vec<MutationWithId<outbound_shipment_line::line::update::UpdateResponse>>>;
type DeleteLinesResponse =
    Option<Vec<MutationWithId<outbound_shipment_line::line::delete::DeleteResponse>>>;
type InsertServiceLinesResponse =
    Option<Vec<MutationWithId<outbound_shipment_line::service_line::insert::InsertResponse>>>;
type UpdateServiceLinesResponse =
    Option<Vec<MutationWithId<outbound_shipment_line::service_line::update::UpdateResponse>>>;
type DeleteServiceLinesResponse =
    Option<Vec<MutationWithId<outbound_shipment_line::service_line::delete::DeleteResponse>>>;
type InsertUnallocatedLinesResponse =
    Option<Vec<MutationWithId<outbound_shipment_line::unallocated_line::insert::InsertResponse>>>;
type UpdateUnallocatedLinesResponse =
    Option<Vec<MutationWithId<outbound_shipment_line::unallocated_line::update::UpdateResponse>>>;
type DeleteUnallocatedLinesResponse =
    Option<Vec<MutationWithId<outbound_shipment_line::unallocated_line::delete::DeleteResponse>>>;
type AllocateLinesResponse = Option<
    Vec<MutationWithId<outbound_shipment_line::unallocated_line::allocate::AllocateResponse>>,
>;
type UpdateShipmentsResponse =
    Option<Vec<MutationWithId<outbound_shipment::update::UpdateResponse>>>;
type DeleteShipmentsResponse =
    Option<Vec<MutationWithId<outbound_shipment::delete::DeleteResponse>>>;

#[derive(SimpleObject)]
#[graphql(name = "BatchOutboundShipmentResponse")]
pub struct BatchResponse {
    insert_outbound_shipments: InsertShipmentsResponse,
    insert_outbound_shipment_lines: InsertLinesResponse,
    update_outbound_shipment_lines: UpdateLinesResponse,
    delete_outbound_shipment_lines: DeleteLinesResponse,
    insert_outbound_shipment_service_lines: InsertServiceLinesResponse,
    update_outbound_shipment_service_lines: UpdateServiceLinesResponse,
    delete_outbound_shipment_service_lines: DeleteServiceLinesResponse,
    insert_outbound_shipment_unallocated_lines: InsertUnallocatedLinesResponse,
    update_outbound_shipment_unallocated_lines: UpdateUnallocatedLinesResponse,
    delete_outbound_shipment_unallocated_lines: DeleteUnallocatedLinesResponse,
    allocate_outbound_shipment_unallocated_lines: AllocateLinesResponse,
    update_outbound_shipments: UpdateShipmentsResponse,
    delete_outbound_shipments: DeleteShipmentsResponse,
}

#[derive(InputObject)]
#[graphql(name = "BatchOutboundShipmentInput")]
pub struct BatchInput {
    pub insert_outbound_shipments: Option<Vec<outbound_shipment::insert::InsertInput>>,
    pub insert_outbound_shipment_lines:
        Option<Vec<outbound_shipment_line::line::insert::InsertInput>>,
    pub update_outbound_shipment_lines:
        Option<Vec<outbound_shipment_line::line::update::UpdateInput>>,
    pub delete_outbound_shipment_lines:
        Option<Vec<outbound_shipment_line::line::delete::DeleteInput>>,
    pub insert_outbound_shipment_service_lines:
        Option<Vec<outbound_shipment_line::service_line::insert::InsertInput>>,
    pub update_outbound_shipment_service_lines:
        Option<Vec<outbound_shipment_line::service_line::update::UpdateInput>>,
    pub delete_outbound_shipment_service_lines:
        Option<Vec<outbound_shipment_line::service_line::delete::DeleteInput>>,
    pub insert_outbound_shipment_unallocated_lines:
        Option<Vec<outbound_shipment_line::unallocated_line::insert::InsertInput>>,
    pub update_outbound_shipment_unallocated_lines:
        Option<Vec<outbound_shipment_line::unallocated_line::update::UpdateInput>>,
    pub delete_outbound_shipment_unallocated_lines:
        Option<Vec<outbound_shipment_line::unallocated_line::delete::DeleteInput>>,
    pub allocated_outbound_shipment_unallocated_lines: Option<Vec<String>>,
    pub update_outbound_shipments: Option<Vec<outbound_shipment::update::UpdateInput>>,
    pub delete_outbound_shipments: Option<Vec<String>>,
    pub continue_on_error: Option<bool>,
}

pub fn batch(ctx: &Context<'_>, store_id: &str, input: BatchInput) -> Result<BatchResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateOutboundShipment,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    let response = service_provider
        .invoice_service
        .batch_outbound_shipment(&service_context, input.to_domain())?;

    Ok(BatchResponse::from_domain(response)?)
}

impl BatchInput {
    fn to_domain(self) -> ServiceInput {
        let BatchInput {
            insert_outbound_shipments,
            insert_outbound_shipment_lines,
            update_outbound_shipment_lines,
            delete_outbound_shipment_lines,
            update_outbound_shipments,
            delete_outbound_shipments,
            continue_on_error,
            insert_outbound_shipment_service_lines,
            update_outbound_shipment_service_lines,
            delete_outbound_shipment_service_lines,
            insert_outbound_shipment_unallocated_lines,
            update_outbound_shipment_unallocated_lines,
            delete_outbound_shipment_unallocated_lines,
            allocated_outbound_shipment_unallocated_lines,
        } = self;

        ServiceInput {
            insert_shipment: insert_outbound_shipments
                .map(|inputs| inputs.into_iter().map(|input| input.to_domain()).collect()),
            insert_line: insert_outbound_shipment_lines
                .map(|inputs| inputs.into_iter().map(|input| input.to_domain()).collect()),
            update_line: update_outbound_shipment_lines
                .map(|inputs| inputs.into_iter().map(|input| input.to_domain()).collect()),
            delete_line: delete_outbound_shipment_lines
                .map(|inputs| inputs.into_iter().map(|input| input.to_domain()).collect()),
            insert_service_line: insert_outbound_shipment_service_lines
                .map(|inputs| inputs.into_iter().map(|input| input.to_domain()).collect()),
            update_service_line: update_outbound_shipment_service_lines
                .map(|inputs| inputs.into_iter().map(|input| input.to_domain()).collect()),
            delete_service_line: delete_outbound_shipment_service_lines
                .map(|inputs| inputs.into_iter().map(|input| input.to_domain()).collect()),
            insert_unallocated_line: insert_outbound_shipment_unallocated_lines
                .map(|inputs| inputs.into_iter().map(|input| input.to_domain()).collect()),
            update_unallocated_line: update_outbound_shipment_unallocated_lines
                .map(|inputs| inputs.into_iter().map(|input| input.to_domain()).collect()),
            delete_unallocated_line: delete_outbound_shipment_unallocated_lines
                .map(|inputs| inputs.into_iter().map(|input| input.to_domain()).collect()),
            allocate_line: allocated_outbound_shipment_unallocated_lines,
            update_shipment: update_outbound_shipments
                .map(|inputs| inputs.into_iter().map(|input| input.to_domain()).collect()),
            delete_shipment: delete_outbound_shipments,
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
            update_shipment,
            delete_shipment,
            insert_service_line,
            update_service_line,
            delete_service_line,
            insert_unallocated_line,
            update_unallocated_line,
            delete_unallocated_line,
            allocate_line,
        }: ServiceResult,
    ) -> Result<BatchResponse> {
        let result = BatchResponse {
            insert_outbound_shipments: map_insert_shipments(insert_shipment)?,
            insert_outbound_shipment_lines: map_insert_lines(insert_line)?,
            update_outbound_shipment_lines: map_update_lines(update_line)?,
            delete_outbound_shipment_lines: map_delete_lines(delete_line)?,
            insert_outbound_shipment_service_lines: map_insert_service_lines(insert_service_line)?,
            update_outbound_shipment_service_lines: map_update_service_lines(update_service_line)?,
            delete_outbound_shipment_service_lines: map_delete_service_lines(delete_service_line)?,
            insert_outbound_shipment_unallocated_lines: map_insert_unallocated_lines(
                insert_unallocated_line,
            )?,
            update_outbound_shipment_unallocated_lines: map_update_unallocated_lines(
                update_unallocated_line,
            )?,
            delete_outbound_shipment_unallocated_lines: map_delete_unallocated_lines(
                delete_unallocated_line,
            )?,
            allocate_outbound_shipment_unallocated_lines: map_allocate_lines(allocate_line)?,
            update_outbound_shipments: map_update_shipments(update_shipment)?,
            delete_outbound_shipments: map_delete_shipments(delete_shipment)?,
        };

        Ok(result)
    }
}

fn map_insert_shipments(responses: InsertShipmentsResult) -> Result<InsertShipmentsResponse> {
    let mut result = Vec::new();
    for response in responses {
        let mapped_response = match outbound_shipment::insert::map_response(response.result) {
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
        let mapped_response = match outbound_shipment::update::map_response(response.result) {
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
        let mapped_response = match outbound_shipment::delete::map_response(response.result) {
            Ok(response) => response,
            Err(standard_error) => return Err(to_standard_error(response.input, standard_error)),
        };
        result.push(MutationWithId {
            id: response.input.clone(),
            response: mapped_response,
        });
    }

    Ok(result.vec_or_none())
}

fn map_insert_lines(responses: InsertLinesResult) -> Result<InsertLinesResponse> {
    let mut result = Vec::new();
    for response in responses {
        let mapped_response =
            match outbound_shipment_line::line::insert::map_response(response.result) {
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

fn map_update_lines(responses: UpdateLinesResult) -> Result<UpdateLinesResponse> {
    let mut result = Vec::new();
    for response in responses {
        let mapped_response =
            match outbound_shipment_line::line::update::map_response(response.result) {
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

fn map_delete_lines(responses: DeleteLinesResult) -> Result<DeleteLinesResponse> {
    let mut result = Vec::new();
    for response in responses {
        let mapped_response =
            match outbound_shipment_line::line::delete::map_response(response.result) {
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
) -> Result<InsertServiceLinesResponse> {
    let mut result = Vec::new();
    for response in responses {
        let mapped_response =
            match outbound_shipment_line::service_line::insert::map_response(response.result) {
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
) -> Result<UpdateServiceLinesResponse> {
    let mut result = Vec::new();
    for response in responses {
        let mapped_response =
            match outbound_shipment_line::service_line::update::map_response(response.result) {
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
) -> Result<DeleteServiceLinesResponse> {
    let mut result = Vec::new();
    for response in responses {
        let mapped_response =
            match outbound_shipment_line::service_line::delete::map_response(response.result) {
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

fn map_insert_unallocated_lines(
    responses: InsertUnallocatedLinesResult,
) -> Result<InsertUnallocatedLinesResponse> {
    let mut result = Vec::new();
    for response in responses {
        let mapped_response =
            match outbound_shipment_line::unallocated_line::insert::map_response(response.result) {
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

fn map_update_unallocated_lines(
    responses: UpdateUnallocatedLinesResult,
) -> Result<UpdateUnallocatedLinesResponse> {
    let mut result = Vec::new();
    for response in responses {
        let mapped_response =
            match outbound_shipment_line::unallocated_line::update::map_response(response.result) {
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

fn map_delete_unallocated_lines(
    responses: DeleteUnallocatedLinesResult,
) -> Result<DeleteUnallocatedLinesResponse> {
    let mut result = Vec::new();
    for response in responses {
        let mapped_response =
            match outbound_shipment_line::unallocated_line::delete::map_response(response.result) {
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

fn map_allocate_lines(responses: AllocateLinesResult) -> Result<AllocateLinesResponse> {
    let mut result = Vec::new();
    for response in responses {
        let mapped_response =
            match outbound_shipment_line::unallocated_line::allocate::map_response(response.result)
            {
                Ok(response) => response,
                Err(standard_error) => {
                    return Err(to_standard_error(response.input, standard_error))
                }
            };
        result.push(MutationWithId {
            id: response.input.clone(),
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
            outbound_shipment::{
                delete::DeleteOutboundShipmentError,
                insert::{InsertOutboundShipment, InsertOutboundShipmentError},
                update::{UpdateOutboundShipment, UpdateOutboundShipmentError},
                BatchOutboundShipment, BatchOutboundShipmentResult,
            },
            InvoiceServiceTrait,
        },
        invoice_line::{
            outbound_shipment_service_line::{
                DeleteOutboundShipmentServiceLineError, InsertOutboundShipmentServiceLine,
                InsertOutboundShipmentServiceLineError, UpdateOutboundShipmentServiceLine,
                UpdateOutboundShipmentServiceLineError,
            },
            outbound_shipment_unallocated_line::{
                AllocateOutboundShipmentUnallocatedLineError,
                DeleteOutboundShipmentUnallocatedLine, DeleteOutboundShipmentUnallocatedLineError,
                InsertOutboundShipmentUnallocatedLine, InsertOutboundShipmentUnallocatedLineError,
                UpdateOutboundShipmentUnallocatedLine, UpdateOutboundShipmentUnallocatedLineError,
            },
            stock_out_line::{
                DeleteStockOutLine, DeleteStockOutLineError, InsertStockOutLine,
                InsertStockOutLineError, StockOutType, UpdateStockOutLine, UpdateStockOutLineError,
            },
        },
        service_provider::{ServiceContext, ServiceProvider},
        InputWithResult,
    };
    use util::inline_init;

    use crate::BatchMutations;

    type ServiceInput = BatchOutboundShipment;
    type ServiceResponse = BatchOutboundShipmentResult;

    type Method = dyn Fn(ServiceInput) -> Result<ServiceResponse, RepositoryError> + Sync + Send;

    pub struct TestService(pub Box<Method>);

    impl InvoiceServiceTrait for TestService {
        fn batch_outbound_shipment(
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
    async fn test_graphql_batch_outbound_shipment() {
        let (_, _, connection_manager, settings) = setup_graphl_test(
            EmptyMutation,
            BatchMutations,
            "test_graphql_batch_outbound_shipment",
            MockDataInserts::all(),
        )
        .await;

        let mutation = r#"
        mutation mut($input: BatchOutboundShipmentInput!, $storeId: String!) {
            batchOutboundShipment(input: $input, storeId: $storeId) {
              insertOutboundShipments {
                id
                response {
                  ... on InsertOutboundShipmentError {
                    error {
                      __typename
                    }
                  }
                }
              }
              insertOutboundShipmentLines {
                id
                response {
                  ... on InsertOutboundShipmentLineError {
                    error {
                      __typename
                    }
                  }
                }
              }
              updateOutboundShipmentLines {
                id
                response {
                  ... on UpdateOutboundShipmentLineError {
                    error {
                      __typename
                    }
                  }
                  ... on InvoiceLineNode {
                      id
                  }
                }
              }
              deleteOutboundShipmentLines {
                response {
                  ... on DeleteOutboundShipmentLineError {
                    error {
                      __typename
                    }
                  }
                }
                id
              }
              
              insertOutboundShipmentServiceLines {
                id
                response {
                  ... on InsertOutboundShipmentServiceLineError {
                    error {
                      __typename
                    }
                  }
                }
              }
              updateOutboundShipmentServiceLines {
                id
                response {
                  ... on UpdateOutboundShipmentServiceLineError {
                    error {
                      __typename
                    }
                  }
                  ... on InvoiceLineNode {
                      id
                  }
                }
              }
              deleteOutboundShipmentServiceLines {
                response {
                  ... on DeleteOutboundShipmentServiceLineError {
                    error {
                      __typename
                    }
                  }
                }
                id
              }

                        
              insertOutboundShipmentUnallocatedLines {
                id
                response {
                  ... on InsertOutboundShipmentUnallocatedLineError {
                    error {
                      __typename
                    }
                  }
                }
              }
              updateOutboundShipmentUnallocatedLines {
                id
                response {
                  ... on UpdateOutboundShipmentUnallocatedLineError {
                    error {
                      __typename
                    }
                  }
                  ... on InvoiceLineNode {
                      id
                  }
                }
              }
              deleteOutboundShipmentUnallocatedLines {
                response {
                  ... on DeleteOutboundShipmentUnallocatedLineError {
                    error {
                      __typename
                    }
                  }
                }
                id
              }
              allocateOutboundShipmentUnallocatedLines {
                response {
                  ... on AllocateOutboundShipmentUnallocatedLineError {
                    error {
                      __typename
                    }
                  }
                }
                id
              }
              updateOutboundShipments {
                id
                response {
                  ... on UpdateOutboundShipmentError {
                    error {
                      __typename
                    }
                  }
                }
              }
              deleteOutboundShipments {
                id
                response {
                  ... on DeleteOutboundShipmentError {
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
            "batchOutboundShipment": {
              "insertOutboundShipments": [
                {
                  "id": "id1",
                  "response": {
                    "error": {
                      "__typename": "OtherPartyNotACustomer"
                    }
                  }
                }
              ],

              "insertOutboundShipmentLines": [
                {
                  "id": "id2",
                  "response": {
                    "error": {
                      "__typename": "ForeignKeyError"
                    }
                  }
                }
              ],
              "updateOutboundShipmentLines": [
                {
                  "id": "id3",
                  "response": {
                    "error": {
                      "__typename": "RecordNotFound"
                    }
                  }
                }
              ],
              "deleteOutboundShipmentLines": [
                {
                  "id": "id4",
                  "response": {
                    "error": {
                      "__typename": "RecordNotFound"
                    }
                  }
                }
              ],

              "insertOutboundShipmentServiceLines": [
                {
                  "id": "id5",
                  "response": {
                    "error": {
                      "__typename": "ForeignKeyError"
                    }
                  }
                }
              ],
              "updateOutboundShipmentServiceLines": [
                {
                  "id": "id6",
                  "response": {
                    "error": {
                      "__typename": "RecordNotFound"
                    }
                  }
                }
              ],
              "deleteOutboundShipmentServiceLines": [
                {
                  "id": "id7",
                  "response": {
                    "error": {
                      "__typename": "RecordNotFound"
                    }
                  }
                }
              ],

              "insertOutboundShipmentUnallocatedLines": [
                {
                  "id": "id8",
                  "response": {
                    "error": {
                      "__typename": "ForeignKeyError"
                    }
                  }
                }
              ],
              "updateOutboundShipmentUnallocatedLines": [
                {
                  "id": "id9",
                  "response": {
                    "error": {
                      "__typename": "RecordNotFound"
                    }
                  }
                }
              ],
              "deleteOutboundShipmentUnallocatedLines": [
                {
                  "id": "id10",
                  "response": {
                    "error": {
                      "__typename": "RecordNotFound"
                    }
                  }
                }
              ],
              "allocateOutboundShipmentUnallocatedLines": [
                {
                  "id": "id11",
                  "response": {
                    "error": {
                      "__typename": "RecordNotFound"
                    }
                  }
                }
              ],
              "updateOutboundShipments": [
                {
                  "id": "id12",
                  "response": {
                    "error": {
                      "__typename": "RecordNotFound"
                    }
                  }
                }
              ],
              "deleteOutboundShipments": [
                {
                  "id": "id13",
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
            Ok(BatchOutboundShipmentResult {
                insert_shipment: vec![InputWithResult {
                    input: inline_init(|input: &mut InsertOutboundShipment| {
                        input.id = "id1".to_string()
                    }),
                    result: Err(InsertOutboundShipmentError::OtherPartyNotACustomer),
                }],
                insert_line: vec![InputWithResult {
                    input: inline_init(|input: &mut InsertStockOutLine| {
                        input.id = "id2".to_string()
                    }),
                    result: Err(InsertStockOutLineError::InvoiceDoesNotExist {}),
                }],
                update_line: vec![InputWithResult {
                    input: inline_init(|input: &mut UpdateStockOutLine| {
                        input.id = "id3".to_string()
                    }),
                    result: Err(UpdateStockOutLineError::LineDoesNotExist {}),
                }],
                delete_line: vec![InputWithResult {
                    input: inline_init(|input: &mut DeleteStockOutLine| {
                        input.id = "id4".to_string()
                    }),
                    result: Err(DeleteStockOutLineError::LineDoesNotExist {}),
                }],

                insert_service_line: vec![InputWithResult {
                    input: inline_init(|input: &mut InsertOutboundShipmentServiceLine| {
                        input.id = "id5".to_string()
                    }),
                    result: Err(InsertOutboundShipmentServiceLineError::InvoiceDoesNotExist {}),
                }],
                update_service_line: vec![InputWithResult {
                    input: inline_init(|input: &mut UpdateOutboundShipmentServiceLine| {
                        input.id = "id6".to_string()
                    }),
                    result: Err(UpdateOutboundShipmentServiceLineError::LineDoesNotExist {}),
                }],
                delete_service_line: vec![InputWithResult {
                    input: inline_init(|input: &mut DeleteStockOutLine| {
                        input.id = "id7".to_string()
                    }),
                    result: Err(DeleteOutboundShipmentServiceLineError::LineDoesNotExist {}),
                }],

                insert_unallocated_line: vec![InputWithResult {
                    input: inline_init(|input: &mut InsertOutboundShipmentUnallocatedLine| {
                        input.id = "id8".to_string()
                    }),
                    result: Err(InsertOutboundShipmentUnallocatedLineError::InvoiceDoesNotExist {}),
                }],
                update_unallocated_line: vec![InputWithResult {
                    input: inline_init(|input: &mut UpdateOutboundShipmentUnallocatedLine| {
                        input.id = "id9".to_string()
                    }),
                    result: Err(UpdateOutboundShipmentUnallocatedLineError::LineDoesNotExist {}),
                }],
                delete_unallocated_line: vec![InputWithResult {
                    input: inline_init(|input: &mut DeleteOutboundShipmentUnallocatedLine| {
                        input.id = "id10".to_string()
                    }),
                    result: Err(DeleteOutboundShipmentUnallocatedLineError::LineDoesNotExist {}),
                }],
                allocate_line: vec![InputWithResult {
                    input: "id11".to_string(),
                    result: Err(AllocateOutboundShipmentUnallocatedLineError::LineDoesNotExist {}),
                }],

                update_shipment: vec![InputWithResult {
                    input: inline_init(|input: &mut UpdateOutboundShipment| {
                        input.id = "id12".to_string()
                    }),
                    result: Err(UpdateOutboundShipmentError::InvoiceDoesNotExist {}),
                }],
                delete_shipment: vec![InputWithResult {
                    input: "id13".to_string(),
                    result: Err(DeleteOutboundShipmentError::InvoiceDoesNotExist {}),
                }],
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
            Ok(BatchOutboundShipmentResult {
                insert_shipment: vec![InputWithResult {
                    input: inline_init(|input: &mut InsertOutboundShipment| {
                        input.id = "id1".to_string()
                    }),
                    result: Err(InsertOutboundShipmentError::OtherPartyNotACustomer),
                }],
                insert_line: vec![InputWithResult {
                    input: inline_init(|input: &mut InsertStockOutLine| {
                        input.id = "id2".to_string()
                    }),
                    result: Err(InsertStockOutLineError::InvoiceDoesNotExist {}),
                }],
                update_line: vec![],
                delete_line: vec![],
                update_shipment: vec![],
                delete_shipment: vec![InputWithResult {
                    input: "id12".to_string(),
                    result: Err(DeleteOutboundShipmentError::NotAnOutboundShipment {}),
                }],
                insert_service_line: vec![],
                update_service_line: vec![],
                delete_service_line: vec![],
                insert_unallocated_line: vec![],
                update_unallocated_line: vec![],
                delete_unallocated_line: vec![],
                allocate_line: vec![],
            })
        }));
        let expected_message = "Bad user input";
        let expected_extensions = json!({ "input": format!("{:#?}", "id12") });
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
            "batchOutboundShipment": {
              "deleteOutboundShipmentLines": null,
              "deleteOutboundShipments": null,
              "insertOutboundShipmentLines": null,
              "insertOutboundShipmentServiceLines": null,
              "updateOutboundShipmentServiceLines":  null,
              "deleteOutboundShipmentServiceLines": null,
              "insertOutboundShipmentUnallocatedLines": null,
              "updateOutboundShipmentUnallocatedLines":  null,
              "deleteOutboundShipmentUnallocatedLines": null,
              "allocateOutboundShipmentUnallocatedLines": null,
              "insertOutboundShipments": null,
              "updateOutboundShipmentLines": [
                {
                  "id": "id3",
                  "response": {
                    "id": "id3"
                  }
                }
              ],
              "updateOutboundShipments": null
            }
          }
        );

        let test_service = TestService(Box::new(|_| {
            Ok(BatchOutboundShipmentResult {
                insert_shipment: vec![],
                insert_line: vec![],
                update_line: vec![InputWithResult {
                    input: inline_init(|input: &mut UpdateStockOutLine| {
                        input.id = "id3".to_string();
                        input.r#type = Some(StockOutType::OutboundShipment)
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
                insert_unallocated_line: vec![],
                update_unallocated_line: vec![],
                delete_unallocated_line: vec![],
                allocate_line: vec![],
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
