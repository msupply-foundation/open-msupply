use chrono::NaiveDate;
use repository::{
    Invoice, InvoiceLine, InvoiceLineRowRepository, InvoiceRowRepository, InvoiceStatus,
    LocationMovementRowRepository, RepositoryError, StockLineRowRepository, TransactionError,
};

pub mod generate;
pub mod validate;

use generate::generate;
use validate::validate;

use crate::activity_log::{activity_log_entry, log_type_from_invoice_status};
use crate::invoice::outbound_shipment::update::generate::GenerateResult;
use crate::invoice::query::get_invoice;
use crate::invoice_line::ShipmentTaxUpdate;
use crate::processors::ProcessorType::RequisitionAutoFinalise;
use crate::service_provider::ServiceContext;
use crate::NullableUpdate;

#[derive(Clone, Debug, PartialEq)]
pub enum UpdateOutboundShipmentStatus {
    Allocated,
    Picked,
    Shipped,
}
#[derive(Clone, Debug, PartialEq, Default)]
pub struct UpdateOutboundShipment {
    pub id: String,
    pub status: Option<UpdateOutboundShipmentStatus>,
    pub on_hold: Option<bool>,
    pub comment: Option<String>,
    pub their_reference: Option<String>,
    pub colour: Option<String>,
    pub transport_reference: Option<String>,
    pub tax: Option<ShipmentTaxUpdate>,
    pub currency_id: Option<String>,
    pub currency_rate: Option<f64>,
    pub expected_delivery_date: Option<NullableUpdate<NaiveDate>>,
}

#[derive(Debug, PartialEq)]
pub enum UpdateOutboundShipmentError {
    CannotReverseInvoiceStatus,
    CannotChangeStatusOfInvoiceOnHold,
    InvoiceDoesNotExist,
    InvoiceIsNotEditable,
    NotAnOutboundShipment,
    NotThisStoreInvoice,
    CannotIssueInForeignCurrency,
    OtherPartyDoesNotExist,
    // Error applies to unallocated lines with above zero quantity
    CanOnlyChangeToAllocatedWhenNoUnallocatedLines(Vec<InvoiceLine>),
    CannotHaveEstimatedDeliveryDateBeforeShippedDate,
    // Internal
    UpdatedInvoiceDoesNotExist,
    DatabaseError(RepositoryError),
    /// Holds the id of the invalid invoice line
    InvoiceLineHasNoStockLine(String),
}

type OutError = UpdateOutboundShipmentError;

pub fn update_outbound_shipment(
    ctx: &ServiceContext,
    patch: UpdateOutboundShipment,
) -> Result<Invoice, OutError> {
    let invoice = ctx
        .connection
        .transaction_sync(|connection| {
            let (invoice, status_changed) = validate(connection, &ctx.store_id, &patch)?;
            let GenerateResult {
                batches_to_update,
                update_invoice,
                lines_to_trim,
                location_movements,
                update_lines,
            } = generate(&ctx.store_id, invoice, patch.clone(), connection)?;

            InvoiceRowRepository::new(connection).upsert_one(&update_invoice)?;
            let invoice_line_repo = InvoiceLineRowRepository::new(connection);

            if let Some(stock_lines) = batches_to_update {
                let repository = StockLineRowRepository::new(connection);
                for stock_line in stock_lines {
                    repository.upsert_one(&stock_line)?;
                }
            }

            if let Some(lines) = lines_to_trim {
                for line in lines {
                    invoice_line_repo.delete(&line.id)?;
                }
            }

            if let Some(movements) = location_movements {
                for movement in movements {
                    LocationMovementRowRepository::new(connection).upsert_one(&movement)?;
                }
            }

            if let Some(update_lines) = update_lines {
                for line in update_lines {
                    invoice_line_repo.upsert_one(&line)?;
                }
            }

            if status_changed {
                activity_log_entry(
                    ctx,
                    log_type_from_invoice_status(&update_invoice.status, false),
                    Some(update_invoice.id.to_string()),
                    None,
                    None,
                )?;
            }

            get_invoice(ctx, None, &update_invoice.id)
                .map_err(OutError::DatabaseError)?
                .ok_or(OutError::UpdatedInvoiceDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    ctx.processors_trigger.trigger_invoice_transfer_processors();
    ctx.processors_trigger
        .trigger_processor(RequisitionAutoFinalise);

    Ok(invoice)
}

impl From<RepositoryError> for UpdateOutboundShipmentError {
    fn from(error: RepositoryError) -> Self {
        UpdateOutboundShipmentError::DatabaseError(error)
    }
}

impl From<TransactionError<UpdateOutboundShipmentError>> for UpdateOutboundShipmentError {
    fn from(error: TransactionError<UpdateOutboundShipmentError>) -> Self {
        match error {
            TransactionError::Transaction { msg, level } => {
                UpdateOutboundShipmentError::DatabaseError(RepositoryError::TransactionError {
                    msg,
                    level,
                })
            }
            TransactionError::Inner(e) => e,
        }
    }
}

impl UpdateOutboundShipmentStatus {
    pub fn full_status(&self) -> InvoiceStatus {
        match self {
            UpdateOutboundShipmentStatus::Allocated => InvoiceStatus::Allocated,
            UpdateOutboundShipmentStatus::Picked => InvoiceStatus::Picked,
            UpdateOutboundShipmentStatus::Shipped => InvoiceStatus::Shipped,
        }
    }

    pub fn full_status_option(
        status: &Option<UpdateOutboundShipmentStatus>,
    ) -> Option<InvoiceStatus> {
        status.as_ref().map(|status| status.full_status())
    }
}

impl UpdateOutboundShipment {
    pub fn full_status(&self) -> Option<InvoiceStatus> {
        self.status.as_ref().map(|status| status.full_status())
    }
}

#[cfg(test)]
mod test {
    use chrono::NaiveDate;
    use repository::{
        mock::{
            mock_inbound_shipment_a, mock_item_a, mock_name_a, mock_outbound_shipment_b,
            mock_outbound_shipment_c, mock_outbound_shipment_on_hold,
            mock_outbound_shipment_picked, mock_store_a, mock_store_c, MockData, MockDataInserts,
        },
        test_db::setup_all_with_data,
        ActivityLogRowRepository, ActivityLogType, InvoiceLineRow, InvoiceLineRowRepository,
        InvoiceLineType, InvoiceRow, InvoiceRowRepository, InvoiceStatus, InvoiceType, NameRow,
        NameStoreJoinRow, StockLineRow, StockLineRowRepository,
    };

    use crate::{
        invoice::outbound_shipment::update::{
            UpdateOutboundShipment, UpdateOutboundShipmentStatus,
        },
        invoice_line::ShipmentTaxUpdate,
        service_provider::ServiceProvider,
        NullableUpdate,
    };

    use super::UpdateOutboundShipmentError;

    type ServiceError = UpdateOutboundShipmentError;

    #[actix_rt::test]
    async fn update_outbound_shipment_errors() {
        fn outbound_shipment_no_stock() -> InvoiceRow {
            InvoiceRow {
                id: String::from("outbound_shipment_no_stock"),
                name_link_id: String::from("name_store_a"),
                store_id: String::from("store_a"),
                r#type: InvoiceType::OutboundShipment,
                status: InvoiceStatus::Allocated,
                created_datetime: NaiveDate::from_ymd_opt(1970, 1, 7)
                    .unwrap()
                    .and_hms_milli_opt(15, 30, 0, 0)
                    .unwrap(),
                allocated_datetime: Some(
                    NaiveDate::from_ymd_opt(1970, 1, 7)
                        .unwrap()
                        .and_hms_milli_opt(15, 30, 0, 0)
                        .unwrap(),
                ),
                ..Default::default()
            }
        }

        fn invoice_line_no_stock() -> InvoiceLineRow {
            InvoiceLineRow {
                id: String::from("outbound_shipment_no_stock_line_a"),
                invoice_id: String::from("outbound_shipment_no_stock"),
                item_link_id: String::from("item_a"),
                item_name: String::from("Item A"),
                item_code: String::from("item_a_code"),
                batch: None,
                r#type: InvoiceLineType::StockOut,
                ..Default::default()
            }
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "update_outbound_shipment_errors",
            MockDataInserts::all(),
            MockData {
                invoices: vec![outbound_shipment_no_stock()],
                invoice_lines: vec![invoice_line_no_stock()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let mut context = service_provider
            .context(mock_store_c().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_service;

        // CannotReverseInvoiceStatus
        assert_eq!(
            service.update_outbound_shipment(
                &context,
                UpdateOutboundShipment {
                    id: mock_outbound_shipment_picked().id,
                    status: Some(UpdateOutboundShipmentStatus::Allocated),
                    ..Default::default()
                }
            ),
            Err(ServiceError::CannotReverseInvoiceStatus)
        );
        // InvoiceDoesNotExist
        assert_eq!(
            service.update_outbound_shipment(
                &context,
                UpdateOutboundShipment {
                    id: "invalid".to_string(),
                    ..Default::default()
                }
            ),
            Err(ServiceError::InvoiceDoesNotExist)
        );
        // InvoiceIsNotEditable
        assert_eq!(
            service.update_outbound_shipment(
                &context,
                UpdateOutboundShipment {
                    id: mock_outbound_shipment_b().id,
                    status: Some(UpdateOutboundShipmentStatus::Shipped),
                    ..Default::default()
                }
            ),
            Err(ServiceError::InvoiceIsNotEditable)
        );
        // NotAnOutboundShipment
        context.store_id = mock_store_a().id;
        assert_eq!(
            service.update_outbound_shipment(
                &context,
                UpdateOutboundShipment {
                    id: mock_inbound_shipment_a().id,
                    ..Default::default()
                }
            ),
            Err(ServiceError::NotAnOutboundShipment)
        );
        // InvoiceLineHasNoStockLine
        context.store_id = mock_store_a().id;
        assert_eq!(
            service.update_outbound_shipment(
                &context,
                UpdateOutboundShipment {
                    id: outbound_shipment_no_stock().id,
                    status: Some(UpdateOutboundShipmentStatus::Picked),
                    ..Default::default()
                }
            ),
            Err(ServiceError::InvoiceLineHasNoStockLine(
                invoice_line_no_stock().id.clone()
            ))
        );
        // CannotChangeStatusOfInvoiceOnHold
        assert_eq!(
            service.update_outbound_shipment(
                &context,
                UpdateOutboundShipment {
                    id: mock_outbound_shipment_on_hold().id,
                    status: Some(UpdateOutboundShipmentStatus::Picked),
                    ..Default::default()
                }
            ),
            Err(ServiceError::CannotChangeStatusOfInvoiceOnHold)
        );
        // NotThisStoreInvoice
        assert_eq!(
            service.update_outbound_shipment(
                &context,
                UpdateOutboundShipment {
                    id: mock_outbound_shipment_c().id,
                    status: Some(UpdateOutboundShipmentStatus::Picked),
                    ..Default::default()
                }
            ),
            Err(ServiceError::NotThisStoreInvoice)
        );

        // TODO CanOnlyChangeToAllocatedWhenNoUnallocatedLines
    }

    #[actix_rt::test]
    async fn update_outbound_shipment_success_trim_unallocated_line() {
        fn invoice() -> InvoiceRow {
            InvoiceRow {
                id: "invoice".to_string(),
                name_link_id: mock_name_a().id,
                store_id: mock_store_a().id,
                r#type: InvoiceType::OutboundShipment,
                ..Default::default()
            }
        }

        fn invoice_line() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "invoice_line".to_string(),
                invoice_id: invoice().id,
                item_link_id: mock_item_a().id,
                r#type: InvoiceLineType::UnallocatedStock,
                pack_size: 1.0,
                number_of_packs: 0.0,
                ..Default::default()
            }
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "update_outbound_shipment_success_trim_unallocated_line",
            MockDataInserts::all(),
            MockData {
                invoices: vec![invoice()],
                invoice_lines: vec![invoice_line()],
                ..Default::default()
            },
        )
        .await;

        assert_eq!(
            InvoiceLineRowRepository::new(&connection).find_one_by_id(&invoice_line().id),
            Ok(Some(invoice_line()))
        );

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_service;

        let update = UpdateOutboundShipment {
            id: invoice().id,
            status: Some(UpdateOutboundShipmentStatus::Picked),
            ..Default::default()
        };
        let result = service.update_outbound_shipment(&context, update);

        assert!(result.is_ok(), "Not Ok(_) {:#?}", result);

        assert_eq!(
            InvoiceLineRowRepository::new(&connection).find_one_by_id(&invoice_line().id),
            Ok(None)
        );
    }

    #[actix_rt::test]
    async fn update_outbound_shipment_success() {
        fn invoice() -> InvoiceRow {
            InvoiceRow {
                id: "test_invoice_pricing".to_string(),
                name_link_id: mock_name_a().id,
                store_id: mock_store_a().id,
                r#type: InvoiceType::OutboundShipment,
                ..Default::default()
            }
        }

        fn customer() -> NameRow {
            NameRow {
                id: "customer".to_string(),
                ..Default::default()
            }
        }

        fn customer_join() -> NameStoreJoinRow {
            NameStoreJoinRow {
                id: "customer_join".to_string(),
                name_link_id: customer().id,
                store_id: mock_store_a().id,
                name_is_customer: true,
                ..Default::default()
            }
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "update_outbound_shipment_success",
            MockDataInserts::all(),
            MockData {
                invoices: vec![invoice()],
                names: vec![customer()],
                name_store_joins: vec![customer_join()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let mut context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_service;

        // Test all fields apart from status
        fn get_update() -> UpdateOutboundShipment {
            UpdateOutboundShipment {
                id: invoice().id,
                status: None,
                on_hold: Some(true),
                comment: Some("comment".to_string()),
                their_reference: Some("their_reference".to_string()),
                colour: Some("colour".to_string()),
                transport_reference: Some("transport_reference".to_string()),
                tax: Some(ShipmentTaxUpdate {
                    percentage: Some(15.0),
                }),
                currency_id: None,
                currency_rate: None,
                expected_delivery_date: Some(NullableUpdate {
                    value: NaiveDate::from_ymd_opt(2025, 1, 7),
                }),
                ..Default::default()
            }
        }

        let result = service.update_outbound_shipment(&context, get_update());

        assert!(result.is_ok());

        let updated_record = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&invoice().id)
            .unwrap()
            .unwrap();

        assert_eq!(updated_record, {
            let UpdateOutboundShipment {
                id: _,
                status: _,
                on_hold,
                comment,
                their_reference,
                colour,
                transport_reference,
                tax,
                currency_id: _,
                currency_rate: _,
                expected_delivery_date,
            } = get_update();
            InvoiceRow {
                on_hold: on_hold.unwrap(),
                comment,
                their_reference,
                colour,
                transport_reference,
                tax_percentage: tax.map(|tax| tax.percentage.unwrap()),
                expected_delivery_date: expected_delivery_date.and_then(|v| v.value),
                ..invoice()
            }
        });

        // helpers to compare totals
        let stock_lines_for_invoice_lines = |invoice_lines: &Vec<InvoiceLineRow>| {
            let stock_line_ids: Vec<String> = invoice_lines
                .iter()
                .filter_map(|invoice| invoice.stock_line_id.to_owned())
                .collect();
            StockLineRowRepository::new(&connection)
                .find_many_by_ids(&stock_line_ids)
                .unwrap()
        };
        // calculates the expected stock line total for every invoice line row
        let expected_stock_line_totals = |invoice_lines: &Vec<InvoiceLineRow>| {
            let stock_lines = stock_lines_for_invoice_lines(invoice_lines);
            let expected_stock_line_totals: Vec<(StockLineRow, f64)> = stock_lines
                .into_iter()
                .map(|line| {
                    let invoice_line = invoice_lines
                        .iter()
                        .find(|il| il.stock_line_id.clone().unwrap() == line.id)
                        .unwrap();
                    let expected_total = line.total_number_of_packs - invoice_line.number_of_packs;
                    (line, expected_total)
                })
                .collect();
            expected_stock_line_totals
        };
        let assert_stock_line_totals =
            |invoice_lines: &Vec<InvoiceLineRow>, expected: &Vec<(StockLineRow, f64)>| {
                let stock_lines = stock_lines_for_invoice_lines(invoice_lines);
                for line in stock_lines {
                    let expected = expected.iter().find(|l| l.0.id == line.id).unwrap();
                    assert_eq!(line.total_number_of_packs, expected.1);
                }
            };

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&mock_outbound_shipment_c().id)
            .unwrap()
            .unwrap();
        let invoice_lines = InvoiceLineRowRepository::new(&connection)
            .find_many_by_invoice_id(&invoice.id)
            .unwrap();
        let expected_stock_line_totals = expected_stock_line_totals(&invoice_lines);

        context.store_id = mock_store_c().id;
        service
            .update_outbound_shipment(
                &context,
                UpdateOutboundShipment {
                    id: mock_outbound_shipment_c().id,
                    status: Some(UpdateOutboundShipmentStatus::Picked),
                    ..Default::default()
                },
            )
            .unwrap();
        assert_stock_line_totals(&invoice_lines, &expected_stock_line_totals);

        let log = ActivityLogRowRepository::new(&connection)
            .find_many_by_record_id(&mock_outbound_shipment_c().id)
            .unwrap()
            .into_iter()
            .find(|l| l.r#type == ActivityLogType::InvoiceStatusPicked)
            .unwrap();
        assert_eq!(log.r#type, ActivityLogType::InvoiceStatusPicked);
    }

    #[actix_rt::test]
    async fn update_outbound_shipment_check_stock_adjustments() {
        fn invoice() -> InvoiceRow {
            InvoiceRow {
                id: "invoice".to_string(),
                name_link_id: mock_name_a().id,
                store_id: mock_store_a().id,
                r#type: InvoiceType::OutboundShipment,
                ..Default::default()
            }
        }

        fn stock_line() -> StockLineRow {
            StockLineRow {
                id: "stock_line".to_string(),
                store_id: mock_store_a().id,
                available_number_of_packs: 8.0,
                total_number_of_packs: 10.0,
                pack_size: 1.0,
                item_link_id: mock_item_a().id,
                ..Default::default()
            }
        }

        fn invoice_line() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "invoice_line".to_string(),
                invoice_id: invoice().id,
                stock_line_id: Some(stock_line().id),
                number_of_packs: 2.0,
                item_link_id: mock_item_a().id,
                r#type: InvoiceLineType::StockOut,
                ..Default::default()
            }
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "update_outbound_shipment_check_stock_adjustments",
            MockDataInserts::none()
                .units()
                .items()
                .names()
                .stores()
                .currencies(),
            MockData {
                invoices: vec![invoice()],
                stock_lines: vec![stock_line()],
                invoice_lines: vec![invoice_line()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_service;

        // Change to PICKED
        let result = service.update_outbound_shipment(
            &context,
            UpdateOutboundShipment {
                id: invoice().id,
                status: Some(UpdateOutboundShipmentStatus::Picked),
                ..Default::default()
            },
        );

        assert!(result.is_ok(), "Not Ok(_) {:#?}", result);

        let stock_line_repo = StockLineRowRepository::new(&connection);

        // Stock line total_number_of_packs should have been reduced
        let new_stock_line = StockLineRow {
            total_number_of_packs: 8.0,
            ..stock_line()
        };
        assert_eq!(
            stock_line_repo
                .find_one_by_id(&new_stock_line.id)
                .unwrap()
                .unwrap(),
            new_stock_line
        );

        // Try changing to shipped again to PICKED
        let result = service.update_outbound_shipment(
            &context,
            UpdateOutboundShipment {
                id: invoice().id,
                status: Some(UpdateOutboundShipmentStatus::Picked),
                ..Default::default()
            },
        );

        assert!(result.is_ok(), "Not Ok(_) {:#?}", result);

        let stock_line_repo = StockLineRowRepository::new(&connection);

        // Stock line should not have changed
        assert_eq!(
            stock_line_repo
                .find_one_by_id(&new_stock_line.id)
                .unwrap()
                .unwrap(),
            new_stock_line
        );

        // Change to SHIPPED
        let result = service.update_outbound_shipment(
            &context,
            UpdateOutboundShipment {
                id: invoice().id,
                status: Some(UpdateOutboundShipmentStatus::Shipped),
                ..Default::default()
            },
        );

        assert!(result.is_ok(), "Not Ok(_) {:#?}", result);

        let stock_line_repo = StockLineRowRepository::new(&connection);
        // Stock line should not have changed
        assert_eq!(
            stock_line_repo
                .find_one_by_id(&new_stock_line.id)
                .unwrap()
                .unwrap(),
            new_stock_line
        );

        // Check again, going straight to SHIPPED

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "update_outbound_shipment_check_stock_adjustments2",
            MockDataInserts::none()
                .units()
                .items()
                .names()
                .stores()
                .currencies(),
            MockData {
                invoices: vec![invoice()],
                stock_lines: vec![stock_line()],
                invoice_lines: vec![invoice_line()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_service;

        // Change to SHIPPED
        let result = service.update_outbound_shipment(
            &context,
            UpdateOutboundShipment {
                id: invoice().id,
                status: Some(UpdateOutboundShipmentStatus::Shipped),
                ..Default::default()
            },
        );

        assert!(result.is_ok(), "Not Ok(_) {:#?}", result);

        let stock_line_repo = StockLineRowRepository::new(&connection);

        // Stock line total_number_of_packs should have been reduced
        assert_eq!(
            stock_line_repo
                .find_one_by_id(&stock_line().id)
                .unwrap()
                .unwrap(),
            StockLineRow {
                total_number_of_packs: 8.0,
                ..stock_line()
            }
        );
    }
}
