use crate::activity_log::{activity_log_entry, log_type_from_invoice_status};
use crate::{invoice::query::get_invoice, service_provider::ServiceContext, WithDBError};
use repository::{Invoice, LocationMovementRowRepository};
use repository::{
    InvoiceLineRowRepository, InvoiceRowRepository, InvoiceRowStatus, RepositoryError,
    StockLineRowRepository,
};

mod generate;
mod validate;

use generate::*;
use validate::validate;

use self::generate::LineAndStockLine;

#[derive(Clone, Debug, PartialEq)]
pub enum UpdateInboundReturnStatus {
    Delivered,
    Verified,
}

#[derive(Clone, Debug, Default, PartialEq)]
pub struct UpdateInboundReturn {
    pub id: String,
    pub status: Option<UpdateInboundReturnStatus>,
    // pub on_hold: Option<bool>,
    // pub comment: Option<String>,
    // pub other_party_id: Option<String>,
    // pub colour: Option<String>,
}

type OutError = UpdateInboundReturnError;

pub fn update_inbound_return(
    ctx: &ServiceContext,
    patch: UpdateInboundReturn,
) -> Result<Invoice, OutError> {
    let invoice = ctx
        .connection
        .transaction_sync(|connection| {
            let (existing_return, status_changed) = validate(connection, &ctx.store_id, &patch)?;
            let GenerateResult {
                batches_to_update,
                updated_return,
                location_movements,
            } = generate(
                connection,
                &ctx.store_id,
                &ctx.user_id,
                existing_return,
                patch.clone(),
            )?;

            InvoiceRowRepository::new(connection).upsert_one(&updated_return)?;
            let invoice_line_repository = InvoiceLineRowRepository::new(connection);

            if let Some(lines_and_invoice_lines) = batches_to_update {
                let stock_line_repository = StockLineRowRepository::new(connection);

                for LineAndStockLine { line, stock_line } in lines_and_invoice_lines.into_iter() {
                    stock_line_repository.upsert_one(&stock_line)?;
                    invoice_line_repository.upsert_one(&line)?;
                }
            }

            if updated_return.status == InvoiceRowStatus::Verified {
                if let Some(movements) = location_movements {
                    for movement in movements {
                        LocationMovementRowRepository::new(&connection).upsert_one(&movement)?;
                    }
                }
            }

            if status_changed {
                activity_log_entry(
                    &ctx,
                    log_type_from_invoice_status(&updated_return.status, false),
                    Some(updated_return.id.to_owned()),
                    None,
                    None,
                )?;
            }

            get_invoice(ctx, None, &updated_return.id)
                .map_err(|error| OutError::DatabaseError(error))?
                .ok_or(OutError::UpdatedInvoiceDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    // ctx.processors_trigger
    //     .trigger_shipment_transfer_processors();

    Ok(invoice)
}

#[derive(Debug, PartialEq)]
pub enum UpdateInboundReturnError {
    InvoiceDoesNotExist,
    NotAnInboundReturn,
    NotThisStoreInvoice,
    CannotReverseInvoiceStatus,
    ReturnIsNotEditable,
    CannotChangeStatusOfInvoiceOnHold,
    // Internal
    DatabaseError(RepositoryError),
    UpdatedInvoiceDoesNotExist,
}

impl From<RepositoryError> for UpdateInboundReturnError {
    fn from(error: RepositoryError) -> Self {
        UpdateInboundReturnError::DatabaseError(error)
    }
}

impl<ERR> From<WithDBError<ERR>> for UpdateInboundReturnError
where
    ERR: Into<UpdateInboundReturnError>,
{
    fn from(result: WithDBError<ERR>) -> Self {
        match result {
            WithDBError::DatabaseError(error) => error.into(),
            WithDBError::Error(error) => error.into(),
        }
    }
}

impl UpdateInboundReturnStatus {
    pub fn as_invoice_row_status(&self) -> InvoiceRowStatus {
        match self {
            UpdateInboundReturnStatus::Delivered => InvoiceRowStatus::Delivered,
            UpdateInboundReturnStatus::Verified => InvoiceRowStatus::Verified,
        }
    }
}

impl UpdateInboundReturn {
    pub fn invoice_row_status_option(&self) -> Option<InvoiceRowStatus> {
        match &self.status {
            Some(status) => Some(status.as_invoice_row_status()),
            None => None,
        }
    }
}

#[cfg(test)]
mod test {
    use chrono::{Duration, NaiveDate, Utc};
    use repository::{
        mock::{
            mock_inbound_return_a, mock_inbound_return_a_invoice_lines, mock_name_a,
            mock_name_linked_to_store_join, mock_name_not_linked_to_store_join,
            mock_outbound_shipment_e, mock_stock_line_a, mock_store_a, mock_store_b,
            mock_store_linked_to_name, mock_user_account_a, MockData, MockDataInserts,
        },
        test_db::setup_all_with_data,
        ActivityLogRowRepository, ActivityLogType, EqualFilter, InvoiceLineFilter, InvoiceLineRow,
        InvoiceLineRowRepository, InvoiceLineRowType, InvoiceRow, InvoiceRowRepository,
        InvoiceRowStatus, InvoiceRowType, NameRow, NameStoreJoinRow, StockLineRowRepository,
    };
    use util::{inline_edit, inline_init};

    use crate::{
        invoice::inbound_return::{UpdateInboundReturn, UpdateInboundReturnStatus},
        invoice_line::{query::get_invoice_lines, ShipmentTaxUpdate},
        service_provider::ServiceProvider,
    };

    use super::UpdateInboundReturnError;

    type ServiceError = UpdateInboundReturnError;

    #[actix_rt::test]
    async fn update_inbound_return_errors() {
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
            "update_inbound_return_errors",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.names = vec![not_visible(), not_a_supplier()];
                r.name_store_joins = vec![not_a_supplier_join()];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let mut context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_service;

        //InvoiceDoesNotExist
        assert_eq!(
            service.update_inbound_return(
                &context,
                inline_init(|r: &mut UpdateInboundReturn| {
                    r.id = "invalid".to_string();
                })
            ),
            Err(ServiceError::InvoiceDoesNotExist)
        );

        //NotAnInboundReturn
        assert_eq!(
            service.update_inbound_return(
                &context,
                inline_init(|r: &mut UpdateInboundReturn| {
                    r.id = mock_outbound_shipment_a().id.clone();
                })
            ),
            Err(ServiceError::NotAnInboundReturn)
        );

        //ReturnIsNotEditable
        assert_eq!(
            service.update_inbound_return(
                &context,
                inline_init(|r: &mut UpdateInboundReturn| {
                    r.id = mock_inbound_return_b().id.clone();
                })
            ),
            Err(ServiceError::ReturnIsNotEditable)
        );
        //CannotChangeStatusOfInvoiceOnHold
        assert_eq!(
            service.update_inbound_return(
                &context,
                inline_init(|r: &mut UpdateInboundReturn| {
                    r.id = mock_inbound_return_e().id.clone();
                    r.status = Some(UpdateInboundReturnStatus::Delivered);
                })
            ),
            Err(ServiceError::CannotChangeStatusOfInvoiceOnHold)
        );
        // OtherPartyDoesNotExist
        assert_eq!(
            service.update_inbound_return(
                &context,
                inline_init(|r: &mut UpdateInboundReturn| {
                    r.id = mock_inbound_return_a().id;
                    r.other_party_id = Some("invalid".to_string());
                })
            ),
            Err(ServiceError::OtherPartyDoesNotExist)
        );
        // OtherPartyNotVisible
        assert_eq!(
            service.update_inbound_return(
                &context,
                inline_init(|r: &mut UpdateInboundReturn| {
                    r.id = mock_inbound_return_a().id;
                    r.other_party_id = Some(not_visible().id);
                })
            ),
            Err(ServiceError::OtherPartyNotVisible)
        );
        // OtherPartyNotASupplier
        assert_eq!(
            service.update_inbound_return(
                &context,
                inline_init(|r: &mut UpdateInboundReturn| {
                    r.id = mock_inbound_return_a().id;
                    r.other_party_id = Some(not_a_supplier().id);
                })
            ),
            Err(ServiceError::OtherPartyNotASupplier)
        );
        //NotThisStoreInvoice
        context.store_id = mock_store_b().id;
        assert_eq!(
            service.update_inbound_return(
                &context,
                inline_init(|r: &mut UpdateInboundReturn| {
                    r.id = mock_inbound_return_c().id.clone();
                })
            ),
            Err(ServiceError::NotThisStoreInvoice)
        );
        // TODO CannotReverseInvoiceStatus,UpdateInvoiceDoesNotExist
    }

    #[actix_rt::test]
    async fn update_inbound_return_success() {
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

        fn invoice_tax_test() -> InvoiceRow {
            inline_init(|r: &mut InvoiceRow| {
                r.id = "invoice_tax_test".to_string();
                r.name_link_id = "name_store_b".to_string();
                r.store_id = "store_a".to_string();
                r.invoice_number = 123;
                r.r#type = InvoiceRowType::Inboundreturn;
                r.status = InvoiceRowStatus::New;
                r.created_datetime = NaiveDate::from_ymd_opt(1970, 1, 3)
                    .unwrap()
                    .and_hms_milli_opt(20, 30, 0, 0)
                    .unwrap();
            })
        }

        fn invoice_line_for_tax_test() -> InvoiceLineRow {
            inline_init(|r: &mut InvoiceLineRow| {
                r.id = "invoice_line_for_tax_test".to_string();
                r.invoice_id = "invoice_tax_test".to_string();
                r.item_link_id = "item_a".to_string();
                r.pack_size = 1;
                r.number_of_packs = 1.0;
                r.r#type = InvoiceLineRowType::StockIn;
            })
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "update_inbound_return_success",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.names = vec![supplier()];
                r.name_store_joins = vec![supplier_join()];
                r.invoices = vec![invoice_tax_test()];
                r.invoice_lines = vec![invoice_line_for_tax_test()];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.invoice_service;
        let now = Utc::now().naive_utc();
        let end_time = now.checked_add_signed(Duration::seconds(10)).unwrap();

        // Success
        service
            .update_inbound_return(
                &context,
                inline_init(|r: &mut UpdateInboundReturn| {
                    r.id = mock_inbound_return_a().id;
                    r.other_party_id = Some(supplier().id);
                }),
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&mock_inbound_return_a().id)
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
            .update_inbound_return(
                &context,
                inline_init(|r: &mut UpdateInboundReturn| {
                    r.id = invoice_tax_test().id;
                    r.tax = Some(ShipmentTaxUpdate {
                        percentage: Some(0.0),
                    });
                }),
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&invoice_tax_test().id)
            .unwrap();

        assert_eq!(
            invoice,
            inline_edit(&invoice, |mut u| {
                u.tax = Some(0.0);
                u.user_id = Some(mock_user_account_a().id);
                u
            })
        );

        let filter =
            InvoiceLineFilter::new().invoice_id(EqualFilter::equal_any(vec![invoice.clone().id]));
        let invoice_lines = get_invoice_lines(
            &context,
            &invoice.clone().store_id,
            &invoice.clone().id,
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
            ..invoice_line_for_tax_test()
        };

        InvoiceLineRowRepository::new(&connection)
            .upsert_one(&updated_line)
            .unwrap();

        service
            .update_inbound_return(
                &context,
                inline_init(|r: &mut UpdateInboundReturn| {
                    r.id = invoice_tax_test().id;
                    r.status = Some(UpdateInboundReturnStatus::Delivered);
                    r.tax = Some(ShipmentTaxUpdate {
                        percentage: Some(10.0),
                    });
                }),
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&invoice_tax_test().id)
            .unwrap();

        assert_eq!(
            invoice,
            inline_edit(&invoice, |mut u| {
                u.tax = Some(10.0);
                u.user_id = Some(mock_user_account_a().id);
                u.status = InvoiceRowStatus::Delivered;
                u
            })
        );

        let filter =
            InvoiceLineFilter::new().invoice_id(EqualFilter::equal_any(vec![invoice.clone().id]));
        let invoice_lines = get_invoice_lines(
            &context,
            &invoice.clone().store_id,
            &invoice.clone().id,
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
                .unwrap();
            stock_lines_delivered.push(stock_line.clone());
            assert_eq!(lines.invoice_line_row.stock_line_id, Some(stock_line.id));
        }

        // Test verified status change with tax
        service
            .update_inbound_return(
                &context,
                inline_init(|r: &mut UpdateInboundReturn| {
                    r.id = invoice_tax_test().id;
                    r.status = Some(UpdateInboundReturnStatus::Verified);
                    r.tax = Some(ShipmentTaxUpdate {
                        percentage: Some(10.0),
                    });
                }),
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&invoice_tax_test().id)
            .unwrap();
        let filter =
            InvoiceLineFilter::new().invoice_id(EqualFilter::equal_any(vec![invoice.clone().id]));
        let invoice_lines = get_invoice_lines(
            &context,
            &invoice.clone().store_id,
            &invoice.clone().id,
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
                .unwrap();
            stock_lines_verified.push(stock_line.clone());
        }

        assert_eq!(stock_lines_delivered, stock_lines_verified);

        // Test Confirmed and logging
        service
            .update_inbound_return(
                &context,
                inline_init(|r: &mut UpdateInboundReturn| {
                    r.id = mock_inbound_return_c().id;
                    r.other_party_id = Some(supplier().id);
                    r.status = Some(UpdateInboundReturnStatus::Delivered);
                }),
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&mock_inbound_return_c().id)
            .unwrap();
        let log = ActivityLogRowRepository::new(&connection)
            .find_many_by_record_id(&mock_inbound_return_c().id)
            .unwrap()
            .into_iter()
            .find(|l| l.r#type == ActivityLogType::InvoiceStatusDelivered)
            .unwrap();

        assert_eq!(invoice.verified_datetime, None);
        assert!(invoice.delivered_datetime.unwrap() > now);
        assert!(invoice.delivered_datetime.unwrap() < end_time);
        assert_eq!(log.r#type, ActivityLogType::InvoiceStatusDelivered);

        let filter =
            InvoiceLineFilter::new().invoice_id(EqualFilter::equal_any(vec![invoice.clone().id]));
        let invoice_lines = get_invoice_lines(
            &context,
            &invoice.clone().store_id,
            &invoice.clone().id,
            None,
            Some(filter),
            None,
        )
        .unwrap();

        for lines in invoice_lines.rows.clone() {
            let stock_line_id = lines.invoice_line_row.stock_line_id.clone().unwrap();
            let stock_line = StockLineRowRepository::new(&connection)
                .find_one_by_id(&stock_line_id)
                .unwrap();
            assert_eq!(lines.invoice_line_row.stock_line_id, Some(stock_line.id));
        }

        // Test log isn't duplicated when status isn't changed
        service
            .update_inbound_return(
                &context,
                inline_init(|r: &mut UpdateInboundReturn| {
                    r.id = mock_inbound_return_c().id;
                    r.other_party_id = Some(supplier().id);
                }),
            )
            .unwrap();

        let log = ActivityLogRowRepository::new(&connection)
            .find_many_by_record_id(&mock_inbound_return_c().id)
            .unwrap()
            .into_iter()
            .find(|l| l.r#type == ActivityLogType::InvoiceStatusDelivered)
            .unwrap();
        assert_eq!(log.r#type, ActivityLogType::InvoiceStatusDelivered);

        //Test success name_store_id linked to store
        service
            .update_inbound_return(
                &context,
                inline_init(|r: &mut UpdateInboundReturn| {
                    r.id = mock_inbound_return_a().id;
                    r.other_party_id = Some(mock_name_linked_to_store_join().name_link_id.clone());
                }),
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&mock_inbound_return_a().id)
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
            .update_inbound_return(
                &context,
                inline_init(|r: &mut UpdateInboundReturn| {
                    r.id = mock_inbound_return_a().id;
                    r.other_party_id =
                        Some(mock_name_not_linked_to_store_join().name_link_id.clone());
                }),
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&mock_inbound_return_a().id)
            .unwrap();

        assert_eq!(invoice.name_store_id, None);

        // Test Finalised (while setting invoice status onHold to true)
        service
            .update_inbound_return(
                &context,
                inline_init(|r: &mut UpdateInboundReturn| {
                    r.id = mock_inbound_return_a().id;
                    r.other_party_id = Some(supplier().id);
                    r.status = Some(UpdateInboundReturnStatus::Verified);
                    r.on_hold = Some(true);
                }),
            )
            .unwrap();

        let stock_line_id = mock_inbound_return_a_invoice_lines()[0]
            .clone()
            .stock_line_id
            .unwrap();
        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&mock_inbound_return_a().id)
            .unwrap();
        let log = ActivityLogRowRepository::new(&connection)
            .find_many_by_record_id(&mock_inbound_return_a().id)
            .unwrap()
            .into_iter()
            .find(|l| l.r#type == ActivityLogType::InvoiceStatusVerified)
            .unwrap();
        let stock_line = StockLineRowRepository::new(&connection)
            .find_one_by_id(&stock_line_id)
            .unwrap();

        assert!(invoice.verified_datetime.unwrap() > now);
        assert!(invoice.verified_datetime.unwrap() < end_time);
        assert_eq!(
            invoice,
            inline_edit(&invoice, |mut u| {
                u.status = InvoiceRowStatus::Verified;
                u.on_hold = true;
                u
            })
        );
        assert_eq!(log.r#type, ActivityLogType::InvoiceStatusVerified);
        assert_eq!(Some(invoice.name_link_id), stock_line.supplier_link_id);
    }
}
