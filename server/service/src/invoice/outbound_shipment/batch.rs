use repository::{Invoice, InvoiceLine, RepositoryError};

use crate::{
    invoice_line::{
        outbound_shipment_line::{
            delete_outbound_shipment_line, insert_outbound_shipment_line,
            update_outbound_shipment_line, DeleteOutboundShipmentLine,
            DeleteOutboundShipmentLineError, InsertOutboundShipmentLine,
            InsertOutboundShipmentLineError, UpdateOutboundShipmentLine,
            UpdateOutboundShipmentLineError,
        },
        outbound_shipment_service_line::{
            delete_outbound_shipment_service_line, insert_outbound_shipment_service_line,
            update_outbound_shipment_service_line, DeleteOutboundShipmentServiceLineError,
            InsertOutboundShipmentServiceLine, InsertOutboundShipmentServiceLineError,
            UpdateOutboundShipmentServiceLine, UpdateOutboundShipmentServiceLineError,
        },
        outbound_shipment_unallocated_line::{
            delete_outbound_shipment_unallocated_line, insert_outbound_shipment_unallocated_line,
            update_outbound_shipment_unallocated_line, DeleteOutboundShipmentUnallocatedLine,
            DeleteOutboundShipmentUnallocatedLineError, InsertOutboundShipmentUnallocatedLine,
            InsertOutboundShipmentUnallocatedLineError, UpdateOutboundShipmentUnallocatedLine,
            UpdateOutboundShipmentUnallocatedLineError,
        },
    },
    service_provider::ServiceContext,
    InputWithResult, WithDBError,
};

use super::{
    delete_outbound_shipment, insert_outbound_shipment, update_outbound_shipment,
    DeleteOutboundShipmentError, InsertOutboundShipment, InsertOutboundShipmentError,
    UpdateOutboundShipment, UpdateOutboundShipmentError,
};

#[derive(Clone, Debug)]
pub struct BatchOutboundShipment {
    pub insert_shipment: Option<Vec<InsertOutboundShipment>>,
    pub insert_line: Option<Vec<InsertOutboundShipmentLine>>,
    pub update_line: Option<Vec<UpdateOutboundShipmentLine>>,
    pub delete_line: Option<Vec<DeleteOutboundShipmentLine>>,
    pub insert_service_line: Option<Vec<InsertOutboundShipmentServiceLine>>,
    pub update_service_line: Option<Vec<UpdateOutboundShipmentServiceLine>>,
    pub delete_service_line: Option<Vec<DeleteOutboundShipmentLine>>,
    pub insert_unallocated_line: Option<Vec<InsertOutboundShipmentUnallocatedLine>>,
    pub update_unallocated_line: Option<Vec<UpdateOutboundShipmentUnallocatedLine>>,
    pub delete_unallocated_line: Option<Vec<DeleteOutboundShipmentUnallocatedLine>>,
    pub update_shipment: Option<Vec<UpdateOutboundShipment>>,
    pub delete_shipment: Option<Vec<String>>,
    pub continue_on_error: Option<bool>,
}

#[derive(Debug)]
pub struct BatchOutboundShipmentResult {
    pub insert_shipment:
        Vec<InputWithResult<InsertOutboundShipment, Result<Invoice, InsertOutboundShipmentError>>>,
    pub insert_line: Vec<
        InputWithResult<
            InsertOutboundShipmentLine,
            Result<InvoiceLine, InsertOutboundShipmentLineError>,
        >,
    >,
    pub update_line: Vec<
        InputWithResult<
            UpdateOutboundShipmentLine,
            Result<InvoiceLine, UpdateOutboundShipmentLineError>,
        >,
    >,
    pub delete_line: Vec<
        InputWithResult<
            DeleteOutboundShipmentLine,
            Result<String, DeleteOutboundShipmentLineError>,
        >,
    >,
    pub insert_service_line: Vec<
        InputWithResult<
            InsertOutboundShipmentServiceLine,
            Result<InvoiceLine, InsertOutboundShipmentServiceLineError>,
        >,
    >,
    pub update_service_line: Vec<
        InputWithResult<
            UpdateOutboundShipmentServiceLine,
            Result<InvoiceLine, UpdateOutboundShipmentServiceLineError>,
        >,
    >,
    pub delete_service_line: Vec<
        InputWithResult<
            DeleteOutboundShipmentLine,
            Result<String, DeleteOutboundShipmentServiceLineError>,
        >,
    >,
    pub insert_unallocated_line: Vec<
        InputWithResult<
            InsertOutboundShipmentUnallocatedLine,
            Result<InvoiceLine, InsertOutboundShipmentUnallocatedLineError>,
        >,
    >,
    pub update_unallocated_line: Vec<
        InputWithResult<
            UpdateOutboundShipmentUnallocatedLine,
            Result<InvoiceLine, UpdateOutboundShipmentUnallocatedLineError>,
        >,
    >,
    pub delete_unallocated_line: Vec<
        InputWithResult<
            DeleteOutboundShipmentUnallocatedLine,
            Result<String, DeleteOutboundShipmentUnallocatedLineError>,
        >,
    >,
    pub update_shipment:
        Vec<InputWithResult<UpdateOutboundShipment, Result<Invoice, UpdateOutboundShipmentError>>>,
    pub delete_shipment: Vec<InputWithResult<String, Result<String, DeleteOutboundShipmentError>>>,
}

pub struct DoMutationResult<T> {
    pub has_errors: bool,
    pub results: Vec<T>,
}

pub fn do_mutations<I, R, E, M>(
    ctx: &ServiceContext,
    store_id: &str,
    inputs: Vec<I>,
    mutation: M,
) -> (bool, Vec<InputWithResult<I, Result<R, E>>>)
where
    I: Clone,
    M: Fn(&ServiceContext, &str, I) -> Result<R, E>,
{
    let mut has_errors = false;
    let mut results = vec![];

    for input in inputs {
        let mutation_result = mutation(ctx, store_id, input.clone());
        has_errors = has_errors || mutation_result.is_err();
        results.push(InputWithResult {
            input,
            result: mutation_result,
        });
    }

    (has_errors, results)
}

pub fn batch_outbound_shipment(
    ctx: &ServiceContext,
    store_id: &str,
    input: BatchOutboundShipment,
) -> Result<BatchOutboundShipmentResult, RepositoryError> {
    let result = ctx
        .connection
        .transaction_sync(|_| {
            let continue_on_error = input.continue_on_error.unwrap_or(false);
            let mut result = BatchOutboundShipmentResult {
                insert_shipment: vec![],
                insert_line: vec![],
                update_line: vec![],
                delete_line: vec![],
                insert_service_line: vec![],
                update_service_line: vec![],
                delete_service_line: vec![],
                insert_unallocated_line: vec![],
                update_unallocated_line: vec![],
                delete_unallocated_line: vec![],
                update_shipment: vec![],
                delete_shipment: vec![],
            };

            // Insert Shipment

            let (has_error, results) = do_mutations(
                ctx,
                store_id,
                input.insert_shipment.unwrap_or(vec![]),
                insert_outbound_shipment,
            );
            result.insert_shipment = results;

            if has_error && !continue_on_error {
                return Err(WithDBError::err(result));
            }

            // Normal Line

            let (has_error, results) = do_mutations(
                ctx,
                store_id,
                input.insert_line.unwrap_or(vec![]),
                insert_outbound_shipment_line,
            );
            result.insert_line = results;

            if has_error && !continue_on_error {
                return Err(WithDBError::err(result));
            }

            let (has_error, results) = do_mutations(
                ctx,
                store_id,
                input.update_line.unwrap_or(vec![]),
                update_outbound_shipment_line,
            );
            result.update_line = results;

            if has_error && !continue_on_error {
                return Err(WithDBError::err(result));
            }

            let (has_error, results) = do_mutations(
                ctx,
                store_id,
                input.delete_line.unwrap_or(vec![]),
                delete_outbound_shipment_line,
            );
            result.delete_line = results;

            if has_error && !continue_on_error {
                return Err(WithDBError::err(result));
            }

            // Service Line

            let (has_error, results) = do_mutations(
                ctx,
                store_id,
                input.insert_service_line.unwrap_or(vec![]),
                insert_outbound_shipment_service_line,
            );
            result.insert_service_line = results;

            if has_error && !continue_on_error {
                return Err(WithDBError::err(result));
            }

            let (has_error, results) = do_mutations(
                ctx,
                store_id,
                input.update_service_line.unwrap_or(vec![]),
                update_outbound_shipment_service_line,
            );
            result.update_service_line = results;

            if has_error && !continue_on_error {
                return Err(WithDBError::err(result));
            }

            let (has_error, results) = do_mutations(
                ctx,
                store_id,
                input.delete_service_line.unwrap_or(vec![]),
                delete_outbound_shipment_service_line,
            );
            result.delete_service_line = results;

            if has_error && !continue_on_error {
                return Err(WithDBError::err(result));
            }

            // Unallocated line

            let (has_error, results) = do_mutations(
                ctx,
                store_id,
                input.insert_unallocated_line.unwrap_or(vec![]),
                insert_outbound_shipment_unallocated_line,
            );
            result.insert_unallocated_line = results;

            if has_error && !continue_on_error {
                return Err(WithDBError::err(result));
            }

            let (has_error, results) = do_mutations(
                ctx,
                store_id,
                input.update_unallocated_line.unwrap_or(vec![]),
                update_outbound_shipment_unallocated_line,
            );
            result.update_unallocated_line = results;

            if has_error && !continue_on_error {
                return Err(WithDBError::err(result));
            }

            let (has_error, results) = do_mutations(
                ctx,
                store_id,
                input.delete_unallocated_line.unwrap_or(vec![]),
                delete_outbound_shipment_unallocated_line,
            );
            result.delete_unallocated_line = results;

            if has_error && !continue_on_error {
                return Err(WithDBError::err(result));
            }

            // Update and delete shipment

            let (has_error, results) = do_mutations(
                ctx,
                store_id,
                input.update_shipment.unwrap_or(vec![]),
                update_outbound_shipment,
            );
            result.update_shipment = results;

            if has_error && !continue_on_error {
                return Err(WithDBError::err(result));
            }

            let (has_error, results) = do_mutations(
                ctx,
                store_id,
                input.delete_shipment.unwrap_or(vec![]),
                delete_outbound_shipment,
            );
            result.delete_shipment = results;

            if has_error && !continue_on_error {
                return Err(WithDBError::err(result));
            }

            Ok(result)
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
            mock_inbound_shipment_a, mock_item_a, mock_name_store_b, mock_stock_line_a,
            MockDataInserts,
        },
        test_db::setup_all,
        InvoiceLineRowRepository, InvoiceRepository,
    };
    use util::inline_init;

    use crate::{
        invoice::outbound_shipment::{
            BatchOutboundShipment, DeleteOutboundShipmentError, InsertOutboundShipment,
        },
        invoice_line::outbound_shipment_line::InsertOutboundShipmentLine,
        service_provider::ServiceProvider,
        InputWithResult,
    };

    #[actix_rt::test]
    async fn batch_outbound_shipment_service() {
        let (_, connection, connection_manager, _) =
            setup_all("batch_outbound_shipment_service", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.invoice_service;

        let delete_shipment_input = mock_inbound_shipment_a().id;

        let mut input = BatchOutboundShipment {
            insert_shipment: Some(vec![inline_init(|input: &mut InsertOutboundShipment| {
                input.id = "new_id".to_string();
                input.other_party_id = mock_name_store_b().id;
            })]),
            insert_line: Some(vec![inline_init(
                |input: &mut InsertOutboundShipmentLine| {
                    input.invoice_id = "new_id".to_string();
                    input.id = "new_line_id".to_string();
                    input.item_id = mock_item_a().id;
                    input.stock_line_id = mock_stock_line_a().id;
                    input.number_of_packs = 1
                },
            )]),
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
        };

        // Test rollback
        let result = service
            .batch_outbound_shipment(&context, "store_a", input.clone())
            .unwrap();

        assert_eq!(
            result.delete_shipment,
            vec![InputWithResult {
                input: delete_shipment_input,
                result: Err(DeleteOutboundShipmentError::NotAnOutboundShipment {})
            }]
        );

        assert_eq!(
            InvoiceRepository::new(&connection)
                .find_one_by_id_option("new_id")
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

        service
            .batch_outbound_shipment(&context, "store_a", input)
            .unwrap();

        assert_ne!(
            InvoiceRepository::new(&connection)
                .find_one_by_id_option("new_id")
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
