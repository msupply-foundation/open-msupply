use async_graphql::*;
use graphql_core::ContextExt;
use graphql_invoice::mutations::outbound_shipment;
use graphql_invoice_line::mutations::outbound_shipment_line;
use repository::Invoice;
use repository::InvoiceLine;
use service::invoice::outbound_shipment::DeleteOutboundShipmentError;
use service::invoice_line::outbound_shipment_line::InsertOutboundShipmentLine;
use service::invoice_line::outbound_shipment_line::InsertOutboundShipmentLineError;
use service::invoice_line::outbound_shipment_line::UpdateOutboundShipmentLine;
use service::invoice_line::outbound_shipment_line::UpdateOutboundShipmentLineError;
use service::invoice_line::outbound_shipment_service_line::DeleteOutboundShipmentServiceLineError;
use service::invoice_line::outbound_shipment_service_line::InsertOutboundShipmentServiceLine;
use service::invoice_line::outbound_shipment_service_line::InsertOutboundShipmentServiceLineError;
use service::invoice_line::outbound_shipment_service_line::UpdateOutboundShipmentServiceLine;
use service::invoice_line::outbound_shipment_service_line::UpdateOutboundShipmentServiceLineError;
use service::invoice_line::outbound_shipment_unallocated_line::DeleteOutboundShipmentUnallocatedLine;
use service::invoice_line::outbound_shipment_unallocated_line::DeleteOutboundShipmentUnallocatedLineError;
use service::invoice_line::outbound_shipment_unallocated_line::InsertOutboundShipmentUnallocatedLine;
use service::invoice_line::outbound_shipment_unallocated_line::InsertOutboundShipmentUnallocatedLineError;
use service::invoice_line::outbound_shipment_unallocated_line::UpdateOutboundShipmentUnallocatedLine;
use service::invoice_line::outbound_shipment_unallocated_line::UpdateOutboundShipmentUnallocatedLineError;
use service::InputWithResult;
use service::{
    invoice::outbound_shipment::{
        BatchOutboundShipment, BatchOutboundShipmentResult, InsertOutboundShipment,
        InsertOutboundShipmentError, UpdateOutboundShipment, UpdateOutboundShipmentError,
    },
    invoice_line::outbound_shipment_line::{
        DeleteOutboundShipmentLine, DeleteOutboundShipmentLineError,
    },
};

use crate::VecOrNone;

#[derive(SimpleObject)]
#[graphql(concrete(
    name = "InsertOutboundShipmentResponseWithId",
    params(outbound_shipment::InsertResponse)
))]
#[graphql(concrete(
    name = "UpdateOutboundShipmentResponseWithId",
    params(outbound_shipment::UpdateResponse)
))]
#[graphql(concrete(
    name = "DeleteOutboundShipmentResponseWithId",
    params(outbound_shipment::DeleteResponse)
))]
#[graphql(concrete(
    name = "InsertOutboundShipmentLineResponseWithId",
    params(outbound_shipment_line::line::InsertResponse)
))]
#[graphql(concrete(
    name = "UpdateOutboundShipmentLineResponseWithId",
    params(outbound_shipment_line::line::UpdateResponse)
))]
#[graphql(concrete(
    name = "DeleteOutboundShipmentLineResponseWithId",
    params(outbound_shipment_line::line::DeleteResponse)
))]
#[graphql(concrete(
    name = "InsertOutboundShipmentServiceLineResponseWithId",
    params(outbound_shipment_line::service_line::InsertResponse)
))]
#[graphql(concrete(
    name = "UpdateOutboundShipmentServiceLineResponseWithId",
    params(outbound_shipment_line::service_line::UpdateResponse)
))]
#[graphql(concrete(
    name = "DeleteOutboundShipmentServiceLineResponseWithId",
    params(outbound_shipment_line::service_line::DeleteResponse)
))]
#[graphql(concrete(
    name = "InsertOutboundShipmentUnallocatedLineResponseWithId",
    params(outbound_shipment_line::unallocated_line::InsertResponse)
))]
#[graphql(concrete(
    name = "UpdateOutboundShipmentUnallocatedLineResponseWithId",
    params(outbound_shipment_line::unallocated_line::UpdateResponse)
))]
#[graphql(concrete(
    name = "DeleteOutboundShipmentUnallocatedLineResponseWithId",
    params(outbound_shipment_line::unallocated_line::DeleteResponse)
))]
pub struct MutationWithId<T: OutputType> {
    pub id: String,
    pub response: T,
}

#[derive(SimpleObject)]
pub struct BatchOutboundShipmentResponse {
    insert_outbound_shipments: Option<Vec<MutationWithId<outbound_shipment::InsertResponse>>>,
    insert_outbound_shipment_lines:
        Option<Vec<MutationWithId<outbound_shipment_line::line::InsertResponse>>>,
    update_outbound_shipment_lines:
        Option<Vec<MutationWithId<outbound_shipment_line::line::UpdateResponse>>>,
    delete_outbound_shipment_lines:
        Option<Vec<MutationWithId<outbound_shipment_line::line::DeleteResponse>>>,
    insert_outbound_shipment_service_lines:
        Option<Vec<MutationWithId<outbound_shipment_line::service_line::InsertResponse>>>,
    update_outbound_shipment_service_lines:
        Option<Vec<MutationWithId<outbound_shipment_line::service_line::UpdateResponse>>>,
    delete_outbound_shipment_service_lines:
        Option<Vec<MutationWithId<outbound_shipment_line::service_line::DeleteResponse>>>,
    insert_outbound_shipment_unallocated_lines:
        Option<Vec<MutationWithId<outbound_shipment_line::unallocated_line::InsertResponse>>>,
    update_outbound_shipment_unallocated_lines:
        Option<Vec<MutationWithId<outbound_shipment_line::unallocated_line::UpdateResponse>>>,
    delete_outbound_shipment_unallocated_lines:
        Option<Vec<MutationWithId<outbound_shipment_line::unallocated_line::DeleteResponse>>>,
    update_outbound_shipments: Option<Vec<MutationWithId<outbound_shipment::UpdateResponse>>>,
    delete_outbound_shipments: Option<Vec<MutationWithId<outbound_shipment::DeleteResponse>>>,
}

#[derive(InputObject)]
pub struct BatchOutboundShipmentInput {
    pub insert_outbound_shipments: Option<Vec<outbound_shipment::InsertInput>>,
    pub insert_outbound_shipment_lines: Option<Vec<outbound_shipment_line::line::InsertInput>>,
    pub update_outbound_shipment_lines: Option<Vec<outbound_shipment_line::line::UpdateInput>>,
    pub delete_outbound_shipment_lines: Option<Vec<outbound_shipment_line::line::DeleteInput>>,
    pub insert_outbound_shipment_service_lines:
        Option<Vec<outbound_shipment_line::service_line::InsertInput>>,
    pub update_outbound_shipment_service_lines:
        Option<Vec<outbound_shipment_line::service_line::UpdateInput>>,
    pub delete_outbound_shipment_service_lines:
        Option<Vec<outbound_shipment_line::service_line::DeleteInput>>,
    pub insert_outbound_shipment_unallocated_lines:
        Option<Vec<outbound_shipment_line::unallocated_line::InsertInput>>,
    pub update_outbound_shipment_unallocated_lines:
        Option<Vec<outbound_shipment_line::unallocated_line::UpdateInput>>,
    pub delete_outbound_shipment_unallocated_lines:
        Option<Vec<outbound_shipment_line::unallocated_line::DeleteInput>>,
    pub update_outbound_shipments: Option<Vec<outbound_shipment::UpdateInput>>,
    pub delete_outbound_shipments: Option<Vec<String>>,
    pub continue_on_error: Option<bool>,
}

pub fn batch_outbound_shipment(
    ctx: &Context<'_>,
    store_id: &str,
    input: BatchOutboundShipmentInput,
) -> Result<BatchOutboundShipmentResponse> {
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context()?;

    let response = service_provider.invoice_service.batch_outbound_shipment(
        &service_context,
        store_id,
        input.to_domain(),
    )?;

    Ok(BatchOutboundShipmentResponse::from_domain(response)?)
}

impl BatchOutboundShipmentInput {
    fn to_domain(self) -> BatchOutboundShipment {
        let BatchOutboundShipmentInput {
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
        } = self;

        BatchOutboundShipment {
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

            update_shipment: update_outbound_shipments
                .map(|inputs| inputs.into_iter().map(|input| input.to_domain()).collect()),
            delete_shipment: delete_outbound_shipments,
            continue_on_error,
        }
    }
}

impl BatchOutboundShipmentResponse {
    fn from_domain(
        BatchOutboundShipmentResult {
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
        }: BatchOutboundShipmentResult,
    ) -> Result<BatchOutboundShipmentResponse> {
        // Insert Shipment

        let insert_outbound_shipments_result: Result<
            Vec<MutationWithId<outbound_shipment::InsertResponse>>,
        > = insert_shipment
            .into_iter()
            .map(map_insert_shipment)
            .collect();

        // Normal Line

        let insert_outbound_shipment_lines_result: Result<
            Vec<MutationWithId<outbound_shipment_line::line::InsertResponse>>,
        > = insert_line.into_iter().map(map_insert_line).collect();

        let update_outbound_shipment_lines_result: Result<
            Vec<MutationWithId<outbound_shipment_line::line::UpdateResponse>>,
        > = update_line.into_iter().map(map_update_line).collect();

        let delete_outbound_shipment_lines_result: Result<
            Vec<MutationWithId<outbound_shipment_line::line::DeleteResponse>>,
        > = delete_line.into_iter().map(map_delete_line).collect();

        // Service Line

        let insert_outbound_shipment_service_lines_result: Result<
            Vec<MutationWithId<outbound_shipment_line::service_line::InsertResponse>>,
        > = insert_service_line
            .into_iter()
            .map(map_insert_service_line)
            .collect();

        let update_outbound_shipment_service_lines_result: Result<
            Vec<MutationWithId<outbound_shipment_line::service_line::UpdateResponse>>,
        > = update_service_line
            .into_iter()
            .map(map_update_service_line)
            .collect();

        let delete_outbound_shipment_service_lines_result: Result<
            Vec<MutationWithId<outbound_shipment_line::service_line::DeleteResponse>>,
        > = delete_service_line
            .into_iter()
            .map(map_delete_service_line)
            .collect();

        // Unallocated Line

        let insert_outbound_shipment_unallocated_lines_result: Result<
            Vec<MutationWithId<outbound_shipment_line::unallocated_line::InsertResponse>>,
        > = insert_unallocated_line
            .into_iter()
            .map(map_insert_unallocated_line)
            .collect();

        let update_outbound_shipment_unallocated_lines_result: Result<
            Vec<MutationWithId<outbound_shipment_line::unallocated_line::UpdateResponse>>,
        > = update_unallocated_line
            .into_iter()
            .map(map_update_unallocated_line)
            .collect();

        let delete_outbound_shipment_unallocated_lines_result: Result<
            Vec<MutationWithId<outbound_shipment_line::unallocated_line::DeleteResponse>>,
        > = delete_unallocated_line
            .into_iter()
            .map(map_delete_unallocated_line)
            .collect();

        // Update delete shipment

        let update_outbound_shipments_result: Result<
            Vec<MutationWithId<outbound_shipment::UpdateResponse>>,
        > = update_shipment
            .into_iter()
            .map(map_update_shipment)
            .collect();

        let delete_outbound_shipments_result: Result<
            Vec<MutationWithId<outbound_shipment::DeleteResponse>>,
        > = delete_shipment
            .into_iter()
            .map(map_delete_shipment)
            .collect();

        let result = BatchOutboundShipmentResponse {
            insert_outbound_shipments: insert_outbound_shipments_result?.vec_or_none(),
            insert_outbound_shipment_lines: insert_outbound_shipment_lines_result?.vec_or_none(),
            update_outbound_shipment_lines: update_outbound_shipment_lines_result?.vec_or_none(),
            delete_outbound_shipment_lines: delete_outbound_shipment_lines_result?.vec_or_none(),

            insert_outbound_shipment_service_lines: insert_outbound_shipment_service_lines_result?
                .vec_or_none(),
            update_outbound_shipment_service_lines: update_outbound_shipment_service_lines_result?
                .vec_or_none(),
            delete_outbound_shipment_service_lines: delete_outbound_shipment_service_lines_result?
                .vec_or_none(),

            insert_outbound_shipment_unallocated_lines:
                insert_outbound_shipment_unallocated_lines_result?.vec_or_none(),
            update_outbound_shipment_unallocated_lines:
                update_outbound_shipment_unallocated_lines_result?.vec_or_none(),
            delete_outbound_shipment_unallocated_lines:
                delete_outbound_shipment_unallocated_lines_result?.vec_or_none(),

            update_outbound_shipments: update_outbound_shipments_result?.vec_or_none(),
            delete_outbound_shipments: delete_outbound_shipments_result?.vec_or_none(),
        };

        Ok(result)
    }
}

fn map_insert_shipment(
    from: InputWithResult<InsertOutboundShipment, Result<Invoice, InsertOutboundShipmentError>>,
) -> Result<MutationWithId<outbound_shipment::InsertResponse>> {
    let response = match outbound_shipment::insert::map_response(from.result) {
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
    from: InputWithResult<UpdateOutboundShipment, Result<Invoice, UpdateOutboundShipmentError>>,
) -> Result<MutationWithId<outbound_shipment::UpdateResponse>> {
    let response = match outbound_shipment::update::map_response(from.result) {
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
    from: InputWithResult<String, Result<String, DeleteOutboundShipmentError>>,
) -> Result<MutationWithId<outbound_shipment::DeleteResponse>> {
    let response = match outbound_shipment::delete::map_response(from.result) {
        Ok(response) => response,
        Err(standard_error) => {
            let input_string = format!("{:#?}", from.input);
            return Err(standard_error.extend_with(|_, e| e.set("input", input_string)));
        }
    };

    Ok(MutationWithId {
        id: from.input,
        response,
    })
}

fn map_insert_line(
    from: InputWithResult<
        InsertOutboundShipmentLine,
        Result<InvoiceLine, InsertOutboundShipmentLineError>,
    >,
) -> Result<MutationWithId<outbound_shipment_line::line::InsertResponse>> {
    let response = match outbound_shipment_line::line::insert::map_response(from.result) {
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
        UpdateOutboundShipmentLine,
        Result<InvoiceLine, UpdateOutboundShipmentLineError>,
    >,
) -> Result<MutationWithId<outbound_shipment_line::line::UpdateResponse>> {
    let response = match outbound_shipment_line::line::update::map_response(from.result) {
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
        DeleteOutboundShipmentLine,
        Result<String, DeleteOutboundShipmentLineError>,
    >,
) -> Result<MutationWithId<outbound_shipment_line::line::DeleteResponse>> {
    let response = match outbound_shipment_line::line::delete::map_response(from.result) {
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
        InsertOutboundShipmentServiceLine,
        Result<InvoiceLine, InsertOutboundShipmentServiceLineError>,
    >,
) -> Result<MutationWithId<outbound_shipment_line::service_line::InsertResponse>> {
    let response = match outbound_shipment_line::service_line::insert::map_response(from.result) {
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
        UpdateOutboundShipmentServiceLine,
        Result<InvoiceLine, UpdateOutboundShipmentServiceLineError>,
    >,
) -> Result<MutationWithId<outbound_shipment_line::service_line::UpdateResponse>> {
    let response = match outbound_shipment_line::service_line::update::map_response(from.result) {
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
        DeleteOutboundShipmentLine,
        Result<String, DeleteOutboundShipmentServiceLineError>,
    >,
) -> Result<MutationWithId<outbound_shipment_line::service_line::DeleteResponse>> {
    let response = match outbound_shipment_line::service_line::delete::map_response(from.result) {
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

fn map_insert_unallocated_line(
    from: InputWithResult<
        InsertOutboundShipmentUnallocatedLine,
        Result<InvoiceLine, InsertOutboundShipmentUnallocatedLineError>,
    >,
) -> Result<MutationWithId<outbound_shipment_line::unallocated_line::InsertResponse>> {
    let response = match outbound_shipment_line::unallocated_line::insert::map_response(from.result)
    {
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

fn map_update_unallocated_line(
    from: InputWithResult<
        UpdateOutboundShipmentUnallocatedLine,
        Result<InvoiceLine, UpdateOutboundShipmentUnallocatedLineError>,
    >,
) -> Result<MutationWithId<outbound_shipment_line::unallocated_line::UpdateResponse>> {
    let response = match outbound_shipment_line::unallocated_line::update::map_response(from.result)
    {
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

fn map_delete_unallocated_line(
    from: InputWithResult<
        DeleteOutboundShipmentUnallocatedLine,
        Result<String, DeleteOutboundShipmentUnallocatedLineError>,
    >,
) -> Result<MutationWithId<outbound_shipment_line::unallocated_line::DeleteResponse>> {
    let response = match outbound_shipment_line::unallocated_line::delete::map_response(from.result)
    {
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
            outbound_shipment::{
                BatchOutboundShipment, BatchOutboundShipmentResult, DeleteOutboundShipmentError,
                InsertOutboundShipment, InsertOutboundShipmentError, UpdateOutboundShipment,
                UpdateOutboundShipmentError,
            },
            InvoiceServiceTrait,
        },
        invoice_line::{
            outbound_shipment_line::{
                DeleteOutboundShipmentLine, DeleteOutboundShipmentLineError,
                InsertOutboundShipmentLine, InsertOutboundShipmentLineError,
                UpdateOutboundShipmentLine, UpdateOutboundShipmentLineError,
            },
            outbound_shipment_service_line::{
                DeleteOutboundShipmentServiceLineError, InsertOutboundShipmentServiceLine,
                InsertOutboundShipmentServiceLineError, UpdateOutboundShipmentServiceLine,
                UpdateOutboundShipmentServiceLineError,
            },
            outbound_shipment_unallocated_line::{
                DeleteOutboundShipmentUnallocatedLine, DeleteOutboundShipmentUnallocatedLineError,
                InsertOutboundShipmentUnallocatedLine, InsertOutboundShipmentUnallocatedLineError,
                UpdateOutboundShipmentUnallocatedLine, UpdateOutboundShipmentUnallocatedLineError,
            },
        },
        service_provider::{ServiceContext, ServiceProvider},
        InputWithResult,
    };
    use util::inline_init;

    use crate::BatchMutations;

    type ServiceInput = BatchOutboundShipment;
    type ServiceResponse = BatchOutboundShipmentResult;

    type Method =
        dyn Fn(&str, ServiceInput) -> Result<ServiceResponse, RepositoryError> + Sync + Send;

    pub struct TestService(pub Box<Method>);

    impl InvoiceServiceTrait for TestService {
        fn batch_outbound_shipment(
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
                      "__typename": "OtherPartyNotACustomerError"
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
              "updateOutboundShipments": [
                {
                  "id": "id11",
                  "response": {
                    "error": {
                      "__typename": "RecordNotFound"
                    }
                  }
                }
              ],
              "deleteOutboundShipments": [
                {
                  "id": "id12",
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
            Ok(BatchOutboundShipmentResult {
                insert_shipment: vec![InputWithResult {
                    input: inline_init(|input: &mut InsertOutboundShipment| {
                        input.id = "id1".to_string()
                    }),
                    result: Err(InsertOutboundShipmentError::OtherPartyNotACustomer(
                        Name::default(),
                    )),
                }],
                insert_line: vec![InputWithResult {
                    input: inline_init(|input: &mut InsertOutboundShipmentLine| {
                        input.id = "id2".to_string()
                    }),
                    result: Err(InsertOutboundShipmentLineError::InvoiceDoesNotExist {}),
                }],
                update_line: vec![InputWithResult {
                    input: inline_init(|input: &mut UpdateOutboundShipmentLine| {
                        input.id = "id3".to_string()
                    }),
                    result: Err(UpdateOutboundShipmentLineError::LineDoesNotExist {}),
                }],
                delete_line: vec![InputWithResult {
                    input: inline_init(|input: &mut DeleteOutboundShipmentLine| {
                        input.id = "id4".to_string()
                    }),
                    result: Err(DeleteOutboundShipmentLineError::LineDoesNotExist {}),
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
                    input: inline_init(|input: &mut DeleteOutboundShipmentLine| {
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

                update_shipment: vec![InputWithResult {
                    input: inline_init(|input: &mut UpdateOutboundShipment| {
                        input.id = "id11".to_string()
                    }),
                    result: Err(UpdateOutboundShipmentError::InvoiceDoesNotExists {}),
                }],
                delete_shipment: vec![InputWithResult {
                    input: "id12".to_string(),
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
        let test_service = TestService(Box::new(|_, _| {
            Ok(BatchOutboundShipmentResult {
                insert_shipment: vec![InputWithResult {
                    input: inline_init(|input: &mut InsertOutboundShipment| {
                        input.id = "id1".to_string()
                    }),
                    result: Err(InsertOutboundShipmentError::OtherPartyNotACustomer(
                        Name::default(),
                    )),
                }],
                insert_line: vec![InputWithResult {
                    input: inline_init(|input: &mut InsertOutboundShipmentLine| {
                        input.id = "id2".to_string()
                    }),
                    result: Err(InsertOutboundShipmentLineError::InvoiceDoesNotExist {}),
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

        let test_service = TestService(Box::new(|_, _| {
            Ok(BatchOutboundShipmentResult {
                insert_shipment: vec![],
                insert_line: vec![],
                update_line: vec![InputWithResult {
                    input: inline_init(|input: &mut UpdateOutboundShipmentLine| {
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
                insert_unallocated_line: vec![],
                update_unallocated_line: vec![],
                delete_unallocated_line: vec![],
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
