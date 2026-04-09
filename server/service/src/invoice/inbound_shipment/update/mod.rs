use crate::activity_log::{activity_log_entry_with_store, log_type_from_invoice_status};
use crate::invoice_line::ShipmentTaxUpdate;
use crate::{invoice::query::get_invoice, service_provider::ServiceContext, WithDBError};
use chrono::{DateTime, Utc};
use repository::vvm_status::vvm_status_log_row::VVMStatusLogRowRepository;
use repository::{
    ActivityLogType, InvoiceLineRowRepository, InvoiceRowRepository, InvoiceStatus,
    RepositoryError, StockLineRowRepository,
};
use repository::{Invoice, LocationMovementRowRepository};

mod generate;
mod validate;

use crate::invoice::inbound_shipment::update::generate::GenerateResult;
use generate::generate;
use validate::validate;

use self::generate::LineAndStockLine;
use super::InboundShipmentType;

#[derive(Clone, Debug, PartialEq)]
pub enum UpdateInboundShipmentStatus {
    Shipped,
    Delivered,
    Received,
    Verified,
}

#[derive(Clone, Debug, PartialEq)]
pub enum ApplyDonorToInvoiceLines {
    None,
    UpdateExistingDonor,
    AssignIfNone,
    AssignToAll,
}

#[derive(Clone, Debug, PartialEq)]
pub struct UpdateDefaultDonor {
    pub donor_id: Option<String>,
    pub apply_to_lines: ApplyDonorToInvoiceLines,
}

#[derive(Clone, Debug, Default, PartialEq)]
pub struct UpdateInboundShipment {
    pub id: String,
    pub other_party_id: Option<String>,
    pub status: Option<UpdateInboundShipmentStatus>,
    pub on_hold: Option<bool>,
    pub comment: Option<String>,
    pub their_reference: Option<String>,
    pub colour: Option<String>,
    pub tax: Option<ShipmentTaxUpdate>,
    pub currency_id: Option<String>,
    pub currency_rate: Option<f64>,
    pub charges_local_currency: Option<f64>,
    pub charges_foreign_currency: Option<f64>,
    pub default_donor: Option<UpdateDefaultDonor>,
    pub received_datetime: Option<DateTime<Utc>>,
}

type OutError = UpdateInboundShipmentError;

pub fn update_inbound_shipment(
    ctx: &ServiceContext,
    patch: UpdateInboundShipment,
    store_id: Option<&str>,
    r#type: InboundShipmentType,
) -> Result<Invoice, OutError> {
    let invoice = ctx
        .connection
        .transaction_sync(|connection| {
            let (invoice, other_party, status_changed) = validate(
                connection,
                store_id.unwrap_or(&ctx.store_id),
                &patch,
                r#type,
            )?;
            let old_received_datetime = invoice.received_datetime;
            let GenerateResult {
                batches_to_update,
                update_invoice,
                empty_lines_to_trim,
                location_movements,
                backdate_location_movements,
                update_tax_for_lines,
                update_currency_for_lines,
                update_cost_price_for_lines,
                vvm_status_logs_to_update,
                update_donor,
            } = generate(ctx, invoice, other_party, patch.clone())?;

            InvoiceRowRepository::new(connection).upsert_one(&update_invoice)?;
            let invoice_line_repository = InvoiceLineRowRepository::new(connection);

            let line_and_stock_lines = match (batches_to_update, update_donor) {
                (Some(batches), None) => Some(batches),
                (None, Some(donors)) => Some(donors),
                (Some(_), Some(_)) => {
                    // Both do full line updates, so would conflict. Frontend only updates
                    // separately, but should protect if API called directly
                    return Err(OutError::CannotUpdateStatusAndDonorAtTheSameTime);
                }
                (None, None) => None,
            };

            if let Some(updates) = line_and_stock_lines {
                let stock_line_repository = StockLineRowRepository::new(connection);

                for LineAndStockLine { line, stock_line } in updates.into_iter() {
                    if let Some(ref stock_line) = stock_line {
                        stock_line_repository.upsert_one(stock_line)?;
                    }
                    invoice_line_repository.upsert_one(&line)?;
                }
            }

            if let Some(vvm_status_log_rows) = vvm_status_logs_to_update {
                for row in vvm_status_log_rows {
                    VVMStatusLogRowRepository::new(connection).upsert_one(&row)?;
                }
            }

            if let Some(lines) = empty_lines_to_trim {
                let repository = InvoiceLineRowRepository::new(connection);
                for line in lines {
                    repository.delete(&line.id)?;
                }
            }

            if update_invoice.status == InvoiceStatus::Verified {
                if let Some(movements) = location_movements {
                    for movement in movements {
                        LocationMovementRowRepository::new(connection).upsert_one(&movement)?;
                    }
                }
            }

            if let Some(movements) = backdate_location_movements {
                for movement in movements {
                    LocationMovementRowRepository::new(connection).upsert_one(&movement)?;
                }
            }

            if let Some(update_tax) = update_tax_for_lines {
                for line in update_tax {
                    invoice_line_repository.update_tax(
                        &line.id,
                        line.tax_percentage,
                        line.total_after_tax,
                    )?;
                }
            }

            if let Some(update_currency) = update_currency_for_lines {
                for line in update_currency {
                    invoice_line_repository
                        .update_currency(&line.id, line.foreign_currency_price_before_tax)?;
                }
            }

            if let Some(update_cost_price) = update_cost_price_for_lines {
                for line in update_cost_price {
                    invoice_line_repository.update_cost_price(
                        &line.id,
                        line.cost_price_per_pack,
                        line.sell_price_per_pack,
                    )?;
                }
            }

            if status_changed {
                activity_log_entry_with_store(
                    ctx,
                    log_type_from_invoice_status(&update_invoice.status, false),
                    Some(update_invoice.id.to_string()),
                    None,
                    None,
                    store_id.map(|id| id.to_string()),
                )?;
            }

            if patch.received_datetime.is_some() {
                activity_log_entry_with_store(
                    ctx,
                    ActivityLogType::InvoiceDateBackdated,
                    Some(update_invoice.id.to_string()),
                    old_received_datetime.map(|d| d.format("%Y-%m-%d").to_string()),
                    update_invoice
                        .received_datetime
                        .map(|d| d.format("%Y-%m-%d").to_string()),
                    store_id.map(|id| id.to_string()),
                )?;
            }

            get_invoice(ctx, None, &update_invoice.id, None)
                .map_err(OutError::DatabaseError)?
                .ok_or(OutError::UpdatedInvoiceDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    ctx.processors_trigger.trigger_invoice_transfer_processors();

    Ok(invoice)
}

#[derive(Debug, PartialEq)]
pub enum UpdateInboundShipmentError {
    InvoiceDoesNotExist,
    NotAnInboundShipment,
    WrongInboundShipmentType,
    NotThisStoreInvoice,
    CannotReverseInvoiceStatus,
    CannotEditFinalised,
    CannotChangeStatusOfInvoiceOnHold,
    CannotIssueForeignCurrencyForInternalSuppliers,
    CannotUpdateStatusAndDonorAtTheSameTime,
    BackdatingNotEnabled,
    CanOnlyBackdateReceivedShipments,
    CannotMoveReceivedDateForward,
    ExceedsMaximumBackdatingDays,
    CannotReceiveWithPendingLines,
    CannotSetShippedStatusOnManualInboundShipment,
    CurrencyRateMustBePositive,
    // Name validation
    OtherPartyDoesNotExist,
    OtherPartyNotVisible,
    OtherPartyNotASupplier,
    // Internal
    PreferenceError(String),
    DatabaseError(RepositoryError),
    UpdatedInvoiceDoesNotExist,
}

impl From<RepositoryError> for UpdateInboundShipmentError {
    fn from(error: RepositoryError) -> Self {
        UpdateInboundShipmentError::DatabaseError(error)
    }
}

impl From<crate::preference::PreferenceError> for UpdateInboundShipmentError {
    fn from(error: crate::preference::PreferenceError) -> Self {
        UpdateInboundShipmentError::PreferenceError(format!("{error:?}"))
    }
}

impl<ERR> From<WithDBError<ERR>> for UpdateInboundShipmentError
where
    ERR: Into<UpdateInboundShipmentError>,
{
    fn from(result: WithDBError<ERR>) -> Self {
        match result {
            WithDBError::DatabaseError(error) => error.into(),
            WithDBError::Error(error) => error.into(),
        }
    }
}

impl UpdateInboundShipmentStatus {
    pub fn full_status(&self) -> InvoiceStatus {
        match self {
            UpdateInboundShipmentStatus::Shipped => InvoiceStatus::Shipped,
            UpdateInboundShipmentStatus::Delivered => InvoiceStatus::Delivered,
            UpdateInboundShipmentStatus::Received => InvoiceStatus::Received,
            UpdateInboundShipmentStatus::Verified => InvoiceStatus::Verified,
        }
    }
}

impl UpdateInboundShipment {
    pub fn full_status(&self) -> Option<InvoiceStatus> {
        self.status.as_ref().map(|status| status.full_status())
    }
}

#[cfg(test)]
mod test {
    use chrono::{Duration, Utc};
    use repository::{
        mock::{
            mock_donor_a, mock_donor_b, mock_inbound_shipment_a,
            mock_inbound_shipment_a_invoice_lines, mock_inbound_shipment_b,
            mock_inbound_shipment_c, mock_inbound_shipment_e, mock_inbound_shipment_f, mock_item_a,
            mock_name_a, mock_name_linked_to_store_join, mock_name_not_linked_to_store_join,
            mock_outbound_shipment_e, mock_stock_line_a, mock_store_a, mock_store_b,
            mock_store_linked_to_name, mock_user_account_a, mock_vaccine_item_a, mock_vvm_status_a,
            MockData, MockDataInserts,
        },
        test_db::setup_all_with_data,
        vvm_status::vvm_status_log::{VVMStatusLogFilter, VVMStatusLogRepository},
        ActivityLogRowRepository, ActivityLogType, EqualFilter, InvoiceLineFilter, InvoiceLineRow,
        InvoiceLineRowRepository, InvoiceLineStatus, InvoiceLineType, InvoiceRow,
        InvoiceRowRepository, InvoiceStatus, InvoiceType, NameRow, NameStoreJoinRow,
        StockLineRowRepository,
    };

    use crate::{
        invoice::inbound_shipment::{
            InboundShipmentType, UpdateDefaultDonor, UpdateInboundShipment,
            UpdateInboundShipmentStatus,
        },
        invoice_line::{
            query::get_invoice_lines,
            stock_in_line::{insert_stock_in_line, InsertStockInLine, StockInType},
            ShipmentTaxUpdate,
        },
        service_provider::ServiceProvider,
    };

    use super::{ApplyDonorToInvoiceLines, UpdateInboundShipmentError};

    type ServiceError = UpdateInboundShipmentError;

    #[actix_rt::test]
    async fn update_inbound_shipment_errors() {
        fn not_visible() -> NameRow {
            NameRow {
                id: "not_visible".to_string(),
                ..Default::default()
            }
        }

        fn not_a_supplier() -> NameRow {
            NameRow {
                id: "not_a_supplier".to_string(),
                ..Default::default()
            }
        }

        fn not_a_supplier_join() -> NameStoreJoinRow {
            NameStoreJoinRow {
                id: "not_a_supplier_join".to_string(),
                name_id: not_a_supplier().id,
                store_id: mock_store_a().id,
                name_is_supplier: false,
                ..Default::default()
            }
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "update_inbound_shipment_errors",
            MockDataInserts::all(),
            MockData {
                names: vec![not_visible(), not_a_supplier()],
                name_store_joins: vec![not_a_supplier_join()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let mut context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.invoice_service;

        //InvoiceDoesNotExist
        assert_eq!(
            service.update_inbound_shipment(
                &context,
                UpdateInboundShipment {
                    id: "invalid".to_string(),
                    other_party_id: Some(mock_name_a().id.clone()),
                    ..Default::default()
                },
                InboundShipmentType::InboundShipment,
            ),
            Err(ServiceError::InvoiceDoesNotExist)
        );
        //NotAnInboundShipment
        assert_eq!(
            service.update_inbound_shipment(
                &context,
                UpdateInboundShipment {
                    id: mock_outbound_shipment_e().id.clone(),
                    other_party_id: Some(mock_name_a().id.clone()),
                    ..Default::default()
                },
                InboundShipmentType::InboundShipment,
            ),
            Err(ServiceError::NotAnInboundShipment)
        );
        //CannotEditFinalised
        assert_eq!(
            service.update_inbound_shipment(
                &context,
                UpdateInboundShipment {
                    id: mock_inbound_shipment_b().id.clone(),
                    comment: Some("comment update".to_string()),
                    ..Default::default()
                },
                InboundShipmentType::InboundShipment,
            ),
            Err(ServiceError::CannotEditFinalised)
        );
        //CannotChangeStatusOfInvoiceOnHold
        assert_eq!(
            service.update_inbound_shipment(
                &context,
                UpdateInboundShipment {
                    id: mock_inbound_shipment_e().id.clone(),
                    status: Some(UpdateInboundShipmentStatus::Received),
                    ..Default::default()
                },
                InboundShipmentType::InboundShipment,
            ),
            Err(ServiceError::CannotChangeStatusOfInvoiceOnHold)
        );
        // OtherPartyDoesNotExist
        assert_eq!(
            service.update_inbound_shipment(
                &context,
                UpdateInboundShipment {
                    id: mock_inbound_shipment_a().id.clone(),
                    other_party_id: Some("invalid".to_string()),
                    ..Default::default()
                },
                InboundShipmentType::InboundShipment,
            ),
            Err(ServiceError::OtherPartyDoesNotExist)
        );
        // OtherPartyNotVisible
        assert_eq!(
            service.update_inbound_shipment(
                &context,
                UpdateInboundShipment {
                    id: mock_inbound_shipment_a().id.clone(),
                    other_party_id: Some(not_visible().id),
                    ..Default::default()
                },
                InboundShipmentType::InboundShipment,
            ),
            Err(ServiceError::OtherPartyNotVisible)
        );
        // OtherPartyNotASupplier
        assert_eq!(
            service.update_inbound_shipment(
                &context,
                UpdateInboundShipment {
                    id: mock_inbound_shipment_a().id.clone(),
                    other_party_id: Some(not_a_supplier().id),
                    ..Default::default()
                },
                InboundShipmentType::InboundShipment,
            ),
            Err(ServiceError::OtherPartyNotASupplier)
        );
        //NotThisStoreInvoice
        context.store_id = mock_store_b().id;
        assert_eq!(
            service.update_inbound_shipment(
                &context,
                UpdateInboundShipment {
                    id: mock_inbound_shipment_c().id.clone(),
                    ..Default::default()
                },
                InboundShipmentType::InboundShipment,
            ),
            Err(ServiceError::NotThisStoreInvoice)
        );
        // TODO CannotReverseInvoiceStatus,UpdateInvoiceDoesNotExist
    }

    #[actix_rt::test]
    async fn update_inbound_shipment_success() {
        fn supplier() -> NameRow {
            NameRow {
                id: "supplier".to_string(),
                ..Default::default()
            }
        }

        fn supplier_join() -> NameStoreJoinRow {
            NameStoreJoinRow {
                id: "supplier_join".to_string(),
                name_id: supplier().id,
                store_id: mock_store_a().id,
                name_is_supplier: true,
                ..Default::default()
            }
        }

        fn invoice_test() -> InvoiceRow {
            InvoiceRow {
                id: "invoice_test".to_string(),
                name_id: "supplier".to_string(),
                store_id: "store_a".to_string(),
                ..Default::default()
            }
        }

        fn invoice_line_for_test() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "invoice_line_for_test".to_string(),
                invoice_id: "invoice_test".to_string(),
                item_link_id: "item_a".to_string(),
                pack_size: 1.0,
                number_of_packs: 1.0,
                r#type: InvoiceLineType::StockIn,
                ..Default::default()
            }
        }
        fn invoice_line_only_shipped_packs_for_test() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "invoice_line_only_shipped_packs_for_test".to_string(),
                invoice_id: "invoice_test".to_string(),
                item_link_id: "item_a".to_string(),
                pack_size: 1.0,
                number_of_packs: 0.0,
                shipped_number_of_packs: Some(5.0),
                r#type: InvoiceLineType::StockIn,
                ..Default::default()
            }
        }
        fn invoice_line_placeholder_line_for_test() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "invoice_line_placeholder_line_for_test".to_string(),
                invoice_id: "invoice_test".to_string(),
                item_link_id: "item_a".to_string(),
                pack_size: 1.0,
                number_of_packs: 0.0,
                r#type: InvoiceLineType::StockIn,
                ..Default::default()
            }
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "update_inbound_shipment_success",
            MockDataInserts::all(),
            MockData {
                names: vec![supplier()],
                name_store_joins: vec![supplier_join()],
                invoices: vec![invoice_test()],
                invoice_lines: vec![
                    invoice_line_for_test(),
                    invoice_line_only_shipped_packs_for_test(),
                    invoice_line_placeholder_line_for_test(),
                ],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.invoice_service;
        let now = Utc::now().naive_utc();
        let end_time = now.checked_add_signed(Duration::seconds(10)).unwrap();

        // Success
        service
            .update_inbound_shipment(
                &context,
                UpdateInboundShipment {
                    id: mock_inbound_shipment_a().id,
                    other_party_id: Some(supplier().id),
                    ..Default::default()
                },
                InboundShipmentType::InboundShipment,
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&mock_inbound_shipment_a().id)
            .unwrap()
            .unwrap();

        assert_eq!(
            invoice,
            InvoiceRow {
                name_id: supplier().id,
                user_id: Some(mock_user_account_a().id),
                ..invoice.clone()
            }
        );

        // Success with tax change (no stock lines saved)
        service
            .update_inbound_shipment(
                &context,
                UpdateInboundShipment {
                    id: invoice_test().id,
                    tax: Some(ShipmentTaxUpdate {
                        percentage: Some(0.0),
                    }),
                    ..Default::default()
                },
                InboundShipmentType::InboundShipment,
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&invoice_test().id)
            .unwrap()
            .unwrap();

        assert_eq!(
            invoice,
            InvoiceRow {
                tax_percentage: Some(0.0),
                user_id: Some(mock_user_account_a().id),
                ..invoice.clone()
            }
        );

        let filter =
            InvoiceLineFilter::new().invoice_id(EqualFilter::equal_any(vec![invoice.clone().id]));
        let invoice_lines = get_invoice_lines(
            &context,
            &invoice.clone().store_id,
            None,
            Some(filter),
            None,
        )
        .unwrap();

        for line in invoice_lines.rows {
            assert_eq!(line.stock_line_option, None)
        }

        // Test delivered status change with tax
        service
            .update_inbound_shipment(
                &context,
                UpdateInboundShipment {
                    id: invoice_test().id,
                    status: Some(UpdateInboundShipmentStatus::Delivered),
                    tax: Some(ShipmentTaxUpdate {
                        percentage: Some(10.0),
                    }),
                    ..Default::default()
                },
                InboundShipmentType::InboundShipment,
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&invoice_test().id)
            .unwrap()
            .unwrap();

        assert_eq!(
            invoice,
            InvoiceRow {
                tax_percentage: Some(10.0),
                user_id: Some(mock_user_account_a().id),
                status: InvoiceStatus::Delivered,
                ..invoice.clone()
            }
        );

        let filter =
            InvoiceLineFilter::new().invoice_id(EqualFilter::equal_any(vec![invoice.clone().id]));
        let invoice_lines = get_invoice_lines(
            &context,
            &invoice.clone().store_id,
            None,
            Some(filter),
            None,
        )
        .unwrap();

        // There shouldn't be any stock lines saved yet As just in delivered status
        for line in &invoice_lines.rows {
            assert_eq!(line.stock_line_option, None)
        }
        let invoice_line_ids = invoice_lines
            .rows
            .iter()
            .map(|l| l.invoice_line_row.id.clone())
            .collect::<Vec<_>>();

        // Placeholder line should have been removed
        assert_eq!(
            invoice_line_ids,
            vec![
                invoice_line_for_test().id,
                invoice_line_only_shipped_packs_for_test().id,
            ]
        );

        // NEXT: Test updating to received status, and make sure we update stock at this stage
        service
            .update_inbound_shipment(
                &context,
                UpdateInboundShipment {
                    id: invoice_test().id,
                    status: Some(UpdateInboundShipmentStatus::Received),
                    ..Default::default()
                },
                InboundShipmentType::InboundShipment,
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&invoice_test().id)
            .unwrap()
            .unwrap();

        assert_eq!(
            invoice,
            InvoiceRow {
                tax_percentage: Some(10.0),
                user_id: Some(mock_user_account_a().id),
                status: InvoiceStatus::Received,
                ..invoice.clone()
            }
        );

        let filter =
            InvoiceLineFilter::new().invoice_id(EqualFilter::equal_any(vec![invoice.clone().id]));
        let invoice_lines = get_invoice_lines(
            &context,
            &invoice.clone().store_id,
            None,
            Some(filter),
            None,
        )
        .unwrap();
        let mut stock_lines_received = Vec::new();

        for lines in invoice_lines.rows {
            if let Some(stock_line_id) = lines.invoice_line_row.stock_line_id.clone() {
                let stock_line = StockLineRowRepository::new(&connection)
                    .find_one_by_id(&stock_line_id)
                    .unwrap()
                    .unwrap();
                stock_lines_received.push(stock_line.clone());
                assert_eq!(lines.invoice_line_row.stock_line_id, Some(stock_line.id));
            }
        }

        // Ensure the line with only shipped packs does not create a stock line
        assert_eq!(stock_lines_received.len(), 1);

        // Test verified status change with tax
        service
            .update_inbound_shipment(
                &context,
                UpdateInboundShipment {
                    id: invoice_test().id,
                    status: Some(UpdateInboundShipmentStatus::Verified),
                    tax: Some(ShipmentTaxUpdate {
                        percentage: Some(10.0),
                    }),
                    ..Default::default()
                },
                InboundShipmentType::InboundShipment,
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&invoice_test().id)
            .unwrap()
            .unwrap();
        let filter =
            InvoiceLineFilter::new().invoice_id(EqualFilter::equal_any(vec![invoice.clone().id]));
        let invoice_lines = get_invoice_lines(
            &context,
            &invoice.clone().store_id,
            None,
            Some(filter),
            None,
        )
        .unwrap();
        let mut stock_lines_verified = Vec::new();

        for lines in invoice_lines.rows {
            if let Some(stock_line_id) = lines.invoice_line_row.stock_line_id.clone() {
                let stock_line = StockLineRowRepository::new(&connection)
                    .find_one_by_id(&stock_line_id)
                    .unwrap()
                    .unwrap();
                stock_lines_verified.push(stock_line.clone());
            }
        }

        assert_eq!(stock_lines_received, stock_lines_verified);

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "update_inbound_shipment_success_currency",
            MockDataInserts::all(),
            MockData {
                names: vec![supplier()],
                name_store_joins: vec![supplier_join()],
                invoices: vec![invoice_test()],
                invoice_lines: vec![invoice_line_for_test()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.invoice_service;

        // Success with currency change (no stock lines saved)
        service
            .update_inbound_shipment(
                &context,
                UpdateInboundShipment {
                    id: invoice_test().id,
                    currency_id: Some("currency_a".to_string()),
                    currency_rate: Some(1.0),
                    ..Default::default()
                },
                InboundShipmentType::InboundShipment,
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&invoice_test().id)
            .unwrap()
            .unwrap();

        assert_eq!(
            invoice,
            InvoiceRow {
                currency_id: Some("currency_a".to_string()),
                currency_rate: 1.0,
                user_id: Some(mock_user_account_a().id),
                ..invoice.clone()
            }
        );

        let filter =
            InvoiceLineFilter::new().invoice_id(EqualFilter::equal_any(vec![invoice.clone().id]));
        let invoice_lines = get_invoice_lines(
            &context,
            &invoice.clone().store_id,
            None,
            Some(filter),
            None,
        )
        .unwrap();

        for line in invoice_lines.rows {
            assert_eq!(
                line.invoice_line_row.foreign_currency_price_before_tax,
                None
            )
        }

        // Test delivered status change with currency
        let updated_line = InvoiceLineRow {
            stock_line_id: Some(mock_stock_line_a().id),
            ..invoice_line_for_test()
        };

        InvoiceLineRowRepository::new(&connection)
            .upsert_one(&updated_line)
            .unwrap();

        service
            .update_inbound_shipment(
                &context,
                UpdateInboundShipment {
                    id: invoice_test().id,
                    status: Some(UpdateInboundShipmentStatus::Received),
                    currency_id: Some("currency_a".to_string()),
                    currency_rate: Some(1.0),
                    ..Default::default()
                },
                InboundShipmentType::InboundShipment,
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&invoice_test().id)
            .unwrap()
            .unwrap();

        assert_eq!(
            invoice,
            InvoiceRow {
                currency_id: Some("currency_a".to_string()),
                currency_rate: 1.0,
                user_id: Some(mock_user_account_a().id),
                status: InvoiceStatus::Received,
                ..invoice.clone()
            }
        );

        let filter =
            InvoiceLineFilter::new().invoice_id(EqualFilter::equal_any(vec![invoice.clone().id]));
        let invoice_lines = get_invoice_lines(
            &context,
            &invoice.clone().store_id,
            None,
            Some(filter),
            None,
        )
        .unwrap();
        let mut stock_lines_delivered = Vec::new();

        for lines in invoice_lines.rows {
            let stock_line_id = lines.invoice_line_row.stock_line_id.clone().unwrap();
            let stock_line = StockLineRowRepository::new(&connection)
                .find_one_by_id(&stock_line_id)
                .unwrap()
                .unwrap();
            stock_lines_delivered.push(stock_line.clone());
            assert_eq!(lines.invoice_line_row.stock_line_id, Some(stock_line.id));
        }

        // Test verified status change with currency
        service
            .update_inbound_shipment(
                &context,
                UpdateInboundShipment {
                    id: invoice_test().id,
                    status: Some(UpdateInboundShipmentStatus::Verified),
                    currency_id: Some("currency_a".to_string()),
                    currency_rate: Some(1.0),
                    ..Default::default()
                },
                InboundShipmentType::InboundShipment,
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&invoice_test().id)
            .unwrap()
            .unwrap();
        let filter =
            InvoiceLineFilter::new().invoice_id(EqualFilter::equal_any(vec![invoice.clone().id]));
        let invoice_lines = get_invoice_lines(
            &context,
            &invoice.clone().store_id,
            None,
            Some(filter),
            None,
        )
        .unwrap();

        let mut stock_lines_verified = Vec::new();

        for lines in invoice_lines.rows {
            let stock_line_id = lines.invoice_line_row.stock_line_id.clone().unwrap();
            let stock_line = StockLineRowRepository::new(&connection)
                .find_one_by_id(&stock_line_id)
                .unwrap()
                .unwrap();
            stock_lines_verified.push(stock_line.clone());
        }

        assert_eq!(stock_lines_delivered, stock_lines_verified);

        // Test VVM logs

        // Add line with VVM status to new invoice
        insert_stock_in_line(
            &context,
            InsertStockInLine {
                id: "invoice_line_with_vvm_status".to_string(),
                invoice_id: mock_inbound_shipment_c().id, // New status
                item_id: mock_vaccine_item_a().id,
                pack_size: 1.0,
                number_of_packs: 1.0,
                r#type: StockInType::InboundShipment,
                vvm_status_id: Some(mock_vvm_status_a().id),
                ..Default::default()
            },
            None,
        )
        .unwrap();

        let vvm_log_filter = VVMStatusLogFilter::new().invoice_line_id(EqualFilter::equal_to(
            "invoice_line_with_vvm_status".to_string(),
        ));

        let vvm_status_log = VVMStatusLogRepository::new(&connection)
            .query_by_filter(vvm_log_filter.clone())
            .unwrap()
            .first()
            .map(|log| log.id.clone());

        // Check no logs exist before update
        assert_eq!(vvm_status_log, None);

        // Test updating to Received generates Activity logs and VVM status logs
        service
            .update_inbound_shipment(
                &context,
                UpdateInboundShipment {
                    id: mock_inbound_shipment_c().id,
                    status: Some(UpdateInboundShipmentStatus::Received),
                    ..Default::default()
                },
                InboundShipmentType::InboundShipment,
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&mock_inbound_shipment_c().id)
            .unwrap()
            .unwrap();
        let activity_log = ActivityLogRowRepository::new(&connection)
            .find_many_by_record_id(&mock_inbound_shipment_c().id)
            .unwrap()
            .into_iter()
            .find(|l| l.r#type == ActivityLogType::InvoiceStatusReceived)
            .unwrap();
        let vvm_status_log = VVMStatusLogRepository::new(&connection)
            .query_by_filter(vvm_log_filter.clone())
            .unwrap()
            .first()
            .map(|log| log.status_id.clone());

        assert_eq!(invoice.verified_datetime, None);
        assert!(invoice.received_datetime.unwrap() > now);
        assert!(invoice.received_datetime.unwrap() < end_time);
        assert_eq!(activity_log.r#type, ActivityLogType::InvoiceStatusReceived);
        assert_eq!(vvm_status_log, Some(mock_vvm_status_a().id));

        let filter =
            InvoiceLineFilter::new().invoice_id(EqualFilter::equal_any(vec![invoice.clone().id]));
        let invoice_lines = get_invoice_lines(
            &context,
            &invoice.clone().store_id,
            None,
            Some(filter),
            None,
        )
        .unwrap();

        for lines in invoice_lines.rows.clone() {
            let stock_line_id = lines.invoice_line_row.stock_line_id.clone().unwrap();
            let stock_line = StockLineRowRepository::new(&connection)
                .find_one_by_id(&stock_line_id)
                .unwrap()
                .unwrap();
            assert_eq!(lines.invoice_line_row.stock_line_id, Some(stock_line.id));
        }

        // Test log isn't duplicated when status isn't changed
        service
            .update_inbound_shipment(
                &context,
                UpdateInboundShipment {
                    id: mock_inbound_shipment_c().id,
                    other_party_id: Some(supplier().id),
                    ..Default::default()
                },
                InboundShipmentType::InboundShipment,
            )
            .unwrap();

        let log = ActivityLogRowRepository::new(&connection)
            .find_many_by_record_id(&mock_inbound_shipment_c().id)
            .unwrap()
            .into_iter()
            .find(|l| l.r#type == ActivityLogType::InvoiceStatusReceived)
            .unwrap();
        assert_eq!(log.r#type, ActivityLogType::InvoiceStatusReceived);

        //Test success name_store_id linked to store
        service
            .update_inbound_shipment(
                &context,
                UpdateInboundShipment {
                    id: mock_inbound_shipment_a().id,
                    other_party_id: Some(mock_name_linked_to_store_join().name_id.clone()),
                    ..Default::default()
                },
                InboundShipmentType::InboundShipment,
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&mock_inbound_shipment_a().id)
            .unwrap()
            .unwrap();

        assert_eq!(
            invoice,
            InvoiceRow {
                name_store_id: Some(mock_store_linked_to_name().id.clone()),
                ..invoice.clone()
            }
        );

        //Test success name_store_id, not linked to store
        service
            .update_inbound_shipment(
                &context,
                UpdateInboundShipment {
                    id: mock_inbound_shipment_a().id,
                    other_party_id: Some(mock_name_not_linked_to_store_join().name_id.clone()),
                    ..Default::default()
                },
                InboundShipmentType::InboundShipment,
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&mock_inbound_shipment_a().id)
            .unwrap()
            .unwrap();

        assert_eq!(invoice.name_store_id, None);

        // Test Finalised (while setting invoice status onHold to true)
        service
            .update_inbound_shipment(
                &context,
                UpdateInboundShipment {
                    id: mock_inbound_shipment_a().id,
                    other_party_id: Some(supplier().id),
                    status: Some(UpdateInboundShipmentStatus::Verified),
                    on_hold: Some(true),
                    ..Default::default()
                },
                InboundShipmentType::InboundShipment,
            )
            .unwrap();

        let stock_line_id = mock_inbound_shipment_a_invoice_lines()[0]
            .clone()
            .stock_line_id
            .unwrap();
        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&mock_inbound_shipment_a().id)
            .unwrap()
            .unwrap();
        let log = ActivityLogRowRepository::new(&connection)
            .find_many_by_record_id(&mock_inbound_shipment_a().id)
            .unwrap()
            .into_iter()
            .find(|l| l.r#type == ActivityLogType::InvoiceStatusVerified)
            .unwrap();
        let stock_line = StockLineRowRepository::new(&connection)
            .find_one_by_id(&stock_line_id)
            .unwrap()
            .unwrap();

        // Ensure delivered time not updated by status change to verified
        assert_eq!(
            invoice.received_datetime,
            mock_inbound_shipment_a().received_datetime
        );

        assert!(invoice.verified_datetime.unwrap() > now);
        assert!(invoice.verified_datetime.unwrap() < end_time);
        assert_eq!(
            invoice,
            InvoiceRow {
                status: InvoiceStatus::Verified,
                on_hold: true,
                ..invoice.clone()
            }
        );
        assert_eq!(log.r#type, ActivityLogType::InvoiceStatusVerified);
        assert_eq!(Some(invoice.name_id), stock_line.supplier_id);
    }

    #[actix_rt::test]
    async fn update_inbound_shipment_donor_changes() {
        let (_, connection, connection_manager, _) = setup_all_with_data(
            "update_inbound_shipment_donor_changes",
            MockDataInserts::all(),
            MockData {
                invoices: vec![mock_inbound_shipment_f()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context: crate::service_provider::ServiceContext = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let invoice_line_service = service_provider.invoice_line_service;
        let invoice_service = service_provider.invoice_service;
        // First add 2 lines: one with donor id and one without
        invoice_line_service
            .insert_stock_in_line(
                &context,
                InsertStockInLine {
                    id: "new_invoice_line_id_a".to_string(),
                    invoice_id: mock_inbound_shipment_f().id,
                    item_id: mock_item_a().id,
                    pack_size: 1.0,
                    number_of_packs: 1.0,
                    donor_id: Some(mock_donor_a().id),
                    r#type: StockInType::InboundShipment,
                    ..Default::default()
                },
                None,
            )
            .unwrap();
        invoice_line_service
            .insert_stock_in_line(
                &context,
                InsertStockInLine {
                    id: "new_invoice_line_id_b".to_string(),
                    invoice_id: mock_inbound_shipment_f().id,
                    item_id: mock_item_a().id,
                    pack_size: 1.0,
                    number_of_packs: 1.0,
                    donor_id: None,
                    r#type: StockInType::InboundShipment,
                    ..Default::default()
                },
                None,
            )
            .unwrap();

        // None: leaves donor_id on all invoice lines unchanged
        let invoice = invoice_service
            .update_inbound_shipment(
                &context,
                UpdateInboundShipment {
                    id: mock_inbound_shipment_f().id,
                    default_donor: Some(UpdateDefaultDonor {
                        donor_id: Some(mock_donor_b().id),
                        apply_to_lines: ApplyDonorToInvoiceLines::None,
                    }),
                    ..Default::default()
                },
                InboundShipmentType::InboundShipment,
            )
            .unwrap();

        let mut result = InvoiceLineRowRepository::new(&connection)
            .find_many_by_invoice_id(&mock_inbound_shipment_f().id)
            .unwrap();
        result.sort_by(|a, b| a.id.cmp(&b.id));

        assert_eq!(
            invoice.invoice_row.default_donor_id,
            Some(mock_donor_b().id)
        );
        assert_eq!(result.len(), 2);
        assert_eq!(result[0].id, "new_invoice_line_id_a".to_string());
        assert_eq!(result[0].donor_id, Some(mock_donor_a().id));
        assert_eq!(result[1].donor_id, None);

        // UpdateExistingDonor: updates donor_id on invoice lines that already have a donor,
        // and leaves invoice lines without a donor_id unchanged
        let invoice = invoice_service
            .update_inbound_shipment(
                &context,
                UpdateInboundShipment {
                    id: mock_inbound_shipment_f().id,
                    default_donor: Some(UpdateDefaultDonor {
                        donor_id: Some(mock_donor_b().id),
                        apply_to_lines: ApplyDonorToInvoiceLines::UpdateExistingDonor,
                    }),
                    ..Default::default()
                },
                InboundShipmentType::InboundShipment,
            )
            .unwrap();

        let mut result = InvoiceLineRowRepository::new(&connection)
            .find_many_by_invoice_id(&mock_inbound_shipment_f().id)
            .unwrap();
        result.sort_by(|a, b| a.id.cmp(&b.id));

        assert_eq!(
            invoice.invoice_row.default_donor_id,
            Some(mock_donor_b().id)
        );
        assert_eq!(result[0].donor_id, Some(mock_donor_b().id));
        assert_eq!(result[1].donor_id, None);

        // AssignIfNone: assigns the default_donor_id to invoice lines that don't have a donor_id
        invoice_service
            .update_inbound_shipment(
                &context,
                UpdateInboundShipment {
                    id: mock_inbound_shipment_f().id,
                    default_donor: Some(UpdateDefaultDonor {
                        donor_id: Some(mock_donor_a().id),
                        apply_to_lines: ApplyDonorToInvoiceLines::AssignIfNone,
                    }),
                    ..Default::default()
                },
                InboundShipmentType::InboundShipment,
            )
            .unwrap();

        let mut result = InvoiceLineRowRepository::new(&connection)
            .find_many_by_invoice_id(&mock_inbound_shipment_f().id)
            .unwrap();
        result.sort_by(|a, b| a.id.cmp(&b.id));

        assert_eq!(result[0].donor_id, Some(mock_donor_b().id));
        assert_eq!(result[1].donor_id, Some(mock_donor_a().id));

        // AssignToAll: assigns the default_donor_id to all invoice lines
        invoice_service
            .update_inbound_shipment(
                &context,
                UpdateInboundShipment {
                    id: mock_inbound_shipment_f().id,
                    default_donor: Some(UpdateDefaultDonor {
                        donor_id: None,
                        apply_to_lines: ApplyDonorToInvoiceLines::AssignToAll,
                    }),
                    ..Default::default()
                },
                InboundShipmentType::InboundShipment,
            )
            .unwrap();

        let mut result = InvoiceLineRowRepository::new(&connection)
            .find_many_by_invoice_id(&mock_inbound_shipment_f().id)
            .unwrap();
        result.sort_by(|a, b| a.id.cmp(&b.id));

        assert!(result.iter().all(|line| line.donor_id.is_none()));
    }

    #[actix_rt::test]
    async fn update_inbound_shipment_cannot_receive_with_pending_lines() {
        fn delivered_invoice() -> InvoiceRow {
            InvoiceRow {
                id: "delivered_invoice_with_pending".to_string(),
                name_id: mock_name_a().id,
                store_id: mock_store_a().id,
                r#type: InvoiceType::InboundShipment,
                status: InvoiceStatus::Delivered,
                ..Default::default()
            }
        }

        fn pending_line() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "pending_line".to_string(),
                invoice_id: delivered_invoice().id,
                item_link_id: mock_item_a().id,
                r#type: InvoiceLineType::StockIn,
                pack_size: 1.0,
                number_of_packs: 10.0,
                status: Some(InvoiceLineStatus::Pending),
                ..Default::default()
            }
        }

        fn passed_line() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "passed_line_on_pending_invoice".to_string(),
                invoice_id: delivered_invoice().id,
                item_link_id: mock_item_a().id,
                r#type: InvoiceLineType::StockIn,
                pack_size: 1.0,
                number_of_packs: 5.0,
                status: Some(InvoiceLineStatus::Passed),
                ..Default::default()
            }
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "update_inbound_cannot_receive_pending",
            MockDataInserts::all(),
            MockData {
                invoices: vec![delivered_invoice()],
                invoice_lines: vec![pending_line(), passed_line()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.invoice_service;

        // Cannot receive when there are still pending lines
        assert_eq!(
            service.update_inbound_shipment(
                &context,
                UpdateInboundShipment {
                    id: delivered_invoice().id,
                    status: Some(UpdateInboundShipmentStatus::Received),
                    ..Default::default()
                },
                InboundShipmentType::InboundShipment,
            ),
            Err(ServiceError::CannotReceiveWithPendingLines)
        );

        // Cannot verify when there are still pending lines
        assert_eq!(
            service.update_inbound_shipment(
                &context,
                UpdateInboundShipment {
                    id: delivered_invoice().id,
                    status: Some(UpdateInboundShipmentStatus::Verified),
                    ..Default::default()
                },
                InboundShipmentType::InboundShipment,
            ),
            Err(ServiceError::CannotReceiveWithPendingLines)
        );
    }

    #[actix_rt::test]
    async fn update_inbound_shipment_rejected_lines_no_stock() {
        fn delivered_invoice() -> InvoiceRow {
            InvoiceRow {
                id: "delivered_invoice_line_status".to_string(),
                name_id: mock_name_a().id,
                store_id: mock_store_a().id,
                r#type: InvoiceType::InboundShipment,
                status: InvoiceStatus::Delivered,
                ..Default::default()
            }
        }

        fn passed_line() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "status_test_passed_line".to_string(),
                invoice_id: delivered_invoice().id,
                item_link_id: mock_item_a().id,
                r#type: InvoiceLineType::StockIn,
                pack_size: 1.0,
                number_of_packs: 10.0,
                status: Some(InvoiceLineStatus::Passed),
                ..Default::default()
            }
        }

        fn rejected_line() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "status_test_rejected_line".to_string(),
                invoice_id: delivered_invoice().id,
                item_link_id: mock_item_a().id,
                r#type: InvoiceLineType::UnallocatedStock,
                pack_size: 1.0,
                number_of_packs: 5.0,
                status: Some(InvoiceLineStatus::Rejected),
                ..Default::default()
            }
        }

        fn no_status_line() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "status_test_no_status_line".to_string(),
                invoice_id: delivered_invoice().id,
                item_link_id: mock_item_a().id,
                r#type: InvoiceLineType::StockIn,
                pack_size: 1.0,
                number_of_packs: 3.0,
                status: None,
                ..Default::default()
            }
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "inbound_rejected_lines_no_stock",
            MockDataInserts::all(),
            MockData {
                invoices: vec![delivered_invoice()],
                invoice_lines: vec![passed_line(), rejected_line(), no_status_line()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.invoice_service;

        // Transition to Received - should succeed since no pending lines
        service
            .update_inbound_shipment(
                &context,
                UpdateInboundShipment {
                    id: delivered_invoice().id,
                    status: Some(UpdateInboundShipmentStatus::Received),
                    ..Default::default()
                },
                InboundShipmentType::InboundShipment,
            )
            .unwrap();

        // Passed line should have a stock line created
        let passed = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id(&passed_line().id)
            .unwrap()
            .unwrap();
        assert!(
            passed.stock_line_id.is_some(),
            "Passed line should have a stock line"
        );
        let passed_stock = StockLineRowRepository::new(&connection)
            .find_one_by_id(&passed.stock_line_id.unwrap())
            .unwrap()
            .unwrap();
        assert_eq!(passed_stock.total_number_of_packs, 10.0);
        assert_eq!(passed_stock.available_number_of_packs, 10.0);

        // No-status line should also have a stock line (backwards compatible)
        let no_status = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id(&no_status_line().id)
            .unwrap()
            .unwrap();
        assert!(
            no_status.stock_line_id.is_some(),
            "No-status line should have a stock line"
        );
        let no_status_stock = StockLineRowRepository::new(&connection)
            .find_one_by_id(&no_status.stock_line_id.unwrap())
            .unwrap()
            .unwrap();
        assert_eq!(no_status_stock.total_number_of_packs, 3.0);
        assert_eq!(no_status_stock.available_number_of_packs, 3.0);

        // Rejected line should NOT have a stock line
        let rejected = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id(&rejected_line().id)
            .unwrap()
            .unwrap();
        assert_eq!(
            rejected.stock_line_id, None,
            "Rejected line should NOT have a stock line"
        );
    }

    #[actix_rt::test]
    async fn update_inbound_shipment_cost_price_with_po() {
        use repository::{PurchaseOrderLineRow, PurchaseOrderRow, PurchaseOrderStatus};

        fn supplier() -> NameRow {
            NameRow {
                id: "cost_price_supplier".to_string(),
                ..Default::default()
            }
        }

        fn supplier_join() -> NameStoreJoinRow {
            NameStoreJoinRow {
                id: "cost_price_supplier_join".to_string(),
                name_id: supplier().id,
                store_id: mock_store_a().id,
                name_is_supplier: true,
                ..Default::default()
            }
        }

        fn purchase_order() -> PurchaseOrderRow {
            PurchaseOrderRow {
                id: "cost_price_test_po".to_string(),
                store_id: mock_store_a().id,
                supplier_name_id: mock_name_a().id,
                purchase_order_number: 1,
                status: PurchaseOrderStatus::Sent,
                created_datetime: chrono::NaiveDateTime::default(),
                foreign_exchange_rate: 1.0,
                ..Default::default()
            }
        }

        fn po_line_a() -> PurchaseOrderLineRow {
            PurchaseOrderLineRow {
                id: "cost_price_test_po_line_a".to_string(),
                store_id: mock_store_a().id,
                purchase_order_id: purchase_order().id,
                line_number: 1,
                item_link_id: mock_item_a().id,
                item_name: "Item A".to_string(),
                price_per_pack_after_discount: 10.0,
                requested_pack_size: 1.0,
                ..Default::default()
            }
        }

        fn po_line_b() -> PurchaseOrderLineRow {
            PurchaseOrderLineRow {
                id: "cost_price_test_po_line_b".to_string(),
                store_id: mock_store_a().id,
                purchase_order_id: purchase_order().id,
                line_number: 2,
                item_link_id: mock_item_a().id,
                item_name: "Item A".to_string(),
                price_per_pack_after_discount: 20.0,
                requested_pack_size: 1.0,
                ..Default::default()
            }
        }

        fn invoice_with_po() -> InvoiceRow {
            InvoiceRow {
                id: "cost_price_test_invoice".to_string(),
                name_id: supplier().id,
                store_id: mock_store_a().id,
                r#type: InvoiceType::InboundShipment,
                status: InvoiceStatus::New,
                // Set to None for mock insert (invoices inserted before POs).
                // Updated to Some after setup_all_with_data.
                purchase_order_id: None,
                currency_rate: 1.0,
                charges_local_currency: 0.0,
                charges_foreign_currency: 0.0,
                ..Default::default()
            }
        }

        fn invoice_line_a() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "cost_price_test_line_a".to_string(),
                invoice_id: invoice_with_po().id,
                item_link_id: mock_item_a().id,
                pack_size: 1.0,
                number_of_packs: 5.0,
                cost_price_per_pack: 10.0,
                sell_price_per_pack: 10.0, // matches cost, should update together
                r#type: InvoiceLineType::StockIn,
                // Set to None for mock insert (invoice lines inserted before PO lines).
                // Updated to Some after setup_all_with_data.
                purchase_order_line_id: None,
                ..Default::default()
            }
        }

        fn invoice_line_b() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "cost_price_test_line_b".to_string(),
                invoice_id: invoice_with_po().id,
                item_link_id: mock_item_a().id,
                pack_size: 1.0,
                number_of_packs: 10.0,
                cost_price_per_pack: 20.0,
                sell_price_per_pack: 25.0, // different from cost, should NOT update
                r#type: InvoiceLineType::StockIn,
                // Set to None for mock insert. Updated after setup_all_with_data.
                purchase_order_line_id: None,
                ..Default::default()
            }
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "update_inbound_shipment_cost_price_with_po",
            MockDataInserts::all(),
            MockData {
                names: vec![supplier()],
                name_store_joins: vec![supplier_join()],
                purchase_order: vec![purchase_order()],
                purchase_order_line: vec![po_line_a(), po_line_b()],
                invoices: vec![invoice_with_po()],
                invoice_lines: vec![invoice_line_a(), invoice_line_b()],
                ..Default::default()
            },
        )
        .await;

        // Link invoice and lines to PO now that all exist in DB
        // (invoices/lines are inserted before POs/PO lines in mock setup)
        let mut invoice_row = invoice_with_po();
        invoice_row.purchase_order_id = Some(purchase_order().id);
        InvoiceRowRepository::new(&connection)
            .upsert_one(&invoice_row)
            .unwrap();

        let invoice_line_repo = InvoiceLineRowRepository::new(&connection);
        let mut line_a = invoice_line_a();
        line_a.purchase_order_line_id = Some(po_line_a().id);
        invoice_line_repo.upsert_one(&line_a).unwrap();
        let mut line_b = invoice_line_b();
        line_b.purchase_order_line_id = Some(po_line_b().id);
        invoice_line_repo.upsert_one(&line_b).unwrap();

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.invoice_service;

        // ============================================================
        // Test 1: Charges update recalculates cost prices for PO invoice
        // ============================================================
        // PO line A: price_per_pack_after_discount = 10, 5 packs -> 50 local
        // PO line B: price_per_pack_after_discount = 20, 10 packs -> 200 local
        // total_goods_local = 50 + 200 = 250
        // charges_local = 25 -> cost_adjustment_fraction = 25 / 250 = 0.1
        // Line A new_cost = 10 * 1.1 = 11
        // Line B new_cost = 20 * 1.1 = 22
        service
            .update_inbound_shipment(
                &context,
                UpdateInboundShipment {
                    id: invoice_with_po().id,
                    charges_local_currency: Some(25.0),
                    ..Default::default()
                },
                InboundShipmentType::InboundShipmentExternal,
            )
            .unwrap();

        let line_a = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id(&invoice_line_a().id)
            .unwrap()
            .unwrap();
        let line_b = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id(&invoice_line_b().id)
            .unwrap()
            .unwrap();

        assert!(
            (line_a.cost_price_per_pack - 11.0).abs() < 0.0001,
            "Line A cost should be 11.0, got {}",
            line_a.cost_price_per_pack
        );
        // Line A sell price matched old cost price (10.0), so should be updated
        assert!(
            (line_a.sell_price_per_pack - 11.0).abs() < 0.0001,
            "Line A sell price should update to 11.0 (was equal to old cost), got {}",
            line_a.sell_price_per_pack
        );

        assert!(
            (line_b.cost_price_per_pack - 22.0).abs() < 0.0001,
            "Line B cost should be 22.0, got {}",
            line_b.cost_price_per_pack
        );
        // Line B sell price did NOT match old cost price (25.0 != 20.0), so should be unchanged
        assert!(
            (line_b.sell_price_per_pack - 25.0).abs() < 0.0001,
            "Line B sell price should remain 25.0 (was different from old cost), got {}",
            line_b.sell_price_per_pack
        );

        // ============================================================
        // Test 2: Idempotency - running again with same charges produces same result
        // ============================================================
        service
            .update_inbound_shipment(
                &context,
                UpdateInboundShipment {
                    id: invoice_with_po().id,
                    charges_local_currency: Some(25.0),
                    ..Default::default()
                },
                InboundShipmentType::InboundShipmentExternal,
            )
            .unwrap();

        let line_a_again = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id(&invoice_line_a().id)
            .unwrap()
            .unwrap();
        let line_b_again = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id(&invoice_line_b().id)
            .unwrap()
            .unwrap();

        assert!(
            (line_a_again.cost_price_per_pack - 11.0).abs() < 0.0001,
            "Line A cost should still be 11.0 after second run, got {}",
            line_a_again.cost_price_per_pack
        );
        assert!(
            (line_b_again.cost_price_per_pack - 22.0).abs() < 0.0001,
            "Line B cost should still be 22.0 after second run, got {}",
            line_b_again.cost_price_per_pack
        );

        // ============================================================
        // Test 3: Currency rate conversion
        // ============================================================
        // Reset charges to 0, set currency rate to 2.0
        // Rate convention: home currency units per 1 foreign unit
        // PO prices are in foreign currency, so local = po_price * rate
        // Line A: 10 * 2 = 20, Line B: 20 * 2 = 40
        // No charges, so no adjustment
        service
            .update_inbound_shipment(
                &context,
                UpdateInboundShipment {
                    id: invoice_with_po().id,
                    currency_rate: Some(2.0),
                    charges_local_currency: Some(0.0),
                    charges_foreign_currency: Some(0.0),
                    ..Default::default()
                },
                InboundShipmentType::InboundShipmentExternal,
            )
            .unwrap();

        let line_a = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id(&invoice_line_a().id)
            .unwrap()
            .unwrap();
        let line_b = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id(&invoice_line_b().id)
            .unwrap()
            .unwrap();

        assert!(
            (line_a.cost_price_per_pack - 20.0).abs() < 0.0001,
            "Line A cost should be 20.0 with rate 2.0, got {}",
            line_a.cost_price_per_pack
        );
        assert!(
            (line_b.cost_price_per_pack - 40.0).abs() < 0.0001,
            "Line B cost should be 40.0 with rate 2.0, got {}",
            line_b.cost_price_per_pack
        );

        // ============================================================
        // Test 4: Foreign currency charges with rate conversion
        // ============================================================
        // rate = 2.0, charges_foreign = 50 (= 50 * 2 = 100 local), charges_local = 0
        // total_goods_local = 20*5 + 40*10 = 100 + 400 = 500
        // cost_adjustment = 100 / 500 = 0.2
        // Line A: 20 * 1.2 = 24, Line B: 40 * 1.2 = 48
        service
            .update_inbound_shipment(
                &context,
                UpdateInboundShipment {
                    id: invoice_with_po().id,
                    currency_rate: Some(2.0),
                    charges_foreign_currency: Some(50.0),
                    charges_local_currency: Some(0.0),
                    ..Default::default()
                },
                InboundShipmentType::InboundShipmentExternal,
            )
            .unwrap();

        let line_a = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id(&invoice_line_a().id)
            .unwrap()
            .unwrap();
        let line_b = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id(&invoice_line_b().id)
            .unwrap()
            .unwrap();

        assert!(
            (line_a.cost_price_per_pack - 24.0).abs() < 0.0001,
            "Line A cost should be 24.0 with foreign charges, got {}",
            line_a.cost_price_per_pack
        );
        assert!(
            (line_b.cost_price_per_pack - 48.0).abs() < 0.0001,
            "Line B cost should be 48.0 with foreign charges, got {}",
            line_b.cost_price_per_pack
        );

        // ============================================================
        // Test 5: Combined local and foreign charges
        // ============================================================
        // rate = 2.0, charges_foreign = 50 (= 100 local), charges_local = 25
        // total_charges = 100 + 25 = 125
        // total_goods_local = 100 + 400 = 500
        // cost_adjustment = 125 / 500 = 0.25
        // Line A: 20 * 1.25 = 25, Line B: 40 * 1.25 = 50
        service
            .update_inbound_shipment(
                &context,
                UpdateInboundShipment {
                    id: invoice_with_po().id,
                    currency_rate: Some(2.0),
                    charges_foreign_currency: Some(50.0),
                    charges_local_currency: Some(25.0),
                    ..Default::default()
                },
                InboundShipmentType::InboundShipmentExternal,
            )
            .unwrap();

        let line_a = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id(&invoice_line_a().id)
            .unwrap()
            .unwrap();
        let line_b = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id(&invoice_line_b().id)
            .unwrap()
            .unwrap();

        assert!(
            (line_a.cost_price_per_pack - 25.0).abs() < 0.0001,
            "Line A cost should be 25.0, got {}",
            line_a.cost_price_per_pack
        );
        assert!(
            (line_b.cost_price_per_pack - 50.0).abs() < 0.0001,
            "Line B cost should be 50.0, got {}",
            line_b.cost_price_per_pack
        );
    }

    #[actix_rt::test]
    async fn update_inbound_shipment_cost_price_without_po() {
        fn supplier() -> NameRow {
            NameRow {
                id: "no_po_cost_supplier".to_string(),
                ..Default::default()
            }
        }

        fn supplier_join() -> NameStoreJoinRow {
            NameStoreJoinRow {
                id: "no_po_cost_supplier_join".to_string(),
                name_id: supplier().id,
                store_id: mock_store_a().id,
                name_is_supplier: true,
                ..Default::default()
            }
        }

        fn invoice_without_po() -> InvoiceRow {
            InvoiceRow {
                id: "no_po_cost_test_invoice".to_string(),
                name_id: supplier().id,
                store_id: mock_store_a().id,
                r#type: InvoiceType::InboundShipment,
                status: InvoiceStatus::New,
                purchase_order_id: None, // No PO
                currency_rate: 1.0,
                charges_local_currency: 0.0,
                charges_foreign_currency: 0.0,
                ..Default::default()
            }
        }

        fn invoice_line() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "no_po_cost_test_line".to_string(),
                invoice_id: invoice_without_po().id,
                item_link_id: mock_item_a().id,
                pack_size: 1.0,
                number_of_packs: 5.0,
                cost_price_per_pack: 10.0,
                sell_price_per_pack: 10.0,
                r#type: InvoiceLineType::StockIn,
                purchase_order_line_id: None,
                ..Default::default()
            }
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "update_inbound_shipment_cost_price_without_po",
            MockDataInserts::all(),
            MockData {
                names: vec![supplier()],
                name_store_joins: vec![supplier_join()],
                invoices: vec![invoice_without_po()],
                invoice_lines: vec![invoice_line()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.invoice_service;

        // Updating charges on a non-PO invoice should NOT change cost prices
        service
            .update_inbound_shipment(
                &context,
                UpdateInboundShipment {
                    id: invoice_without_po().id,
                    charges_local_currency: Some(25.0),
                    ..Default::default()
                },
                InboundShipmentType::InboundShipment,
            )
            .unwrap();

        let line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id(&invoice_line().id)
            .unwrap()
            .unwrap();

        assert!(
            (line.cost_price_per_pack - 10.0).abs() < 0.0001,
            "Cost price should remain 10.0 for non-PO invoice, got {}",
            line.cost_price_per_pack
        );
        assert!(
            (line.sell_price_per_pack - 10.0).abs() < 0.0001,
            "Sell price should remain 10.0 for non-PO invoice, got {}",
            line.sell_price_per_pack
        );

        // Also test currency rate change on non-PO invoice
        service
            .update_inbound_shipment(
                &context,
                UpdateInboundShipment {
                    id: invoice_without_po().id,
                    currency_rate: Some(2.0),
                    ..Default::default()
                },
                InboundShipmentType::InboundShipment,
            )
            .unwrap();

        let line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id(&invoice_line().id)
            .unwrap()
            .unwrap();

        assert!(
            (line.cost_price_per_pack - 10.0).abs() < 0.0001,
            "Cost price should remain 10.0 after currency rate change on non-PO invoice, got {}",
            line.cost_price_per_pack
        );
    }

    #[actix_rt::test]
    async fn update_inbound_shipment_backdate_received_errors() {
        use repository::LocationMovementRow;

        let now = Utc::now();
        let two_days_ago = now - Duration::days(2);
        fn new_inbound() -> InvoiceRow {
            InvoiceRow {
                id: "new_inbound_backdate".to_string(),
                name_id: mock_name_a().id,
                store_id: mock_store_a().id,
                r#type: InvoiceType::InboundShipment,
                status: InvoiceStatus::New,
                ..Default::default()
            }
        }

        fn received_inbound(received_datetime: DateTime<Utc>) -> InvoiceRow {
            let naive = received_datetime.naive_utc();
            InvoiceRow {
                id: "received_inbound_backdate".to_string(),
                name_id: mock_name_a().id,
                store_id: mock_store_a().id,
                r#type: InvoiceType::InboundShipment,
                status: InvoiceStatus::Received,
                received_datetime: Some(naive),
                delivered_datetime: Some(naive - Duration::days(1)),
                ..Default::default()
            }
        }

        let (_, _connection, connection_manager, _) = setup_all_with_data(
            "update_inbound_backdate_received_errors",
            MockDataInserts::all(),
            MockData {
                invoices: vec![new_inbound(), received_inbound(now)],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = &service_provider.invoice_service;

        // BackdatingNotEnabled: preference not yet enabled
        assert_eq!(
            service.update_inbound_shipment(
                &context,
                UpdateInboundShipment {
                    id: received_inbound(now).id,
                    received_datetime: Some(two_days_ago),
                    ..Default::default()
                },
                InboundShipmentType::InboundShipment,
            ),
            Err(UpdateInboundShipmentError::BackdatingNotEnabled)
        );

        // Enable backdating preference
        use repository::{PreferenceRow, PreferenceRowRepository};
        PreferenceRowRepository::new(&_connection)
            .upsert_one(&PreferenceRow {
                id: "backdating_of_shipments_global".to_string(),
                key: "backdating_of_shipments".to_string(),
                value: r#"{"enabled":true,"maxDays":0}"#.to_string(),
                store_id: None,
            })
            .unwrap();

        // CanOnlyBackdateReceivedShipments: invoice is New
        assert_eq!(
            service.update_inbound_shipment(
                &context,
                UpdateInboundShipment {
                    id: new_inbound().id,
                    received_datetime: Some(two_days_ago),
                    ..Default::default()
                },
                InboundShipmentType::InboundShipment,
            ),
            Err(UpdateInboundShipmentError::CanOnlyBackdateReceivedShipments)
        );

        // CannotMoveReceivedDateForward: future date
        let future_date = now + Duration::days(5);
        assert_eq!(
            service.update_inbound_shipment(
                &context,
                UpdateInboundShipment {
                    id: received_inbound(now).id,
                    received_datetime: Some(future_date),
                    ..Default::default()
                },
                InboundShipmentType::InboundShipment,
            ),
            Err(UpdateInboundShipmentError::CannotMoveReceivedDateForward)
        );

        // CannotMoveReceivedDateForward: same datetime
        assert_eq!(
            service.update_inbound_shipment(
                &context,
                UpdateInboundShipment {
                    id: received_inbound(now).id,
                    received_datetime: Some(now),
                    ..Default::default()
                },
                InboundShipmentType::InboundShipment,
            ),
            Err(UpdateInboundShipmentError::CannotMoveReceivedDateForward)
        );

        // Setting received before delivered should succeed and auto-adjust delivered
        let before_delivered = now - Duration::days(2);
        let result = service.update_inbound_shipment(
            &context,
            UpdateInboundShipment {
                id: received_inbound(now).id,
                received_datetime: Some(before_delivered),
                ..Default::default()
            },
            InboundShipmentType::InboundShipment,
        );
        assert!(result.is_ok(), "Not Ok(_) {:#?}", result);

        let updated = InvoiceRowRepository::new(&_connection)
            .find_one_by_id(&received_inbound(now).id)
            .unwrap()
            .unwrap();
        // delivered_datetime should have been moved back to match received
        assert_eq!(
            updated.delivered_datetime,
            Some(before_delivered.naive_utc())
        );
    }

    #[actix_rt::test]
    async fn update_inbound_shipment_backdate_received_success() {
        use repository::{
            location_movement::{LocationMovementFilter, LocationMovementRepository},
            LocationMovementRow, LocationMovementRowRepository,
        };

        let now = Utc::now();
        let three_days_ago = now - Duration::days(3);

        fn received_inbound(received_datetime: DateTime<Utc>) -> InvoiceRow {
            let naive = received_datetime.naive_utc();
            InvoiceRow {
                id: "received_inbound_backdate_success".to_string(),
                name_id: mock_name_a().id,
                store_id: mock_store_a().id,
                r#type: InvoiceType::InboundShipment,
                status: InvoiceStatus::Received,
                created_datetime: naive,
                received_datetime: Some(naive),
                delivered_datetime: Some(naive),
                ..Default::default()
            }
        }

        fn invoice_line(stock_line_id: &str) -> InvoiceLineRow {
            InvoiceLineRow {
                id: "backdate_success_line".to_string(),
                invoice_id: "received_inbound_backdate_success".to_string(),
                item_link_id: mock_item_a().id,
                stock_line_id: Some(stock_line_id.to_string()),
                r#type: InvoiceLineType::StockIn,
                number_of_packs: 10.0,
                pack_size: 1.0,
                ..Default::default()
            }
        }

        fn stock_line() -> repository::StockLineRow {
            repository::StockLineRow {
                id: "backdate_success_stock_line".to_string(),
                store_id: mock_store_a().id,
                item_link_id: mock_item_a().id,
                available_number_of_packs: 10.0,
                total_number_of_packs: 10.0,
                pack_size: 1.0,
                ..Default::default()
            }
        }

        fn location_movement(
            stock_line_id: &str,
            enter_datetime: chrono::NaiveDateTime,
        ) -> LocationMovementRow {
            LocationMovementRow {
                id: "backdate_success_movement".to_string(),
                store_id: mock_store_a().id,
                stock_line_id: stock_line_id.to_string(),
                location_id: None,
                enter_datetime: Some(enter_datetime),
                exit_datetime: None,
            }
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "update_inbound_backdate_received_success",
            MockDataInserts::all(),
            MockData {
                invoices: vec![received_inbound(now)],
                invoice_lines: vec![invoice_line(&stock_line().id)],
                stock_lines: vec![stock_line()],
                ..Default::default()
            },
        )
        .await;

        // Insert location movement manually (not in MockData)
        LocationMovementRowRepository::new(&connection)
            .upsert_one(&location_movement(&stock_line().id, now.naive_utc()))
            .unwrap();

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = &service_provider.invoice_service;

        let result = service.update_inbound_shipment(
            &context,
            UpdateInboundShipment {
                id: received_inbound(now).id,
                received_datetime: Some(three_days_ago),
                ..Default::default()
            },
            InboundShipmentType::InboundShipment,
        );

        assert!(result.is_ok(), "Not Ok(_) {:#?}", result);

        // Check received_datetime was updated
        let updated = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&received_inbound(now).id)
            .unwrap()
            .unwrap();

        assert_eq!(
            updated.received_datetime,
            Some(chrono::NaiveDateTime::from(three_days_ago.date()))
        );

        // Check delivered_datetime was moved back
        assert_eq!(
            updated.delivered_datetime,
            Some(chrono::NaiveDateTime::from(three_days_ago.date()))
        );

        // Check created_datetime was moved back
        assert_eq!(
            updated.created_datetime,
            chrono::NaiveDateTime::from(three_days_ago.date())
        );

        // Check location movement enter_datetime was updated
        let movements = LocationMovementRepository::new(&connection)
            .query(
                Default::default(),
                Some(
                    LocationMovementFilter::new()
                        .stock_line_id(EqualFilter::equal_to(stock_line().id)),
                ),
                None,
            )
            .unwrap();

        assert_eq!(movements.len(), 1);
        assert_eq!(
            movements[0].location_movement_row.enter_datetime,
            Some(chrono::NaiveDateTime::from(three_days_ago.date()))
        );

        // Check activity log entry was created for backdating
        use repository::activity_log::{ActivityLogFilter, ActivityLogRepository};
        let logs = ActivityLogRepository::new(&connection)
            .query(
                Default::default(),
                Some(
                    ActivityLogFilter::new()
                        .r#type(ActivityLogType::InvoiceDateBackdated.equal_to()),
                ),
                None,
            )
            .unwrap();

        assert_eq!(logs.len(), 1);
        assert_eq!(
            logs[0].activity_log_row.record_id,
            Some(received_inbound(now).id)
        );
        assert!(logs[0].activity_log_row.changed_from.is_some());
        assert!(logs[0].activity_log_row.changed_to.is_some());
    }
}
