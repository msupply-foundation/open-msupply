use repository::{Invoice, RepositoryError};

use crate::{invoice::query::get_invoice, service_provider::ServiceContext};

pub mod generate;
pub mod validate;
use generate::{generate, ManagePlaceholderLine};
use validate::validate;

use self::generate::GenerateResult;

use super::{
    outbound_shipment_unallocated_line::{
        delete_outbound_shipment_unallocated_line, insert_outbound_shipment_unallocated_line,
        update_outbound_shipment_unallocated_line, DeleteOutboundShipmentUnallocatedLineError,
        InsertOutboundShipmentUnallocatedLineError, UpdateOutboundShipmentUnallocatedLineError,
    },
    stock_out_line::{
        delete_stock_out_line, insert_stock_out_line, set_prescribed_quantity,
        update_stock_out_line, DeleteStockOutLineError, InsertStockOutLineError,
        SetPrescribedQuantity, SetPrescribedQuantityError, UpdateStockOutLineError,
    },
};

#[derive(Clone, Debug, Default, PartialEq)]
pub struct SaveStockOutInvoiceLines {
    pub invoice_id: String,
    pub item_id: String,
    pub lines: Vec<SaveStockOutInvoiceLine>,
    pub placeholder_quantity: Option<f64>,
    pub prescribed_quantity: Option<f64>,
}

#[derive(Clone, Debug, Default, PartialEq)]
pub struct SaveStockOutInvoiceLine {
    pub id: String,
    pub number_of_packs: f64,
    pub stock_line_id: String,
}

#[derive(PartialEq, Debug)]
pub enum SaveStockOutInvoiceLinesError {
    OutboundShipmentNotFound,
    PrescriptionNotFound,
    InvalidInvoiceType,
    InvoiceDoesNotBelongToCurrentStore,
    InvoiceNotEditable,
    NotAnOutboundShipment,
    UpdatedShipmentDoesNotExist,
    // Line Errors
    LineInsertError {
        line_id: String,
        error: InsertStockOutLineError,
    },
    LineUpdateError {
        line_id: String,
        error: UpdateStockOutLineError,
    },
    LineDeleteError {
        line_id: String,
        error: DeleteStockOutLineError,
    },
    PlaceholderError(PlaceholderError),
    PrescribedQuantityError(SetPrescribedQuantityError),
    DatabaseError(RepositoryError),
}

#[derive(PartialEq, Debug)]
pub enum PlaceholderError {
    InsertError(InsertOutboundShipmentUnallocatedLineError),
    UpdateError(UpdateOutboundShipmentUnallocatedLineError),
    DeleteError(DeleteOutboundShipmentUnallocatedLineError),
}

pub fn save_outbound_shipment_item_lines(
    ctx: &ServiceContext,
    input: SaveStockOutInvoiceLines,
) -> Result<Invoice, SaveStockOutInvoiceLinesError> {
    let invoice = ctx
        .connection
        .transaction_sync(|connection| {
            let invoice = validate(connection, &ctx.store_id, &input.invoice_id)?;

            let GenerateResult {
                lines_to_add,
                lines_to_update,
                lines_to_delete,
                manage_placeholder,
            } = generate(connection, invoice, input.clone())?;

            for line in lines_to_add {
                insert_stock_out_line(ctx, line.clone()).map_err(|error| {
                    SaveStockOutInvoiceLinesError::LineInsertError {
                        line_id: line.id,
                        error,
                    }
                })?;
            }

            for line in lines_to_update {
                update_stock_out_line(ctx, line.clone()).map_err(|error| {
                    SaveStockOutInvoiceLinesError::LineUpdateError {
                        line_id: line.id,
                        error,
                    }
                })?;
            }

            for line in lines_to_delete {
                delete_stock_out_line(ctx, line.clone()).map_err(|error| {
                    SaveStockOutInvoiceLinesError::LineDeleteError {
                        line_id: line.id,
                        error,
                    }
                })?;
            }

            match manage_placeholder {
                ManagePlaceholderLine::Insert(input) => {
                    insert_outbound_shipment_unallocated_line(ctx, input).map_err(|error| {
                        SaveStockOutInvoiceLinesError::PlaceholderError(
                            PlaceholderError::InsertError(error),
                        )
                    })?;
                }
                ManagePlaceholderLine::Update(input) => {
                    update_outbound_shipment_unallocated_line(ctx, input).map_err(|error| {
                        SaveStockOutInvoiceLinesError::PlaceholderError(
                            PlaceholderError::UpdateError(error),
                        )
                    })?;
                }
                ManagePlaceholderLine::Delete(input) => {
                    delete_outbound_shipment_unallocated_line(ctx, input).map_err(|error| {
                        SaveStockOutInvoiceLinesError::PlaceholderError(
                            PlaceholderError::DeleteError(error),
                        )
                    })?;
                }
                ManagePlaceholderLine::NothingToDo => {}
            };

            // Set the prescribed quanity if it is provided
            // Note this means it's not clearable, which I think is ok?
            if let Some(prescribed_quantity) = input.prescribed_quantity {
                set_prescribed_quantity(
                    ctx,
                    SetPrescribedQuantity {
                        invoice_id: input.invoice_id.clone(),
                        item_id: input.item_id.clone(),
                        prescribed_quantity,
                    },
                )
                .map_err(|error| SaveStockOutInvoiceLinesError::PrescribedQuantityError(error))?;
            }

            get_invoice(ctx, None, &input.invoice_id)
                .map_err(SaveStockOutInvoiceLinesError::DatabaseError)?
                .ok_or(SaveStockOutInvoiceLinesError::UpdatedShipmentDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(invoice)
}

impl From<RepositoryError> for SaveStockOutInvoiceLinesError {
    fn from(error: RepositoryError) -> Self {
        SaveStockOutInvoiceLinesError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use crate::{
        invoice_line::{
            save_outbound_shipment_item_lines::{
                SaveStockOutInvoiceLine, SaveStockOutInvoiceLines,
                SaveStockOutInvoiceLinesError as ServiceError,
            },
            stock_out_line::InsertStockOutLineError,
        },
        service_provider::ServiceProvider,
    };
    use repository::{
        mock::{
            mock_customer_return_a, mock_item_a, mock_name_store_b, mock_outbound_shipment_a,
            mock_stock_line_a, mock_stock_line_b, mock_stock_line_vaccine_item_a, mock_store_a,
            mock_store_b, mock_user_account_a, MockData, MockDataInserts,
        },
        test_db::setup_all_with_data,
        InvoiceLineRow, InvoiceLineRowRepository, InvoiceLineType, InvoiceRow, InvoiceStatus,
        InvoiceType,
    };

    #[actix_rt::test]
    async fn test_save_outbound_shipment_lines_errors() {
        fn base_test_shipment() -> InvoiceRow {
            InvoiceRow {
                store_id: mock_store_b().id,
                name_link_id: mock_name_store_b().id,
                // currency_id: Some(currency_a().id),
                r#type: InvoiceType::OutboundShipment,
                status: InvoiceStatus::New,
                ..Default::default()
            }
        }
        fn wrong_store() -> InvoiceRow {
            InvoiceRow {
                id: "wrong_store".to_string(),
                store_id: mock_store_a().id,
                ..base_test_shipment()
            }
        }

        fn verified_shipment() -> InvoiceRow {
            InvoiceRow {
                id: "verified_shipment".to_string(),
                status: InvoiceStatus::Verified,
                ..base_test_shipment()
            }
        }
        fn wrong_store_shipment_line() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "wrong_store_shipment_line".to_string(),
                invoice_id: wrong_store().id,
                item_link_id: mock_item_a().id,
                ..Default::default()
            }
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "test_save_outbound_shipment_lines_errors",
            MockDataInserts::all(),
            MockData {
                invoices: vec![wrong_store(), verified_shipment()],
                invoice_lines: vec![wrong_store_shipment_line()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_b().id, mock_user_account_a().id)
            .unwrap();

        // OutboundShipmentNotFound
        assert_eq!(
            service_provider
                .invoice_line_service
                .save_outbound_shipment_item_lines(
                    &context,
                    SaveStockOutInvoiceLines {
                        invoice_id: "non-existent-id".to_string(),
                        ..Default::default()
                    }
                ),
            Err(ServiceError::OutboundShipmentNotFound)
        );

        // NotAOutboundShipment
        assert_eq!(
            service_provider
                .invoice_line_service
                .save_outbound_shipment_item_lines(
                    &context,
                    SaveStockOutInvoiceLines {
                        invoice_id: mock_customer_return_a().id,
                        ..Default::default()
                    }
                ),
            Err(ServiceError::NotAnOutboundShipment)
        );

        // InvoiceDoesNotBelongToCurrentStore
        assert_eq!(
            service_provider
                .invoice_line_service
                .save_outbound_shipment_item_lines(
                    &context,
                    SaveStockOutInvoiceLines {
                        invoice_id: wrong_store().id,
                        ..Default::default()
                    }
                ),
            Err(ServiceError::InvoiceDoesNotBelongToCurrentStore)
        );

        // InvoiceNotEditable
        assert_eq!(
            service_provider
                .invoice_line_service
                .save_outbound_shipment_item_lines(
                    &context,
                    SaveStockOutInvoiceLines {
                        invoice_id: verified_shipment().id,
                        ..Default::default()
                    }
                ),
            Err(ServiceError::InvoiceNotEditable)
        );

        // LineInsertError
        assert_eq!(
            service_provider
                .invoice_line_service
                .save_outbound_shipment_item_lines(
                    &context,
                    SaveStockOutInvoiceLines {
                        invoice_id: mock_outbound_shipment_a().id,
                        item_id: mock_item_a().id,
                        lines: vec![SaveStockOutInvoiceLine {
                            id: "new_line".to_string(),
                            number_of_packs: 1000.0,
                            stock_line_id: mock_stock_line_vaccine_item_a().id
                        }],
                        ..Default::default()
                    }
                ),
            Err(ServiceError::LineInsertError {
                line_id: "new_line".to_string(),
                error: InsertStockOutLineError::ReductionBelowZero {
                    stock_line_id: mock_stock_line_vaccine_item_a().id
                },
            }),
        );
    }
    // TODO Tests for prescriptions with prescribed quantity

    #[actix_rt::test]
    async fn test_save_outbound_shipment_lines_success() {
        fn outbound_to_edit() -> InvoiceRow {
            InvoiceRow {
                id: "outbound_to_edit".to_string(),
                store_id: mock_store_b().id,
                name_link_id: mock_name_store_b().id,
                r#type: InvoiceType::OutboundShipment,
                status: InvoiceStatus::New,
                ..Default::default()
            }
        }
        fn line_to_update() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "line_to_update".to_string(),
                invoice_id: outbound_to_edit().id,
                item_link_id: mock_item_a().id,
                stock_line_id: Some(mock_stock_line_a().id),
                number_of_packs: 5.0,
                ..Default::default()
            }
        }
        fn line_to_delete() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "line_to_delete".to_string(),
                invoice_id: outbound_to_edit().id,
                item_link_id: mock_item_a().id,
                number_of_packs: 5.0,
                ..Default::default()
            }
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "test_save_outbound_shipment_lines_success",
            MockDataInserts::all(),
            MockData {
                invoices: vec![outbound_to_edit()],
                invoice_lines: vec![line_to_update(), line_to_delete()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_b().id, mock_user_account_a().id)
            .unwrap();

        service_provider
            .invoice_line_service
            .save_outbound_shipment_item_lines(
                &context,
                SaveStockOutInvoiceLines {
                    invoice_id: outbound_to_edit().id,
                    item_id: mock_item_a().id,
                    lines: vec![
                        SaveStockOutInvoiceLine {
                            id: "line1".to_string(), // create
                            number_of_packs: 1.0,
                            stock_line_id: mock_stock_line_b().id,
                        },
                        SaveStockOutInvoiceLine {
                            id: line_to_update().id,
                            number_of_packs: 2.0,
                            stock_line_id: mock_stock_line_a().id,
                        },
                        SaveStockOutInvoiceLine {
                            id: line_to_delete().id,
                            number_of_packs: 0.0,
                            ..Default::default()
                        },
                    ],
                    placeholder_quantity: Some(5.0),
                    prescribed_quantity: None,
                },
            )
            .unwrap();

        let updated_lines = InvoiceLineRowRepository::new(&connection)
            .find_many_by_invoice_id(&outbound_to_edit().id)
            .unwrap();

        assert_eq!(updated_lines.len(), 3);

        // new line was added
        assert!(updated_lines.iter().any(|line| line.id == "line1"));

        // placeholder line was added
        assert!(updated_lines
            .iter()
            .any(|line| line.r#type == InvoiceLineType::UnallocatedStock
                && line.number_of_packs == 5.0));

        // existing line was updated
        let updated_line = updated_lines
            .iter()
            .find(|line| line.id == line_to_update().id)
            .unwrap();
        assert_eq!(updated_line.number_of_packs, 2.0);

        // zeroed line was deleted
        assert!(!updated_lines
            .iter()
            .any(|line| line.id == line_to_delete().id));
    }
}
