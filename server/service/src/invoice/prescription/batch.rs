use repository::{Invoice, InvoiceLine, RepositoryError};

use crate::{
    invoice_line::stock_out_line::{
        delete_stock_out_line, insert_stock_out_line, set_prescribed_quantity,
        update_stock_out_line, DeleteStockOutLine, DeleteStockOutLineError, InsertStockOutLine,
        InsertStockOutLineError, SetPrescribedQuantity, SetPrescribedQuantityError,
        UpdateStockOutLine, UpdateStockOutLineError,
    },
    service_provider::ServiceContext,
    BatchMutationsProcessor, InputWithResult, WithDBError,
};

use super::{
    delete_prescription, insert_prescription, update_prescription, DeletePrescriptionError,
    InsertPrescription, InsertPrescriptionError, UpdatePrescription, UpdatePrescriptionError,
};

#[derive(Debug, Clone)]
pub struct BatchPrescription {
    pub insert_prescription: Option<Vec<InsertPrescription>>,
    pub insert_line: Option<Vec<InsertStockOutLine>>,
    pub update_line: Option<Vec<UpdateStockOutLine>>,
    pub delete_line: Option<Vec<DeleteStockOutLine>>,
    pub update_prescription: Option<Vec<UpdatePrescription>>,
    pub delete_prescription: Option<Vec<String>>,
    pub continue_on_error: Option<bool>,
    pub set_prescribed_quantity: Option<Vec<SetPrescribedQuantity>>,
}

pub type InsertPrescriptionsResult =
    Vec<InputWithResult<InsertPrescription, Result<Invoice, InsertPrescriptionError>>>;
pub type InsertLinesResult =
    Vec<InputWithResult<InsertStockOutLine, Result<InvoiceLine, InsertStockOutLineError>>>;
pub type UpdateLinesResult =
    Vec<InputWithResult<UpdateStockOutLine, Result<InvoiceLine, UpdateStockOutLineError>>>;
pub type DeleteLinesResult =
    Vec<InputWithResult<DeleteStockOutLine, Result<String, DeleteStockOutLineError>>>;
pub type UpdatePrescriptionsResult =
    Vec<InputWithResult<UpdatePrescription, Result<Invoice, UpdatePrescriptionError>>>;
pub type DeletePrescriptionsResult =
    Vec<InputWithResult<String, Result<String, DeletePrescriptionError>>>;
pub type SetPrescribedQuantityResult =
    Vec<InputWithResult<SetPrescribedQuantity, Result<InvoiceLine, SetPrescribedQuantityError>>>;

#[derive(Debug, Default)]
pub struct BatchPrescriptionResult {
    pub insert_prescription: InsertPrescriptionsResult,
    pub insert_line: InsertLinesResult,
    pub update_line: UpdateLinesResult,
    pub delete_line: DeleteLinesResult,
    pub update_prescription: UpdatePrescriptionsResult,
    pub delete_prescription: DeletePrescriptionsResult,
    pub set_prescribed_quantity: SetPrescribedQuantityResult,
}

pub fn batch_prescription(
    ctx: &ServiceContext,
    input: BatchPrescription,
) -> Result<BatchPrescriptionResult, RepositoryError> {
    let result = ctx
        .connection
        .transaction_sync(|_| {
            let continue_on_error = input.continue_on_error.unwrap_or(false);
            let mut results = BatchPrescriptionResult::default();

            let mutations_processor = BatchMutationsProcessor::new(ctx);

            // Insert Prescription
            let (has_errors, result) = mutations_processor
                .do_mutations(input.insert_prescription, insert_prescription);
            results.insert_prescription = result;
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

            let (has_errors, result) = mutations_processor
                .do_mutations(input.set_prescribed_quantity, set_prescribed_quantity);
            results.set_prescribed_quantity = result;
            if has_errors && !continue_on_error {
                return Err(WithDBError::err(results));
            }

            // Update and delete prescription
            let (has_errors, result) =
                mutations_processor.do_mutations(input.update_prescription, update_prescription);
            results.update_prescription = result;
            if has_errors && !continue_on_error {
                return Err(WithDBError::err(results));
            }

            let (has_errors, result) =
                mutations_processor.do_mutations(input.delete_prescription, delete_prescription);
            results.delete_prescription = result;
            if has_errors && !continue_on_error {
                return Err(WithDBError::err(results));
            }

            Ok(results) as Result<BatchPrescriptionResult, WithDBError<BatchPrescriptionResult>>
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
            mock_inbound_shipment_a, mock_patient, mock_stock_line_a, mock_store_a, MockDataInserts,
        },
        test_db::setup_all,
        InvoiceLineRowRepository, InvoiceRowRepository,
    };

    use crate::{
        invoice::{BatchPrescription, DeletePrescriptionError, InsertPrescription},
        invoice_line::stock_out_line::{InsertStockOutLine, StockOutType},
        service_provider::ServiceProvider,
        InputWithResult,
    };

    #[actix_rt::test]
    async fn batch_prescription_service() {
        let (_, connection, connection_manager, _) =
            setup_all("batch_prescription_service", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_service;

        let delete_shipment_input = mock_inbound_shipment_a().id;

        let mut input = BatchPrescription {
            insert_prescription: Some(vec![InsertPrescription {
                id: "new_id".to_string(),
                patient_id: mock_patient().id,
                ..Default::default()
            }]),
            insert_line: Some(vec![InsertStockOutLine {
                invoice_id: "new_id".to_string(),
                r#type: StockOutType::Prescription,
                id: "new_line_id".to_string(),
                stock_line_id: mock_stock_line_a().id,
                number_of_packs: 1.0,
                ..Default::default()
            }]),
            update_line: None,
            delete_line: None,
            update_prescription: None,
            delete_prescription: Some(vec![delete_shipment_input.clone()]),
            continue_on_error: None,
            set_prescribed_quantity: None,
        };

        // Test rollback
        let result = service.batch_prescription(&context, input.clone()).unwrap();

        assert_eq!(
            result.delete_prescription,
            vec![InputWithResult {
                input: delete_shipment_input,
                result: Err(DeletePrescriptionError::NotAPrescriptionInvoice {})
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
                .find_one_by_id("new_line_id")
                .unwrap(),
            None
        );

        // Test no rollback
        input.continue_on_error = Some(true);

        service.batch_prescription(&context, input).unwrap();

        assert_ne!(
            InvoiceRowRepository::new(&connection)
                .find_one_by_id("new_id")
                .unwrap(),
            None
        );

        assert_ne!(
            InvoiceLineRowRepository::new(&connection)
                .find_one_by_id("new_line_id")
                .unwrap(),
            None
        );
    }
}
