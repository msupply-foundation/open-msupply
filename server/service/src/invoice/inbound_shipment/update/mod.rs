use crate::activity_log::{activity_log_entry, log_type_from_invoice_status};
use crate::invoice_line::ShipmentTaxUpdate;
use crate::{invoice::query::get_invoice, service_provider::ServiceContext, WithDBError};
use repository::vvm_status::vvm_status_log_row::VVMStatusLogRowRepository;
use repository::{Invoice, LocationMovementRowRepository};
use repository::{
    InvoiceLineRowRepository, InvoiceRowRepository, InvoiceStatus, RepositoryError,
    StockLineRowRepository,
};

mod generate;
mod validate;

use crate::invoice::inbound_shipment::update::generate::GenerateResult;
use generate::generate;
use validate::validate;

use self::generate::LineAndStockLine;

#[derive(Clone, Debug, PartialEq)]
pub enum UpdateInboundShipmentStatus {
    Delivered,
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
    pub default_donor: Option<UpdateDefaultDonor>,
}

type OutError = UpdateInboundShipmentError;

pub fn update_inbound_shipment(
    ctx: &ServiceContext,
    patch: UpdateInboundShipment,
) -> Result<Invoice, OutError> {
    let invoice = ctx
        .connection
        .transaction_sync(|connection| {
            let (invoice, other_party, status_changed) =
                validate(connection, &ctx.store_id, &patch)?;
            let GenerateResult {
                batches_to_update,
                update_invoice,
                empty_lines_to_trim,
                location_movements,
                update_tax_for_lines,
                update_currency_for_lines,
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

            if status_changed {
                activity_log_entry(
                    ctx,
                    log_type_from_invoice_status(&update_invoice.status, false),
                    Some(update_invoice.id.to_owned()),
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

    Ok(invoice)
}

#[derive(Debug, PartialEq)]
pub enum UpdateInboundShipmentError {
    InvoiceDoesNotExist,
    NotAnInboundShipment,
    NotThisStoreInvoice,
    CannotReverseInvoiceStatus,
    CannotEditFinalised,
    CannotChangeStatusOfInvoiceOnHold,
    CannotIssueForeignCurrencyForInternalSuppliers,
    CannotUpdateStatusAndDonorAtTheSameTime,
    // Name validation
    OtherPartyDoesNotExist,
    OtherPartyNotVisible,
    OtherPartyNotASupplier,
    // Internal
    DatabaseError(RepositoryError),
    UpdatedInvoiceDoesNotExist,
}

impl From<RepositoryError> for UpdateInboundShipmentError {
    fn from(error: RepositoryError) -> Self {
        UpdateInboundShipmentError::DatabaseError(error)
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
            UpdateInboundShipmentStatus::Delivered => InvoiceStatus::Delivered,
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
    use chrono::{Duration, NaiveDate, Utc};
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
        InvoiceLineRowRepository, InvoiceLineType, InvoiceRow, InvoiceRowRepository, InvoiceStatus,
        InvoiceType, NameRow, NameStoreJoinRow, StockLineRowRepository,
    };
    use util::{inline_edit, inline_init};

    use crate::{
        invoice::inbound_shipment::{
            UpdateDefaultDonor, UpdateInboundShipment, UpdateInboundShipmentStatus,
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
            inline_init(|r: &mut NameRow| {
                r.id = "not_visible".to_string();
            })
        }

        fn not_a_supplier() -> NameRow {
            inline_init(|r: &mut NameRow| {
                r.id = "not_a_supplier".to_string();
            })
        }

        fn not_a_supplier_join() -> NameStoreJoinRow {
            inline_init(|r: &mut NameStoreJoinRow| {
                r.id = "not_a_supplier_join".to_string();
                r.name_link_id = not_a_supplier().id;
                r.store_id = mock_store_a().id;
                r.name_is_supplier = false;
            })
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "update_inbound_shipment_errors",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.names = vec![not_visible(), not_a_supplier()];
                r.name_store_joins = vec![not_a_supplier_join()];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let mut context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_service;

        //InvoiceDoesNotExist
        assert_eq!(
            service.update_inbound_shipment(
                &context,
                inline_init(|r: &mut UpdateInboundShipment| {
                    r.id = "invalid".to_string();
                    r.other_party_id = Some(mock_name_a().id.clone());
                })
            ),
            Err(ServiceError::InvoiceDoesNotExist)
        );
        //NotAnInboundShipment
        assert_eq!(
            service.update_inbound_shipment(
                &context,
                inline_init(|r: &mut UpdateInboundShipment| {
                    r.id.clone_from(&mock_outbound_shipment_e().id);
                    r.other_party_id = Some(mock_name_a().id.clone());
                })
            ),
            Err(ServiceError::NotAnInboundShipment)
        );
        //CannotEditFinalised
        assert_eq!(
            service.update_inbound_shipment(
                &context,
                inline_init(|r: &mut UpdateInboundShipment| {
                    r.id.clone_from(&mock_inbound_shipment_b().id);
                    r.comment = Some("comment update".to_string());
                })
            ),
            Err(ServiceError::CannotEditFinalised)
        );
        //CannotChangeStatusOfInvoiceOnHold
        assert_eq!(
            service.update_inbound_shipment(
                &context,
                inline_init(|r: &mut UpdateInboundShipment| {
                    r.id.clone_from(&mock_inbound_shipment_e().id);
                    r.status = Some(UpdateInboundShipmentStatus::Delivered);
                })
            ),
            Err(ServiceError::CannotChangeStatusOfInvoiceOnHold)
        );
        // OtherPartyDoesNotExist
        assert_eq!(
            service.update_inbound_shipment(
                &context,
                inline_init(|r: &mut UpdateInboundShipment| {
                    r.id = mock_inbound_shipment_a().id;
                    r.other_party_id = Some("invalid".to_string());
                })
            ),
            Err(ServiceError::OtherPartyDoesNotExist)
        );
        // OtherPartyNotVisible
        assert_eq!(
            service.update_inbound_shipment(
                &context,
                inline_init(|r: &mut UpdateInboundShipment| {
                    r.id = mock_inbound_shipment_a().id;
                    r.other_party_id = Some(not_visible().id);
                })
            ),
            Err(ServiceError::OtherPartyNotVisible)
        );
        // OtherPartyNotASupplier
        assert_eq!(
            service.update_inbound_shipment(
                &context,
                inline_init(|r: &mut UpdateInboundShipment| {
                    r.id = mock_inbound_shipment_a().id;
                    r.other_party_id = Some(not_a_supplier().id);
                })
            ),
            Err(ServiceError::OtherPartyNotASupplier)
        );
        //NotThisStoreInvoice
        context.store_id = mock_store_b().id;
        assert_eq!(
            service.update_inbound_shipment(
                &context,
                inline_init(|r: &mut UpdateInboundShipment| {
                    r.id.clone_from(&mock_inbound_shipment_c().id);
                })
            ),
            Err(ServiceError::NotThisStoreInvoice)
        );
        // TODO CannotReverseInvoiceStatus,UpdateInvoiceDoesNotExist
    }

    #[actix_rt::test]
    async fn update_inbound_shipment_success() {
        fn supplier() -> NameRow {
            inline_init(|r: &mut NameRow| {
                r.id = "supplier".to_string();
            })
        }

        fn supplier_join() -> NameStoreJoinRow {
            inline_init(|r: &mut NameStoreJoinRow| {
                r.id = "supplier_join".to_string();
                r.name_link_id = supplier().id;
                r.store_id = mock_store_a().id;
                r.name_is_supplier = true;
            })
        }

        fn invoice_test() -> InvoiceRow {
            inline_init(|r: &mut InvoiceRow| {
                r.id = "invoice_test".to_string();
                r.name_link_id = "supplier".to_string();
                r.store_id = "store_a".to_string();
                r.invoice_number = 123;
                r.r#type = InvoiceType::InboundShipment;
                r.status = InvoiceStatus::New;
                r.created_datetime = NaiveDate::from_ymd_opt(1970, 1, 3)
                    .unwrap()
                    .and_hms_milli_opt(20, 30, 0, 0)
                    .unwrap();
            })
        }

        fn invoice_line_for_test() -> InvoiceLineRow {
            inline_init(|r: &mut InvoiceLineRow| {
                r.id = "invoice_line_for_test".to_string();
                r.invoice_id = "invoice_test".to_string();
                r.item_link_id = "item_a".to_string();
                r.pack_size = 1.0;
                r.number_of_packs = 1.0;
                r.r#type = InvoiceLineType::StockIn;
            })
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "update_inbound_shipment_success",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.names = vec![supplier()];
                r.name_store_joins = vec![supplier_join()];
                r.invoices = vec![invoice_test()];
                r.invoice_lines = vec![invoice_line_for_test()];
            }),
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
                inline_init(|r: &mut UpdateInboundShipment| {
                    r.id = mock_inbound_shipment_a().id;
                    r.other_party_id = Some(supplier().id);
                }),
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&mock_inbound_shipment_a().id)
            .unwrap()
            .unwrap();

        assert_eq!(
            invoice,
            inline_edit(&invoice, |mut u| {
                u.name_link_id = supplier().id;
                u.user_id = Some(mock_user_account_a().id);
                u
            })
        );

        // Success with tax change (no stock lines saved)
        service
            .update_inbound_shipment(
                &context,
                inline_init(|r: &mut UpdateInboundShipment| {
                    r.id = invoice_test().id;
                    r.tax = Some(ShipmentTaxUpdate {
                        percentage: Some(0.0),
                    });
                }),
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&invoice_test().id)
            .unwrap()
            .unwrap();

        assert_eq!(
            invoice,
            inline_edit(&invoice, |mut u| {
                u.tax_percentage = Some(0.0);
                u.user_id = Some(mock_user_account_a().id);
                u
            })
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
                inline_init(|r: &mut UpdateInboundShipment| {
                    r.id = invoice_test().id;
                    r.status = Some(UpdateInboundShipmentStatus::Delivered);
                    r.tax = Some(ShipmentTaxUpdate {
                        percentage: Some(10.0),
                    });
                }),
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&invoice_test().id)
            .unwrap()
            .unwrap();

        assert_eq!(
            invoice,
            inline_edit(&invoice, |mut u| {
                u.tax_percentage = Some(10.0);
                u.user_id = Some(mock_user_account_a().id);
                u.status = InvoiceStatus::Delivered;
                u
            })
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

        // Test verified status change with tax
        service
            .update_inbound_shipment(
                &context,
                inline_init(|r: &mut UpdateInboundShipment| {
                    r.id = invoice_test().id;
                    r.status = Some(UpdateInboundShipmentStatus::Verified);
                    r.tax = Some(ShipmentTaxUpdate {
                        percentage: Some(10.0),
                    });
                }),
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

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "update_inbound_shipment_success_currency",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.names = vec![supplier()];
                r.name_store_joins = vec![supplier_join()];
                r.invoices = vec![invoice_test()];
                r.invoice_lines = vec![invoice_line_for_test()];
            }),
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
                inline_init(|r: &mut UpdateInboundShipment| {
                    r.id = invoice_test().id;
                    r.currency_id = Some("currency_a".to_string());
                    r.currency_rate = Some(1.0);
                }),
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&invoice_test().id)
            .unwrap()
            .unwrap();

        assert_eq!(
            invoice,
            inline_edit(&invoice, |mut u| {
                u.currency_id = Some("currency_a".to_string());
                u.currency_rate = 1.0;
                u.user_id = Some(mock_user_account_a().id);
                u
            })
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
                inline_init(|r: &mut UpdateInboundShipment| {
                    r.id = invoice_test().id;
                    r.status = Some(UpdateInboundShipmentStatus::Delivered);
                    r.currency_id = Some("currency_a".to_string());
                    r.currency_rate = Some(1.0);
                }),
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&invoice_test().id)
            .unwrap()
            .unwrap();

        assert_eq!(
            invoice,
            inline_edit(&invoice, |mut u| {
                u.currency_id = Some("currency_a".to_string());
                u.currency_rate = 1.0;
                u.user_id = Some(mock_user_account_a().id);
                u.status = InvoiceStatus::Delivered;
                u
            })
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
                inline_init(|r: &mut UpdateInboundShipment| {
                    r.id = invoice_test().id;
                    r.status = Some(UpdateInboundShipmentStatus::Verified);
                    r.currency_id = Some("currency_a".to_string());
                    r.currency_rate = Some(1.0);
                }),
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
        )
        .unwrap();

        let vvm_log_filter = VVMStatusLogFilter::new()
            .invoice_line_id(EqualFilter::equal_to("invoice_line_with_vvm_status"));

        let vvm_status_log = VVMStatusLogRepository::new(&connection)
            .query_by_filter(vvm_log_filter.clone())
            .unwrap()
            .first()
            .map(|log| log.id.clone());

        // Check no logs exist before update
        assert_eq!(vvm_status_log, None);

        // Test updating to Delivered generates Activity logs and VVM status logs
        service
            .update_inbound_shipment(
                &context,
                inline_init(|r: &mut UpdateInboundShipment| {
                    r.id = mock_inbound_shipment_c().id;
                    r.status = Some(UpdateInboundShipmentStatus::Delivered);
                }),
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
            .find(|l| l.r#type == ActivityLogType::InvoiceStatusDelivered)
            .unwrap();
        let vvm_status_log = VVMStatusLogRepository::new(&connection)
            .query_by_filter(vvm_log_filter.clone())
            .unwrap()
            .first()
            .map(|log| log.status_id.clone());

        assert_eq!(invoice.verified_datetime, None);
        assert!(invoice.delivered_datetime.unwrap() > now);
        assert!(invoice.delivered_datetime.unwrap() < end_time);
        assert_eq!(activity_log.r#type, ActivityLogType::InvoiceStatusDelivered);
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
                inline_init(|r: &mut UpdateInboundShipment| {
                    r.id = mock_inbound_shipment_c().id;
                    r.other_party_id = Some(supplier().id);
                }),
            )
            .unwrap();

        let log = ActivityLogRowRepository::new(&connection)
            .find_many_by_record_id(&mock_inbound_shipment_c().id)
            .unwrap()
            .into_iter()
            .find(|l| l.r#type == ActivityLogType::InvoiceStatusDelivered)
            .unwrap();
        assert_eq!(log.r#type, ActivityLogType::InvoiceStatusDelivered);

        //Test success name_store_id linked to store
        service
            .update_inbound_shipment(
                &context,
                inline_init(|r: &mut UpdateInboundShipment| {
                    r.id = mock_inbound_shipment_a().id;
                    r.other_party_id = Some(mock_name_linked_to_store_join().name_link_id.clone());
                }),
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&mock_inbound_shipment_a().id)
            .unwrap()
            .unwrap();

        assert_eq!(
            invoice,
            inline_edit(&invoice, |mut u| {
                u.name_store_id = Some(mock_store_linked_to_name().id.clone());
                u
            })
        );

        //Test success name_store_id, not linked to store
        service
            .update_inbound_shipment(
                &context,
                inline_init(|r: &mut UpdateInboundShipment| {
                    r.id = mock_inbound_shipment_a().id;
                    r.other_party_id =
                        Some(mock_name_not_linked_to_store_join().name_link_id.clone());
                }),
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
                inline_init(|r: &mut UpdateInboundShipment| {
                    r.id = mock_inbound_shipment_a().id;
                    r.other_party_id = Some(supplier().id);
                    r.status = Some(UpdateInboundShipmentStatus::Verified);
                    r.on_hold = Some(true);
                }),
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
            invoice.delivered_datetime,
            mock_inbound_shipment_a().delivered_datetime
        );

        assert!(invoice.verified_datetime.unwrap() > now);
        assert!(invoice.verified_datetime.unwrap() < end_time);
        assert_eq!(
            invoice,
            inline_edit(&invoice, |mut u| {
                u.status = InvoiceStatus::Verified;
                u.on_hold = true;
                u
            })
        );
        assert_eq!(log.r#type, ActivityLogType::InvoiceStatusVerified);
        assert_eq!(Some(invoice.name_link_id), stock_line.supplier_link_id);
    }

    #[actix_rt::test]
    async fn update_inbound_shipment_donor_changes() {
        let (_, connection, connection_manager, _) = setup_all_with_data(
            "update_inbound_shipment_donor_changes",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.invoices = vec![mock_inbound_shipment_f()];
            }),
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
            )
            .unwrap();

        let mut result = InvoiceLineRowRepository::new(&connection)
            .find_many_by_invoice_id(&mock_inbound_shipment_f().id)
            .unwrap();
        result.sort_by(|a, b| a.id.cmp(&b.id));

        assert_eq!(
            invoice.invoice_row.default_donor_link_id,
            Some(mock_donor_b().id)
        );
        assert_eq!(result.len(), 2);
        assert_eq!(result[0].id, "new_invoice_line_id_a".to_string());
        assert_eq!(result[0].donor_link_id, Some(mock_donor_a().id));
        assert_eq!(result[1].donor_link_id, None);

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
            )
            .unwrap();

        let mut result = InvoiceLineRowRepository::new(&connection)
            .find_many_by_invoice_id(&mock_inbound_shipment_f().id)
            .unwrap();
        result.sort_by(|a, b| a.id.cmp(&b.id));

        assert_eq!(
            invoice.invoice_row.default_donor_link_id,
            Some(mock_donor_b().id)
        );
        assert_eq!(result[0].donor_link_id, Some(mock_donor_b().id));
        assert_eq!(result[1].donor_link_id, None);

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
            )
            .unwrap();

        let mut result = InvoiceLineRowRepository::new(&connection)
            .find_many_by_invoice_id(&mock_inbound_shipment_f().id)
            .unwrap();
        result.sort_by(|a, b| a.id.cmp(&b.id));

        assert_eq!(result[0].donor_link_id, Some(mock_donor_b().id));
        assert_eq!(result[1].donor_link_id, Some(mock_donor_a().id));

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
            )
            .unwrap();

        let mut result = InvoiceLineRowRepository::new(&connection)
            .find_many_by_invoice_id(&mock_inbound_shipment_f().id)
            .unwrap();
        result.sort_by(|a, b| a.id.cmp(&b.id));

        assert!(result.iter().all(|line| line.donor_link_id == None));
    }
}
