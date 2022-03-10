use async_graphql::*;
use graphql_core::ContextExt;
use graphql_invoice::mutations::inbound_shipment;
use graphql_invoice_line::mutations::inbound_shipment_line;
use repository::Invoice;
use repository::InvoiceLine;
use service::invoice::inbound_shipment::DeleteInboundShipment;
use service::invoice::inbound_shipment::DeleteInboundShipmentError;
use service::invoice_line::inbound_shipment_line::InsertInboundShipmentLine;
use service::invoice_line::inbound_shipment_line::InsertInboundShipmentLineError;
use service::invoice_line::inbound_shipment_line::UpdateInboundShipmentLine;
use service::invoice_line::inbound_shipment_line::UpdateInboundShipmentLineError;
use service::invoice_line::inbound_shipment_service_line::DeleteInboundShipmentServiceLineError;
use service::invoice_line::inbound_shipment_service_line::InsertInboundShipmentServiceLine;
use service::invoice_line::inbound_shipment_service_line::InsertInboundShipmentServiceLineError;
use service::invoice_line::inbound_shipment_service_line::UpdateInboundShipmentServiceLine;
use service::invoice_line::inbound_shipment_service_line::UpdateInboundShipmentServiceLineError;
use service::InputWithResult;
use service::{
    invoice::inbound_shipment::{
        BatchInboundShipment, BatchInboundShipmentResult, InsertInboundShipment,
        InsertInboundShipmentError, UpdateInboundShipment, UpdateInboundShipmentError,
    },
    invoice_line::inbound_shipment_line::{
        DeleteInboundShipmentLine, DeleteInboundShipmentLineError,
    },
};

use crate::VecOrNone;

#[derive(SimpleObject)]
#[graphql(concrete(
    name = "InsertInboundShipmentResponseWithId",
    params(inbound_shipment::InsertResponse)
))]
#[graphql(concrete(
    name = "UpdateInboundShipmentResponseWithId",
    params(inbound_shipment::UpdateResponse)
))]
#[graphql(concrete(
    name = "DeleteInboundShipmentResponseWithId",
    params(inbound_shipment::DeleteResponse)
))]
#[graphql(concrete(
    name = "InsertInboundShipmentLineResponseWithId",
    params(inbound_shipment_line::line::InsertResponse)
))]
#[graphql(concrete(
    name = "UpdateInboundShipmentLineResponseWithId",
    params(inbound_shipment_line::line::UpdateResponse)
))]
#[graphql(concrete(
    name = "DeleteInboundShipmentLineResponseWithId",
    params(inbound_shipment_line::line::DeleteResponse)
))]
#[graphql(concrete(
    name = "InsertInboundShipmentServiceLineResponseWithId",
    params(inbound_shipment_line::service_line::InsertResponse)
))]
#[graphql(concrete(
    name = "UpdateInboundShipmentServiceLineResponseWithId",
    params(inbound_shipment_line::service_line::UpdateResponse)
))]
#[graphql(concrete(
    name = "DeleteInboundShipmentServiceLineResponseWithId",
    params(inbound_shipment_line::service_line::DeleteResponse)
))]
pub struct MutationWithId<T: OutputType> {
    pub id: String,
    pub response: T,
}

#[derive(SimpleObject)]
pub struct BatchInboundShipmentResponse {
    insert_inbound_shipments: Option<Vec<MutationWithId<inbound_shipment::InsertResponse>>>,
    insert_inbound_shipment_lines:
        Option<Vec<MutationWithId<inbound_shipment_line::line::InsertResponse>>>,
    update_inbound_shipment_lines:
        Option<Vec<MutationWithId<inbound_shipment_line::line::UpdateResponse>>>,
    delete_inbound_shipment_lines:
        Option<Vec<MutationWithId<inbound_shipment_line::line::DeleteResponse>>>,
    insert_inbound_shipment_service_lines:
        Option<Vec<MutationWithId<inbound_shipment_line::service_line::InsertResponse>>>,
    update_inbound_shipment_service_lines:
        Option<Vec<MutationWithId<inbound_shipment_line::service_line::UpdateResponse>>>,
    delete_inbound_shipment_service_lines:
        Option<Vec<MutationWithId<inbound_shipment_line::service_line::DeleteResponse>>>,
    update_inbound_shipments: Option<Vec<MutationWithId<inbound_shipment::UpdateResponse>>>,
    delete_inbound_shipments: Option<Vec<MutationWithId<inbound_shipment::DeleteResponse>>>,
}

#[derive(InputObject)]
pub struct BatchInboundShipmentInput {
    pub insert_inbound_shipments: Option<Vec<inbound_shipment::InsertInput>>,
    pub insert_inbound_shipment_lines: Option<Vec<inbound_shipment_line::line::InsertInput>>,
    pub update_inbound_shipment_lines: Option<Vec<inbound_shipment_line::line::UpdateInput>>,
    pub delete_inbound_shipment_lines: Option<Vec<inbound_shipment_line::line::DeleteInput>>,
    pub insert_inbound_shipment_service_lines:
        Option<Vec<inbound_shipment_line::service_line::InsertInput>>,
    pub update_inbound_shipment_service_lines:
        Option<Vec<inbound_shipment_line::service_line::UpdateInput>>,
    pub delete_inbound_shipment_service_lines:
        Option<Vec<inbound_shipment_line::service_line::DeleteInput>>,
    pub update_inbound_shipments: Option<Vec<inbound_shipment::UpdateInput>>,
    pub delete_inbound_shipments: Option<Vec<inbound_shipment::DeleteInput>>,
    pub continue_on_error: Option<bool>,
}

pub fn batch_inbound_shipment(
    ctx: &Context<'_>,
    store_id: &str,
    input: BatchInboundShipmentInput,
) -> Result<BatchInboundShipmentResponse> {
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context()?;

    let response = service_provider.invoice_service.batch_inbound_shipment(
        &service_context,
        store_id,
        input.to_domain(),
    )?;

    Ok(BatchInboundShipmentResponse::from_domain(response)?)
}

impl BatchInboundShipmentInput {
    fn to_domain(self) -> BatchInboundShipment {
        let BatchInboundShipmentInput {
            insert_inbound_shipments,
            insert_inbound_shipment_lines,
            update_inbound_shipment_lines,
            delete_inbound_shipment_lines,
            insert_inbound_shipment_service_lines,
            update_inbound_shipment_service_lines,
            delete_inbound_shipment_service_lines,
            update_inbound_shipments,
            delete_inbound_shipments,
            continue_on_error,
        } = self;

        BatchInboundShipment {
            insert_shipment: insert_inbound_shipments
                .map(|inputs| inputs.into_iter().map(|input| input.to_domain()).collect()),
            insert_line: insert_inbound_shipment_lines
                .map(|inputs| inputs.into_iter().map(|input| input.to_domain()).collect()),
            update_line: update_inbound_shipment_lines
                .map(|inputs| inputs.into_iter().map(|input| input.to_domain()).collect()),
            delete_line: delete_inbound_shipment_lines
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

impl BatchInboundShipmentResponse {
    fn from_domain(
        BatchInboundShipmentResult {
            insert_shipment,
            insert_line,
            update_line,
            delete_line,
            insert_service_line,
            update_service_line,
            delete_service_line,
            update_shipment,
            delete_shipment,
        }: BatchInboundShipmentResult,
    ) -> Result<BatchInboundShipmentResponse> {
        // Insert Shipment

        let insert_inbound_shipments_result: Result<
            Vec<MutationWithId<inbound_shipment::InsertResponse>>,
        > = insert_shipment
            .into_iter()
            .map(map_insert_shipment)
            .collect();

        // Normal Line

        let insert_inbound_shipment_lines_result: Result<
            Vec<MutationWithId<inbound_shipment_line::line::InsertResponse>>,
        > = insert_line.into_iter().map(map_insert_line).collect();

        let update_inbound_shipment_lines_result: Result<
            Vec<MutationWithId<inbound_shipment_line::line::UpdateResponse>>,
        > = update_line.into_iter().map(map_update_line).collect();

        let delete_inbound_shipment_lines_result: Result<
            Vec<MutationWithId<inbound_shipment_line::line::DeleteResponse>>,
        > = delete_line.into_iter().map(map_delete_line).collect();

        // Service Line

        let insert_inbound_shipment_service_lines_result: Result<
            Vec<MutationWithId<inbound_shipment_line::service_line::InsertResponse>>,
        > = insert_service_line
            .into_iter()
            .map(map_insert_service_line)
            .collect();

        let update_inbound_shipment_service_lines_result: Result<
            Vec<MutationWithId<inbound_shipment_line::service_line::UpdateResponse>>,
        > = update_service_line
            .into_iter()
            .map(map_update_service_line)
            .collect();

        let delete_inbound_shipment_service_lines_result: Result<
            Vec<MutationWithId<inbound_shipment_line::service_line::DeleteResponse>>,
        > = delete_service_line
            .into_iter()
            .map(map_delete_service_line)
            .collect();

        // Update delete shipment

        let update_inbound_shipments_result: Result<
            Vec<MutationWithId<inbound_shipment::UpdateResponse>>,
        > = update_shipment
            .into_iter()
            .map(map_update_shipment)
            .collect();

        let delete_inbound_shipments_result: Result<
            Vec<MutationWithId<inbound_shipment::DeleteResponse>>,
        > = delete_shipment
            .into_iter()
            .map(map_delete_shipment)
            .collect();

        let result = BatchInboundShipmentResponse {
            insert_inbound_shipments: insert_inbound_shipments_result?.vec_or_none(),
            insert_inbound_shipment_lines: insert_inbound_shipment_lines_result?.vec_or_none(),
            update_inbound_shipment_lines: update_inbound_shipment_lines_result?.vec_or_none(),
            delete_inbound_shipment_lines: delete_inbound_shipment_lines_result?.vec_or_none(),

            insert_inbound_shipment_service_lines: insert_inbound_shipment_service_lines_result?
                .vec_or_none(),
            update_inbound_shipment_service_lines: update_inbound_shipment_service_lines_result?
                .vec_or_none(),
            delete_inbound_shipment_service_lines: delete_inbound_shipment_service_lines_result?
                .vec_or_none(),

            update_inbound_shipments: update_inbound_shipments_result?.vec_or_none(),
            delete_inbound_shipments: delete_inbound_shipments_result?.vec_or_none(),
        };

        Ok(result)
    }
}

fn map_insert_shipment(
    from: InputWithResult<InsertInboundShipment, Result<Invoice, InsertInboundShipmentError>>,
) -> Result<MutationWithId<inbound_shipment::InsertResponse>> {
    let response = match inbound_shipment::insert::map_response(from.result) {
        Ok(response) => response,
        Err(standard_error) => {
            let input_string = format!("{:#?}", from.input);
            return Err(standard_error.extend_with(|_, e| e.set("input", input_string)));
        }
    };

    Ok(MutationWithId {
        id: from.input.id.clone(),
        response,
    })
}

fn map_update_shipment(
    from: InputWithResult<UpdateInboundShipment, Result<Invoice, UpdateInboundShipmentError>>,
) -> Result<MutationWithId<inbound_shipment::UpdateResponse>> {
    let response = match inbound_shipment::update::map_response(from.result) {
        Ok(response) => response,
        Err(standard_error) => {
            let input_string = format!("{:#?}", from.input);
            return Err(standard_error.extend_with(|_, e| e.set("input", input_string)));
        }
    };

    Ok(MutationWithId {
        id: from.input.id.clone(),
        response,
    })
}

fn map_delete_shipment(
    from: InputWithResult<DeleteInboundShipment, Result<String, DeleteInboundShipmentError>>,
) -> Result<MutationWithId<inbound_shipment::DeleteResponse>> {
    let response = match inbound_shipment::delete::map_response(from.result) {
        Ok(response) => response,
        Err(standard_error) => {
            let input_string = format!("{:#?}", from.input);
            return Err(standard_error.extend_with(|_, e| e.set("input", input_string)));
        }
    };

    Ok(MutationWithId {
        id: from.input.id.clone(),
        response,
    })
}

fn map_insert_line(
    from: InputWithResult<
        InsertInboundShipmentLine,
        Result<InvoiceLine, InsertInboundShipmentLineError>,
    >,
) -> Result<MutationWithId<inbound_shipment_line::line::InsertResponse>> {
    let response = match inbound_shipment_line::line::insert::map_response(from.result) {
        Ok(response) => response,
        Err(standard_error) => {
            let input_string = format!("{:#?}", from.input);
            return Err(standard_error.extend_with(|_, e| e.set("input", input_string)));
        }
    };

    Ok(MutationWithId {
        id: from.input.id.clone(),
        response,
    })
}

fn map_update_line(
    from: InputWithResult<
        UpdateInboundShipmentLine,
        Result<InvoiceLine, UpdateInboundShipmentLineError>,
    >,
) -> Result<MutationWithId<inbound_shipment_line::line::UpdateResponse>> {
    let response = match inbound_shipment_line::line::update::map_response(from.result) {
        Ok(response) => response,
        Err(standard_error) => {
            let input_string = format!("{:#?}", from.input);
            return Err(standard_error.extend_with(|_, e| e.set("input", input_string)));
        }
    };

    Ok(MutationWithId {
        id: from.input.id.clone(),
        response,
    })
}

fn map_delete_line(
    from: InputWithResult<
        DeleteInboundShipmentLine,
        Result<String, DeleteInboundShipmentLineError>,
    >,
) -> Result<MutationWithId<inbound_shipment_line::line::DeleteResponse>> {
    let response = match inbound_shipment_line::line::delete::map_response(from.result) {
        Ok(response) => response,
        Err(standard_error) => {
            let input_string = format!("{:#?}", from.input);
            return Err(standard_error.extend_with(|_, e| e.set("input", input_string)));
        }
    };

    Ok(MutationWithId {
        id: from.input.id.clone(),
        response,
    })
}

fn map_insert_service_line(
    from: InputWithResult<
        InsertInboundShipmentServiceLine,
        Result<InvoiceLine, InsertInboundShipmentServiceLineError>,
    >,
) -> Result<MutationWithId<inbound_shipment_line::service_line::InsertResponse>> {
    let response = match inbound_shipment_line::service_line::insert::map_response(from.result) {
        Ok(response) => response,
        Err(standard_error) => {
            let input_string = format!("{:#?}", from.input);
            return Err(standard_error.extend_with(|_, e| e.set("input", input_string)));
        }
    };

    Ok(MutationWithId {
        id: from.input.id.clone(),
        response,
    })
}

fn map_update_service_line(
    from: InputWithResult<
        UpdateInboundShipmentServiceLine,
        Result<InvoiceLine, UpdateInboundShipmentServiceLineError>,
    >,
) -> Result<MutationWithId<inbound_shipment_line::service_line::UpdateResponse>> {
    let response = match inbound_shipment_line::service_line::update::map_response(from.result) {
        Ok(response) => response,
        Err(standard_error) => {
            let input_string = format!("{:#?}", from.input);
            return Err(standard_error.extend_with(|_, e| e.set("input", input_string)));
        }
    };

    Ok(MutationWithId {
        id: from.input.id.clone(),
        response,
    })
}

fn map_delete_service_line(
    from: InputWithResult<
        DeleteInboundShipmentLine,
        Result<String, DeleteInboundShipmentServiceLineError>,
    >,
) -> Result<MutationWithId<inbound_shipment_line::service_line::DeleteResponse>> {
    let response = match inbound_shipment_line::service_line::delete::map_response(from.result) {
        Ok(response) => response,
        Err(standard_error) => {
            let input_string = format!("{:#?}", from.input);
            return Err(standard_error.extend_with(|_, e| e.set("input", input_string)));
        }
    };

    Ok(MutationWithId {
        id: from.input.id.clone(),
        response,
    })
}

#[cfg(test)]
mod test {
    use async_graphql::EmptyMutation;
    use graphql_core::{
        assert_graphql_query, assert_standard_graphql_error, test_helpers::setup_graphl_test,
    };
    use repository::{
        mock::MockDataInserts, InvoiceLine, Name, RepositoryError, StorageConnectionManager,
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

    type Method =
        dyn Fn(&str, ServiceInput) -> Result<ServiceResponse, RepositoryError> + Sync + Send;

    pub struct TestService(pub Box<Method>);

    impl InvoiceServiceTrait for TestService {
        fn batch_inbound_shipment(
            &self,
            _: &ServiceContext,
            store_id: &str,
            input: ServiceInput,
        ) -> Result<ServiceResponse, RepositoryError> {
            self.0(store_id, input)
        }
    }

    fn service_provider(
        test_service: TestService,
        connection_manager: &StorageConnectionManager,
    ) -> ServiceProvider {
        let mut service_provider = ServiceProvider::new(connection_manager.clone());
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
        let test_service = TestService(Box::new(|_, _| {
            Ok(BatchInboundShipmentResult {
                insert_shipment: vec![InputWithResult {
                    input: inline_init(|input: &mut InsertInboundShipment| {
                        input.id = "id1".to_string()
                    }),
                    result: Err(InsertInboundShipmentError::OtherPartyNotASupplier(
                        Name::default(),
                    )),
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
        let test_service = TestService(Box::new(|_, _| {
            Ok(BatchInboundShipmentResult {
                insert_shipment: vec![InputWithResult {
                    input: inline_init(|input: &mut InsertInboundShipment| {
                        input.id = "id1".to_string()
                    }),
                    result: Err(InsertInboundShipmentError::OtherPartyNotASupplier(
                        Name::default(),
                    )),
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

        let test_service = TestService(Box::new(|_, _| {
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
