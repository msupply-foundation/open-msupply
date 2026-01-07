use repository::{Invoice, InvoiceLineRowRepository, RepositoryError};

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
pub struct SaveStockOutItemLines {
    pub invoice_id: String,
    pub item_id: String,
    pub lines: Vec<SaveStockOutInvoiceLine>,
    pub placeholder_quantity: Option<f64>,
    pub prescribed_quantity: Option<f64>,
    pub note: Option<String>,
}

#[derive(Clone, Debug, Default, PartialEq)]
pub struct SaveStockOutInvoiceLine {
    pub id: String,
    pub number_of_packs: f64,
    pub stock_line_id: String,
    pub campaign_id: Option<String>,
    pub program_id: Option<String>,
    pub vvm_status_id: Option<String>,
}

#[derive(PartialEq, Debug)]
pub enum SaveStockOutItemLinesError {
    InvoiceNotFound,
    InvalidInvoiceType,
    InvoiceDoesNotBelongToCurrentStore,
    InvoiceNotEditable,
    NotAStockOutInvoice,
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

pub fn save_stock_out_item_lines(
    ctx: &ServiceContext,
    input: SaveStockOutItemLines,
) -> Result<Invoice, SaveStockOutItemLinesError> {
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
                    SaveStockOutItemLinesError::LineInsertError {
                        line_id: line.id,
                        error,
                    }
                })?;
            }

            for line in lines_to_update {
                update_stock_out_line(ctx, line.clone()).map_err(|error| {
                    SaveStockOutItemLinesError::LineUpdateError {
                        line_id: line.id,
                        error,
                    }
                })?;
            }

            for line in lines_to_delete {
                delete_stock_out_line(ctx, line.clone()).map_err(|error| {
                    SaveStockOutItemLinesError::LineDeleteError {
                        line_id: line.id,
                        error,
                    }
                })?;
            }

            match manage_placeholder {
                ManagePlaceholderLine::Insert(input) => {
                    insert_outbound_shipment_unallocated_line(ctx, input).map_err(|error| {
                        SaveStockOutItemLinesError::PlaceholderError(PlaceholderError::InsertError(
                            error,
                        ))
                    })?;
                }
                ManagePlaceholderLine::Update(input) => {
                    update_outbound_shipment_unallocated_line(ctx, input).map_err(|error| {
                        SaveStockOutItemLinesError::PlaceholderError(PlaceholderError::UpdateError(
                            error,
                        ))
                    })?;
                }
                ManagePlaceholderLine::Delete(input) => {
                    delete_outbound_shipment_unallocated_line(ctx, input).map_err(|error| {
                        SaveStockOutItemLinesError::PlaceholderError(PlaceholderError::DeleteError(
                            error,
                        ))
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
                .map_err(SaveStockOutItemLinesError::PrescribedQuantityError)?;
            }

            if let Some(note) = input.note {
                let repo = InvoiceLineRowRepository::new(connection);
                // Pretty sure that item_id is ok as item_link_id here, as we're saving a new record?
                repo.update_note_by_invoice_and_item_id(
                    &input.invoice_id,
                    &input.item_id,
                    Some(note),
                )?;
                // TODO: Should we be able to remove the note e.g. nullable update?
            }

            get_invoice(ctx, None, &input.invoice_id)
                .map_err(SaveStockOutItemLinesError::DatabaseError)?
                .ok_or(SaveStockOutItemLinesError::UpdatedShipmentDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(invoice)
}

impl From<RepositoryError> for SaveStockOutItemLinesError {
    fn from(error: RepositoryError) -> Self {
        SaveStockOutItemLinesError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use crate::{
        invoice_line::{
            save_stock_out_item_lines::{
                SaveStockOutInvoiceLine, SaveStockOutItemLines,
                SaveStockOutItemLinesError as ServiceError,
            },
            stock_out_line::InsertStockOutLineError,
        },
        service_provider::ServiceProvider,
    };
    use repository::{
        mock::{
            mock_item_a, mock_name_store_b, mock_outbound_shipment_a, mock_stock_line_a,
            mock_stock_line_b, mock_stock_line_vaccine_item_a, mock_store_a, mock_store_b,
            mock_transferred_inbound_shipment_a, mock_user_account_a, MockData, MockDataInserts,
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
                name_id: mock_name_store_b().id,
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
                .save_stock_out_item_lines(
                    &context,
                    SaveStockOutItemLines {
                        invoice_id: "non-existent-id".to_string(),
                        ..Default::default()
                    }
                ),
            Err(ServiceError::InvoiceNotFound)
        );

        // NotAStockOutInvoice
        assert_eq!(
            service_provider
                .invoice_line_service
                .save_stock_out_item_lines(
                    &context,
                    SaveStockOutItemLines {
                        invoice_id: mock_transferred_inbound_shipment_a().id,
                        ..Default::default()
                    }
                ),
            Err(ServiceError::NotAStockOutInvoice)
        );

        // InvoiceDoesNotBelongToCurrentStore
        assert_eq!(
            service_provider
                .invoice_line_service
                .save_stock_out_item_lines(
                    &context,
                    SaveStockOutItemLines {
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
                .save_stock_out_item_lines(
                    &context,
                    SaveStockOutItemLines {
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
                .save_stock_out_item_lines(
                    &context,
                    SaveStockOutItemLines {
                        invoice_id: mock_outbound_shipment_a().id,
                        item_id: mock_item_a().id,
                        lines: vec![SaveStockOutInvoiceLine {
                            id: "new_line".to_string(),
                            number_of_packs: 1000.0,
                            stock_line_id: mock_stock_line_vaccine_item_a().id,
                            campaign_id: None,
                            program_id: None,
                            vvm_status_id: None,
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
    // TODO Tests for notes

    #[actix_rt::test]
    async fn test_save_outbound_shipment_lines_success() {
        fn outbound_to_edit() -> InvoiceRow {
            InvoiceRow {
                id: "outbound_to_edit".to_string(),
                store_id: mock_store_b().id,
                name_id: mock_name_store_b().id,
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
            .save_stock_out_item_lines(
                &context,
                SaveStockOutItemLines {
                    invoice_id: outbound_to_edit().id,
                    item_id: mock_item_a().id,
                    lines: vec![
                        SaveStockOutInvoiceLine {
                            id: "line1".to_string(), // create
                            number_of_packs: 1.0,
                            stock_line_id: mock_stock_line_b().id,
                            ..Default::default()
                        },
                        SaveStockOutInvoiceLine {
                            id: line_to_update().id,
                            number_of_packs: 2.0,
                            stock_line_id: mock_stock_line_a().id,
                            ..Default::default()
                        },
                        SaveStockOutInvoiceLine {
                            id: line_to_delete().id,
                            number_of_packs: 0.0,
                            ..Default::default()
                        },
                    ],
                    placeholder_quantity: Some(5.0),
                    prescribed_quantity: None,
                    note: Some("Test note".to_string()),
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
