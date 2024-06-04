use repository::{Invoice, InvoiceLine, RepositoryError};

use crate::{
    invoice_line::{
        outbound_shipment_service_line::{
            delete_outbound_shipment_service_line, insert_outbound_shipment_service_line,
            update_outbound_shipment_service_line, DeleteOutboundShipmentServiceLineError,
            InsertOutboundShipmentServiceLine, InsertOutboundShipmentServiceLineError,
            UpdateOutboundShipmentServiceLine, UpdateOutboundShipmentServiceLineError,
        },
        outbound_shipment_unallocated_line::{
            allocate_outbound_shipment_unallocated_line, delete_outbound_shipment_unallocated_line,
            insert_outbound_shipment_unallocated_line, update_outbound_shipment_unallocated_line,
            AllocateLineResult, AllocateOutboundShipmentUnallocatedLineError,
            DeleteOutboundShipmentUnallocatedLine, DeleteOutboundShipmentUnallocatedLineError,
            InsertOutboundShipmentUnallocatedLine, InsertOutboundShipmentUnallocatedLineError,
            UpdateOutboundShipmentUnallocatedLine, UpdateOutboundShipmentUnallocatedLineError,
        },
        stock_out_line::{
            delete_stock_out_line, insert_stock_out_line, update_stock_out_line,
            DeleteStockOutLine, DeleteStockOutLineError, InsertStockOutLine,
            InsertStockOutLineError, UpdateStockOutLine, UpdateStockOutLineError,
        },
    },
    service_provider::ServiceContext,
    BatchMutationsProcessor, InputWithResult, WithDBError,
};

use super::{
    delete::{delete_outbound_shipment, DeleteOutboundShipmentError},
    insert::{insert_outbound_shipment, InsertOutboundShipment, InsertOutboundShipmentError},
    update::{update_outbound_shipment, UpdateOutboundShipment, UpdateOutboundShipmentError},
};

#[derive(Clone, Debug)]
pub struct BatchOutboundShipment {
    pub insert_shipment: Option<Vec<InsertOutboundShipment>>,
    pub insert_line: Option<Vec<InsertStockOutLine>>,
    pub update_line: Option<Vec<UpdateStockOutLine>>,
    pub delete_line: Option<Vec<DeleteStockOutLine>>,
    pub insert_service_line: Option<Vec<InsertOutboundShipmentServiceLine>>,
    pub update_service_line: Option<Vec<UpdateOutboundShipmentServiceLine>>,
    pub delete_service_line: Option<Vec<DeleteStockOutLine>>,
    pub insert_unallocated_line: Option<Vec<InsertOutboundShipmentUnallocatedLine>>,
    pub update_unallocated_line: Option<Vec<UpdateOutboundShipmentUnallocatedLine>>,
    pub delete_unallocated_line: Option<Vec<DeleteOutboundShipmentUnallocatedLine>>,
    pub allocate_line: Option<Vec<String>>,
    pub update_shipment: Option<Vec<UpdateOutboundShipment>>,
    pub delete_shipment: Option<Vec<String>>,
    pub continue_on_error: Option<bool>,
}

pub type InsertShipmentsResult =
    Vec<InputWithResult<InsertOutboundShipment, Result<Invoice, InsertOutboundShipmentError>>>;
pub type InsertLinesResult =
    Vec<InputWithResult<InsertStockOutLine, Result<InvoiceLine, InsertStockOutLineError>>>;
pub type UpdateLinesResult =
    Vec<InputWithResult<UpdateStockOutLine, Result<InvoiceLine, UpdateStockOutLineError>>>;
pub type DeleteLinesResult =
    Vec<InputWithResult<DeleteStockOutLine, Result<String, DeleteStockOutLineError>>>;
pub type InsertServiceLinesResult = Vec<
    InputWithResult<
        InsertOutboundShipmentServiceLine,
        Result<InvoiceLine, InsertOutboundShipmentServiceLineError>,
    >,
>;
pub type UpdateServiceLinesResult = Vec<
    InputWithResult<
        UpdateOutboundShipmentServiceLine,
        Result<InvoiceLine, UpdateOutboundShipmentServiceLineError>,
    >,
>;
pub type DeleteServiceLinesResult = Vec<
    InputWithResult<DeleteStockOutLine, Result<String, DeleteOutboundShipmentServiceLineError>>,
>;
pub type InsertUnallocatedLinesResult = Vec<
    InputWithResult<
        InsertOutboundShipmentUnallocatedLine,
        Result<InvoiceLine, InsertOutboundShipmentUnallocatedLineError>,
    >,
>;
pub type UpdateUnallocatedLinesResult = Vec<
    InputWithResult<
        UpdateOutboundShipmentUnallocatedLine,
        Result<InvoiceLine, UpdateOutboundShipmentUnallocatedLineError>,
    >,
>;
pub type DeleteUnallocatedLinesResult = Vec<
    InputWithResult<
        DeleteOutboundShipmentUnallocatedLine,
        Result<String, DeleteOutboundShipmentUnallocatedLineError>,
    >,
>;
pub type AllocateLinesResult = Vec<
    InputWithResult<
        String,
        Result<AllocateLineResult, AllocateOutboundShipmentUnallocatedLineError>,
    >,
>;
pub type UpdateShipmentsResult =
    Vec<InputWithResult<UpdateOutboundShipment, Result<Invoice, UpdateOutboundShipmentError>>>;
pub type DeleteShipmentsResult =
    Vec<InputWithResult<String, Result<String, DeleteOutboundShipmentError>>>;

#[derive(Debug, Default)]
pub struct BatchOutboundShipmentResult {
    pub insert_shipment: InsertShipmentsResult,
    pub insert_line: InsertLinesResult,
    pub update_line: UpdateLinesResult,
    pub delete_line: DeleteLinesResult,
    pub insert_service_line: InsertServiceLinesResult,
    pub update_service_line: UpdateServiceLinesResult,
    pub delete_service_line: DeleteServiceLinesResult,
    pub insert_unallocated_line: InsertUnallocatedLinesResult,
    pub update_unallocated_line: UpdateUnallocatedLinesResult,
    pub delete_unallocated_line: DeleteUnallocatedLinesResult,
    pub allocate_line: AllocateLinesResult,
    pub update_shipment: UpdateShipmentsResult,
    pub delete_shipment: DeleteShipmentsResult,
}

pub fn batch_outbound_shipment(
    ctx: &ServiceContext,
    input: BatchOutboundShipment,
) -> Result<BatchOutboundShipmentResult, RepositoryError> {
    let result = ctx
        .connection
        .transaction_sync(|_| {
            let continue_on_error = input.continue_on_error.unwrap_or(false);
            let mut results = BatchOutboundShipmentResult::default();

            let mutations_processor = BatchMutationsProcessor::new(ctx);
            // Insert Shipment

            let (has_errors, result) = mutations_processor
                .do_mutations_with_user_id(input.insert_shipment, insert_outbound_shipment);
            results.insert_shipment = result;
            if has_errors && !continue_on_error {
                return Err(WithDBError::err(results));
            }

            // Normal Line

            let (has_errors, result) =
                mutations_processor.do_mutations(input.insert_line, insert_stock_out_line);
            results.insert_line = result;
            if has_errors && !continue_on_error {
                return Err(WithDBError::err(results));
            }

            let (has_errors, result) =
                mutations_processor.do_mutations(input.update_line, update_stock_out_line);
            results.update_line = result;
            if has_errors && !continue_on_error {
                return Err(WithDBError::err(results));
            }

            let (has_errors, result) =
                mutations_processor.do_mutations(input.delete_line, delete_stock_out_line);
            results.delete_line = result;
            if has_errors && !continue_on_error {
                return Err(WithDBError::err(results));
            }

            // Service Line

            let (has_errors, result) = mutations_processor.do_mutations(
                input.insert_service_line,
                insert_outbound_shipment_service_line,
            );
            results.insert_service_line = result;
            if has_errors && !continue_on_error {
                return Err(WithDBError::err(results));
            }

            let (has_errors, result) = mutations_processor.do_mutations(
                input.update_service_line,
                update_outbound_shipment_service_line,
            );
            results.update_service_line = result;
            if has_errors && !continue_on_error {
                return Err(WithDBError::err(results));
            }

            let (has_errors, result) = mutations_processor.do_mutations(
                input.delete_service_line,
                delete_outbound_shipment_service_line,
            );
            results.delete_service_line = result;
            if has_errors && !continue_on_error {
                return Err(WithDBError::err(results));
            }

            // Unallocated line

            let (has_errors, result) = mutations_processor.do_mutations(
                input.insert_unallocated_line,
                insert_outbound_shipment_unallocated_line,
            );
            results.insert_unallocated_line = result;
            if has_errors && !continue_on_error {
                return Err(WithDBError::err(results));
            }

            let (has_errors, result) = mutations_processor.do_mutations(
                input.update_unallocated_line,
                update_outbound_shipment_unallocated_line,
            );
            results.update_unallocated_line = result;
            if has_errors && !continue_on_error {
                return Err(WithDBError::err(results));
            }

            let (has_errors, result) = mutations_processor.do_mutations(
                input.delete_unallocated_line,
                delete_outbound_shipment_unallocated_line,
            );
            results.delete_unallocated_line = result;
            if has_errors && !continue_on_error {
                return Err(WithDBError::err(results));
            }

            let (has_errors, result) = mutations_processor.do_mutations(
                input.allocate_line,
                allocate_outbound_shipment_unallocated_line,
            );
            results.allocate_line = result;
            if has_errors && !continue_on_error {
                return Err(WithDBError::err(results));
            }

            // Update and delete shipment

            let (has_errors, result) =
                mutations_processor.do_mutations(input.update_shipment, update_outbound_shipment);
            results.update_shipment = result;
            if has_errors && !continue_on_error {
                return Err(WithDBError::err(results));
            }

            let (has_errors, result) =
                mutations_processor.do_mutations(input.delete_shipment, delete_outbound_shipment);
            results.delete_shipment = result;
            if has_errors && !continue_on_error {
                return Err(WithDBError::err(results));
            }

            Ok(results)
                as Result<BatchOutboundShipmentResult, WithDBError<BatchOutboundShipmentResult>>
        })
        .map_err(|error| error.to_inner_error())
        .or_else(|error| match error {
            WithDBError::DatabaseError(repository_error) => Err(repository_error),
            WithDBError::Error(batch_response) => Ok(batch_response),
        })?;

    Ok(result)
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{
            mock_inbound_shipment_a, mock_name_store_b, mock_stock_line_a, mock_store_a,
            MockDataInserts,
        },
        test_db::setup_all,
        InvoiceLineRowRepository, InvoiceRowRepository,
    };
    use util::inline_init;

    use crate::{
        invoice::outbound_shipment::{
            delete::DeleteOutboundShipmentError, insert::InsertOutboundShipment,
            BatchOutboundShipment,
        },
        invoice_line::stock_out_line::{InsertStockOutLine, StockOutType},
        service_provider::ServiceProvider,
        InputWithResult,
    };

    #[actix_rt::test]
    async fn batch_outbound_shipment_service() {
        let (_, connection, connection_manager, _) =
            setup_all("batch_outbound_shipment_service", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_service;

        let delete_shipment_input = mock_inbound_shipment_a().id;

        let mut input = BatchOutboundShipment {
            insert_shipment: Some(vec![inline_init(|input: &mut InsertOutboundShipment| {
                input.id = "new_id".to_string();
                input.other_party_id = mock_name_store_b().id;
            })]),
            insert_line: Some(vec![inline_init(|input: &mut InsertStockOutLine| {
                input.invoice_id = "new_id".to_string();
                input.r#type = Some(StockOutType::OutboundShipment);
                input.id = "new_line_id".to_string();
                input.stock_line_id = mock_stock_line_a().id;
                input.number_of_packs = 1.0
            })]),
            update_line: None,
            delete_line: None,
            update_shipment: None,
            delete_shipment: Some(vec![delete_shipment_input.clone()]),
            continue_on_error: None,
            insert_service_line: None,
            update_service_line: None,
            delete_service_line: None,
            insert_unallocated_line: None,
            update_unallocated_line: None,
            delete_unallocated_line: None,
            allocate_line: None,
        };

        // Test rollback
        let result = service
            .batch_outbound_shipment(&context, input.clone())
            .unwrap();

        assert_eq!(
            result.delete_shipment,
            vec![InputWithResult {
                input: delete_shipment_input,
                result: Err(DeleteOutboundShipmentError::NotAnOutboundShipment {})
            }]
        );

        assert_eq!(
            InvoiceRowRepository::new(&connection)
                .find_one_by_id("new_id")
                .unwrap(),
            None
        );

        assert_eq!(
            InvoiceLineRowRepository::new(&connection)
                .find_one_by_id_option("new_line_id")
                .unwrap(),
            None
        );

        // Test no rollback
        input.continue_on_error = Some(true);

        service.batch_outbound_shipment(&context, input).unwrap();

        assert_ne!(
            InvoiceRowRepository::new(&connection)
                .find_one_by_id("new_id")
                .unwrap(),
            None
        );

        assert_ne!(
            InvoiceLineRowRepository::new(&connection)
                .find_one_by_id_option("new_line_id")
                .unwrap(),
            None
        );
    }
}
