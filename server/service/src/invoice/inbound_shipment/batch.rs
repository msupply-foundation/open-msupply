use repository::{Invoice, InvoiceLine, OkWithRollback, RepositoryError};

use crate::{
    invoice_line::inbound_shipment_line::{
        delete_inbound_shipment_line, insert_inbound_shipment_line, update_inbound_shipment_line,
        DeleteInboundShipmentLine, DeleteInboundShipmentLineError, InsertInboundShipmentLine,
        InsertInboundShipmentLineError, UpdateInboundShipmentLine, UpdateInboundShipmentLineError,
    },
    service_provider::ServiceContext,
    InputWithResult,
};

use super::{
    delete_inbound_shipment, insert_inbound_shipment, update_inbound_shipment,
    DeleteInboundShipment, DeleteInboundShipmentError, InsertInboundShipment,
    InsertInboundShipmentError, UpdateInboundShipment, UpdateInboundShipmentError,
};

#[derive(Clone)]
pub struct BatchInboundShipment {
    pub insert_shipment: Option<Vec<InsertInboundShipment>>,
    pub insert_line: Option<Vec<InsertInboundShipmentLine>>,
    pub update_line: Option<Vec<UpdateInboundShipmentLine>>,
    pub delete_line: Option<Vec<DeleteInboundShipmentLine>>,
    pub update_shipment: Option<Vec<UpdateInboundShipment>>,
    pub delete_shipment: Option<Vec<DeleteInboundShipment>>,
    pub continue_on_error: Option<bool>,
}

#[derive(Debug)]
pub struct BatchInboundShipmentResult {
    pub insert_shipment:
        Vec<InputWithResult<InsertInboundShipment, Result<Invoice, InsertInboundShipmentError>>>,
    pub insert_line: Vec<
        InputWithResult<
            InsertInboundShipmentLine,
            Result<InvoiceLine, InsertInboundShipmentLineError>,
        >,
    >,
    pub update_line: Vec<
        InputWithResult<
            UpdateInboundShipmentLine,
            Result<InvoiceLine, UpdateInboundShipmentLineError>,
        >,
    >,
    pub delete_line: Vec<
        InputWithResult<DeleteInboundShipmentLine, Result<String, DeleteInboundShipmentLineError>>,
    >,
    pub update_shipment:
        Vec<InputWithResult<UpdateInboundShipment, Result<Invoice, UpdateInboundShipmentError>>>,
    pub delete_shipment:
        Vec<InputWithResult<DeleteInboundShipment, Result<String, DeleteInboundShipmentError>>>,
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
        has_errors = mutation_result.is_err();
        results.push(InputWithResult {
            input,
            result: mutation_result,
        });
    }

    (has_errors, results)
}

pub fn batch_inbound_shipment(
    ctx: &ServiceContext,
    store_id: &str,
    input: BatchInboundShipment,
) -> Result<BatchInboundShipmentResult, RepositoryError> {
    let result = ctx
        .connection
        .transaction_sync_with_rollback(|_| {
            let continue_on_error = input.continue_on_error.unwrap_or(false);
            let mut result = BatchInboundShipmentResult {
                insert_shipment: vec![],
                insert_line: vec![],
                update_line: vec![],
                delete_line: vec![],
                update_shipment: vec![],
                delete_shipment: vec![],
            };

            let (has_error, results) = do_mutations(
                ctx,
                store_id,
                input.insert_shipment.unwrap_or(vec![]),
                insert_inbound_shipment,
            );
            result.insert_shipment = results;

            if has_error && !continue_on_error {
                return Ok(OkWithRollback::OkWithRollback(result));
            }

            let (has_error, results) = do_mutations(
                ctx,
                store_id,
                input.insert_line.unwrap_or(vec![]),
                insert_inbound_shipment_line,
            );
            result.insert_line = results;

            if has_error && !continue_on_error {
                return Ok(OkWithRollback::OkWithRollback(result));
            }

            let (has_error, results) = do_mutations(
                ctx,
                store_id,
                input.update_line.unwrap_or(vec![]),
                update_inbound_shipment_line,
            );
            result.update_line = results;

            if has_error && !continue_on_error {
                return Ok(OkWithRollback::OkWithRollback(result));
            }

            let (has_error, results) = do_mutations(
                ctx,
                store_id,
                input.delete_line.unwrap_or(vec![]),
                delete_inbound_shipment_line,
            );
            result.delete_line = results;

            if has_error && !continue_on_error {
                return Ok(OkWithRollback::OkWithRollback(result));
            }
            let (has_error, results) = do_mutations(
                ctx,
                store_id,
                input.update_shipment.unwrap_or(vec![]),
                update_inbound_shipment,
            );
            result.update_shipment = results;

            if has_error && !continue_on_error {
                return Ok(OkWithRollback::OkWithRollback(result));
            }

            let (has_error, results) = do_mutations(
                ctx,
                store_id,
                input.delete_shipment.unwrap_or(vec![]),
                delete_inbound_shipment,
            );
            result.delete_shipment = results;

            let result: Result<OkWithRollback<BatchInboundShipmentResult>, RepositoryError> =
                if has_error && !continue_on_error {
                    Ok(OkWithRollback::OkWithRollback(result))
                } else {
                    Ok(OkWithRollback::Ok(result))
                };

            result
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(result)
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{mock_item_a, mock_name_a, mock_outbound_shipment_b, MockDataInserts},
        test_db::setup_all,
        InvoiceLineRowRepository, InvoiceRepository,
    };
    use util::inline_init;

    use crate::{
        invoice::inbound_shipment::{
            BatchInboundShipment, DeleteInboundShipment, DeleteInboundShipmentError,
            InsertInboundShipment,
        },
        invoice_line::inbound_shipment_line::InsertInboundShipmentLine,
        service_provider::ServiceProvider, InputWithResult,
    };

    #[actix_rt::test]
    async fn batch_inbound_shipment_service() {
        let (_, connection, connection_manager, _) =
            setup_all("batch_inbound_shipment_service", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.invoice_service;

        let delete_shipment_input = inline_init(|input: &mut DeleteInboundShipment| {
            input.id = mock_outbound_shipment_b().id;
        });

        let mut input = BatchInboundShipment {
            insert_shipment: Some(vec![inline_init(|input: &mut InsertInboundShipment| {
                input.id = "new_id".to_string();
                input.other_party_id = mock_name_a().id;
            })]),
            insert_line: Some(vec![inline_init(
                |input: &mut InsertInboundShipmentLine| {
                    input.invoice_id = "new_id".to_string();
                    input.id = "new_line_id".to_string();
                    input.item_id = mock_item_a().id;
                    input.pack_size = 1;
                    input.number_of_packs = 1;
                },
            )]),
            update_line: None,
            delete_line: None,
            update_shipment: None,
            delete_shipment: Some(vec![delete_shipment_input.clone()]),
            continue_on_error: None,
        };

        // Test rollback
        let result = service
            .batch_inbound_shipment(&context, "store_a", input.clone())
            .unwrap();

        assert_eq!(
            result.delete_shipment,
            vec![InputWithResult {
                input: delete_shipment_input,
                result: Err(DeleteInboundShipmentError::NotAnInboundShipment {})
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
            .batch_inbound_shipment(&context, "store_a", input)
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
