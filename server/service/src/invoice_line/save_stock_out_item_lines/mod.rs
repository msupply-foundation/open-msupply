use repository::{
    Invoice, InvoiceLineRowRepository, InvoiceLineType, RepositoryError, StockLineRowRepository,
    StorageConnection,
};
use util::barcode::standard_barcode;

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
    /// A barcode a user scanned to issue this item, recorded on the item's saved
    /// lines in place of the barcode of the stock they issue, and on that stock
    /// where it has no barcode yet. Saving never proposes a barcode.
    pub barcode: Option<String>,
}

#[derive(Clone, Debug, Default, PartialEq)]
pub struct SaveStockOutInvoiceLine {
    pub id: String,
    pub number_of_packs: f64,
    pub stock_line_id: String,
    pub campaign_id: Option<String>,
    pub program_id: Option<String>,
    pub vvm_status_id: Option<String>,
    pub received_number_of_packs: Option<f64>,
    pub reason_option_id: Option<String>,
    /// One value per item, so the caller sends the same one on every line of
    /// it — and, as with `received_number_of_packs`, the set-save OVERWRITES
    /// it, so an omitted value clears the stored one.
    pub transfer_comment: Option<String>,
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
                repo.update_note_by_invoice_and_item_id(
                    &input.invoice_id,
                    &input.item_id,
                    Some(note),
                )?;
                // TODO: Should we be able to remove the note e.g. nullable update?
            }

            if let Some(value) = input.barcode.as_deref().and_then(standard_barcode) {
                record_scanned_barcode(connection, &input.invoice_id, &input.item_id, &value)?;
            }

            get_invoice(ctx, None, &input.invoice_id, None)
                .map_err(SaveStockOutItemLinesError::DatabaseError)?
                .ok_or(SaveStockOutItemLinesError::UpdatedShipmentDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(invoice)
}

fn record_scanned_barcode(
    connection: &StorageConnection,
    invoice_id: &str,
    item_id: &str,
    value: &str,
) -> Result<(), RepositoryError> {
    let repo = InvoiceLineRowRepository::new(connection);
    let stock_repo = StockLineRowRepository::new(connection);
    let lines = repo
        .find_many_by_invoice_id(invoice_id)?
        .into_iter()
        .filter(|line| {
            line.item_id == item_id
                && line.r#type == InvoiceLineType::StockOut
                && line.number_of_packs > 0.0
        });
    for mut line in lines {
        // The box's barcode labels its stock, but never replaces one it has
        if let Some(stock_line_id) = &line.stock_line_id {
            if let Some(mut stock_line) = stock_repo.find_one_by_id(stock_line_id)? {
                if stock_line.barcode.is_none() {
                    stock_line.barcode = Some(value.to_string());
                    stock_repo.upsert_one(&stock_line)?;
                }
            }
        }
        if line.barcode.as_deref() != Some(value) {
            line.barcode = Some(value.to_string());
            repo.upsert_one(&line)?;
        }
    }
    Ok(())
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
            mock_item_a, mock_name_store_b, mock_outbound_shipment_a,
            mock_shipment_variance_reason_option, mock_stock_line_a, mock_stock_line_b,
            mock_stock_line_vaccine_item_a, mock_store_a, mock_store_b,
            mock_transferred_inbound_shipment_a, mock_user_account_a, MockData, MockDataInserts,
        },
        test_db::setup_all_with_data,
        InvoiceLineRow, InvoiceLineRowRepository, InvoiceLineType, InvoiceRow, InvoiceStatus,
        InvoiceType, StockLineRow, StockLineRowRepository,
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
                item_id: mock_item_a().id,
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
                            received_number_of_packs: None,
                            reason_option_id: None,
                            transfer_comment: None,
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
                item_id: mock_item_a().id,
                stock_line_id: Some(mock_stock_line_a().id),
                number_of_packs: 5.0,
                ..Default::default()
            }
        }
        fn line_to_delete() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "line_to_delete".to_string(),
                invoice_id: outbound_to_edit().id,
                item_id: mock_item_a().id,
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
                    barcode: None,
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

    #[actix_rt::test]
    async fn test_save_outbound_new_line_persists_received_and_reason() {
        fn outbound() -> InvoiceRow {
            InvoiceRow {
                id: "outbound_variance".to_string(),
                store_id: mock_store_b().id,
                name_id: mock_name_store_b().id,
                r#type: InvoiceType::OutboundShipment,
                status: InvoiceStatus::New,
                ..Default::default()
            }
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "test_save_outbound_new_line_persists_received_and_reason",
            MockDataInserts::all(),
            MockData {
                invoices: vec![outbound()],
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
                    invoice_id: outbound().id,
                    item_id: mock_item_a().id,
                    lines: vec![SaveStockOutInvoiceLine {
                        id: "new_variance_line".to_string(),
                        number_of_packs: 5.0,
                        stock_line_id: mock_stock_line_a().id,
                        received_number_of_packs: Some(3.0),
                        reason_option_id: Some(mock_shipment_variance_reason_option().id),
                        ..Default::default()
                    }],
                    placeholder_quantity: None,
                    prescribed_quantity: None,
                    note: None,
                    barcode: None,
                },
            )
            .unwrap();

        let line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id("new_variance_line")
            .unwrap()
            .unwrap();

        assert_eq!(line.received_number_of_packs, Some(3.0));
        assert_eq!(
            line.reason_option_id,
            Some(mock_shipment_variance_reason_option().id)
        );
    }

    /// OMS-REG-DIST-03.41/.43 — the item's one comment reaches every line of
    /// it, and an omitted value clears the stored one (contract.md wire trap).
    #[actix_rt::test]
    async fn test_save_outbound_item_lines_writes_transfer_comment_to_every_line() {
        fn outbound() -> InvoiceRow {
            InvoiceRow {
                id: "outbound_transfer_comment".to_string(),
                store_id: mock_store_b().id,
                name_id: mock_name_store_b().id,
                r#type: InvoiceType::OutboundShipment,
                status: InvoiceStatus::New,
                ..Default::default()
            }
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "test_save_outbound_item_lines_writes_transfer_comment_to_every_line",
            MockDataInserts::all(),
            MockData {
                invoices: vec![outbound()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_b().id, mock_user_account_a().id)
            .unwrap();

        let save = |lines: Vec<SaveStockOutInvoiceLine>| SaveStockOutItemLines {
            invoice_id: outbound().id,
            item_id: mock_item_a().id,
            lines,
            ..Default::default()
        };
        let comment_of = |id: &str| {
            InvoiceLineRowRepository::new(&connection)
                .find_one_by_id(id)
                .unwrap()
                .unwrap()
                .transfer_comment
        };

        // Two batches of the same item, both carrying the item's one comment.
        service_provider
            .invoice_line_service
            .save_stock_out_item_lines(
                &context,
                save(vec![
                    SaveStockOutInvoiceLine {
                        id: "sc_line_a".to_string(),
                        number_of_packs: 1.0,
                        stock_line_id: mock_stock_line_a().id,
                        transfer_comment: Some("Short supply".to_string()),
                        ..Default::default()
                    },
                    SaveStockOutInvoiceLine {
                        id: "sc_line_b".to_string(),
                        number_of_packs: 1.0,
                        stock_line_id: mock_stock_line_b().id,
                        transfer_comment: Some("Short supply".to_string()),
                        ..Default::default()
                    },
                ]),
            )
            .unwrap();

        assert_eq!(comment_of("sc_line_a"), Some("Short supply".to_string()));
        assert_eq!(comment_of("sc_line_b"), Some("Short supply".to_string()));

        // Echoed back on a later save: unchanged.
        service_provider
            .invoice_line_service
            .save_stock_out_item_lines(
                &context,
                save(vec![SaveStockOutInvoiceLine {
                    id: "sc_line_a".to_string(),
                    number_of_packs: 4.0,
                    stock_line_id: mock_stock_line_a().id,
                    transfer_comment: Some("Short supply".to_string()),
                    ..Default::default()
                }]),
            )
            .unwrap();

        assert_eq!(comment_of("sc_line_a"), Some("Short supply".to_string()));

        // Omitted: the set-save overwrites, so the stored value is CLEARED —
        // the wire trap the client guards against by echoing.
        service_provider
            .invoice_line_service
            .save_stock_out_item_lines(
                &context,
                save(vec![SaveStockOutInvoiceLine {
                    id: "sc_line_a".to_string(),
                    number_of_packs: 5.0,
                    stock_line_id: mock_stock_line_a().id,
                    ..Default::default()
                }]),
            )
            .unwrap();

        assert_eq!(comment_of("sc_line_a"), None);
    }

    /// The scanned barcode is recorded on the item's lines, and on the stock
    /// they issue from that has no barcode yet; stock with a barcode keeps it.
    #[actix_rt::test]
    async fn test_save_outbound_item_lines_records_the_scanned_barcode() {
        fn outbound() -> InvoiceRow {
            InvoiceRow {
                id: "outbound_scanned".to_string(),
                store_id: mock_store_a().id,
                name_id: mock_name_store_b().id,
                r#type: InvoiceType::OutboundShipment,
                status: InvoiceStatus::New,
                ..Default::default()
            }
        }
        fn labelled_stock() -> StockLineRow {
            StockLineRow {
                id: "labelled_stock".to_string(),
                barcode: Some("plain:OTHER".to_string()),
                ..mock_stock_line_a()
            }
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "test_save_outbound_item_lines_records_the_scanned_barcode",
            MockDataInserts::all(),
            MockData {
                invoices: vec![outbound()],
                stock_lines: vec![labelled_stock()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();

        service_provider
            .invoice_line_service
            .save_stock_out_item_lines(
                &context,
                SaveStockOutItemLines {
                    invoice_id: outbound().id,
                    item_id: mock_item_a().id,
                    lines: vec![
                        SaveStockOutInvoiceLine {
                            id: "from_unlabelled".to_string(),
                            number_of_packs: 1.0,
                            stock_line_id: mock_stock_line_a().id,
                            ..Default::default()
                        },
                        SaveStockOutInvoiceLine {
                            id: "from_labelled".to_string(),
                            number_of_packs: 1.0,
                            stock_line_id: labelled_stock().id,
                            ..Default::default()
                        },
                    ],
                    barcode: Some("9506682101352".to_string()),
                    ..Default::default()
                },
            )
            .unwrap();

        let scanned = Some("gtin:09506682101352".to_string());
        let lines = InvoiceLineRowRepository::new(&connection);
        for id in ["from_unlabelled", "from_labelled"] {
            assert_eq!(lines.find_one_by_id(id).unwrap().unwrap().barcode, scanned);
        }
        let stock = StockLineRowRepository::new(&connection);
        assert_eq!(
            stock
                .find_one_by_id(&mock_stock_line_a().id)
                .unwrap()
                .unwrap()
                .barcode,
            scanned
        );
        assert_eq!(
            stock
                .find_one_by_id("labelled_stock")
                .unwrap()
                .unwrap()
                .barcode,
            Some("plain:OTHER".to_string())
        );
    }
}
