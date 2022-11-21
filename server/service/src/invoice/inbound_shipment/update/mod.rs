use crate::activity_log::{activity_log_entry, log_type_from_invoice_status};
use crate::{invoice::query::get_invoice, service_provider::ServiceContext, WithDBError};
use repository::Invoice;
use repository::{
    InvoiceLineRowRepository, InvoiceRowRepository, InvoiceRowStatus, RepositoryError,
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

#[derive(Clone, Debug, Default, PartialEq)]
pub struct UpdateInboundShipment {
    pub id: String,
    pub other_party_id: Option<String>,
    pub status: Option<UpdateInboundShipmentStatus>,
    pub on_hold: Option<bool>,
    pub comment: Option<String>,
    pub their_reference: Option<String>,
    pub colour: Option<String>,
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
            } = generate(
                connection,
                &ctx.user_id,
                invoice,
                other_party,
                patch.clone(),
            )?;

            InvoiceRowRepository::new(connection).upsert_one(&update_invoice)?;

            if let Some(lines_and_invoice_lines) = batches_to_update {
                let stock_line_repository = StockLineRowRepository::new(connection);
                let invoice_line_respository = InvoiceLineRowRepository::new(connection);

                for LineAndStockLine { line, stock_line } in lines_and_invoice_lines.into_iter() {
                    stock_line_repository.upsert_one(&stock_line)?;
                    invoice_line_respository.upsert_one(&line)?;
                }
            }

            if let Some(lines) = empty_lines_to_trim {
                let repository = InvoiceLineRowRepository::new(connection);
                for line in lines {
                    repository.delete(&line.id)?;
                }
            }

            if status_changed {
                activity_log_entry(
                    &ctx,
                    log_type_from_invoice_status(&update_invoice.status),
                    Some(update_invoice.id.to_owned()),
                    None,
                )?;
            }

            get_invoice(ctx, None, &update_invoice.id)
                .map_err(|error| OutError::DatabaseError(error))?
                .ok_or(OutError::UpdatedInvoiceDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    ctx.processors_trigger
        .trigger_shipment_transfer_processors();

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
    pub fn full_status(&self) -> InvoiceRowStatus {
        match self {
            UpdateInboundShipmentStatus::Delivered => InvoiceRowStatus::Delivered,
            UpdateInboundShipmentStatus::Verified => InvoiceRowStatus::Verified,
        }
    }
}

impl UpdateInboundShipment {
    pub fn full_status(&self) -> Option<InvoiceRowStatus> {
        match &self.status {
            Some(status) => Some(status.full_status()),
            None => None,
        }
    }
}

#[cfg(test)]
mod test {
    use chrono::{Duration, Utc};
    use repository::{
        mock::{
            mock_inbound_shipment_a, mock_inbound_shipment_b, mock_inbound_shipment_c,
            mock_inbound_shipment_e, mock_name_a, mock_name_linked_to_store_join,
            mock_name_not_linked_to_store_join, mock_outbound_shipment_e, mock_store_a,
            mock_store_b, mock_store_linked_to_name, mock_user_account_a, MockData,
            MockDataInserts,
        },
        test_db::setup_all_with_data,
        ActivityLogRowRepository, ActivityLogType, EqualFilter, InvoiceLineFilter,
        InvoiceRowRepository, InvoiceRowStatus, NameRow, NameStoreJoinRow, StockLineRowRepository,
    };
    use util::{inline_edit, inline_init};

    use crate::{
        invoice::inbound_shipment::{UpdateInboundShipment, UpdateInboundShipmentStatus},
        invoice_line::query::get_invoice_lines,
        service_provider::ServiceProvider,
    };

    use super::UpdateInboundShipmentError;

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
                r.name_id = not_a_supplier().id;
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

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
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
                    r.id = mock_outbound_shipment_e().id.clone();
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
                    r.id = mock_inbound_shipment_b().id.clone();
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
                    r.id = mock_inbound_shipment_e().id.clone();
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
                    r.id = mock_inbound_shipment_c().id.clone();
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
                r.name_id = supplier().id;
                r.store_id = mock_store_a().id;
                r.name_is_supplier = true;
            })
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "update_inbound_shipment_success",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.names = vec![supplier()];
                r.name_store_joins = vec![supplier_join()];
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
            .unwrap();

        assert_eq!(
            invoice,
            inline_edit(&invoice, |mut u| {
                u.name_id = supplier().id;
                u.user_id = Some(mock_user_account_a().id);
                u
            })
        );

        // Test Confirmed and logging
        service
            .update_inbound_shipment(
                &context,
                inline_init(|r: &mut UpdateInboundShipment| {
                    r.id = mock_inbound_shipment_c().id;
                    r.other_party_id = Some(supplier().id);
                    r.status = Some(UpdateInboundShipmentStatus::Delivered);
                }),
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&mock_inbound_shipment_c().id)
            .unwrap();
        let log = ActivityLogRowRepository::new(&connection)
            .find_many_by_record_id(&mock_inbound_shipment_c().id)
            .unwrap()
            .into_iter()
            .find(|l| l.r#type == ActivityLogType::InvoiceStatusDelivered)
            .unwrap();

        assert_eq!(invoice.verified_datetime, None);
        assert!(invoice.delivered_datetime.unwrap() > now);
        assert!(invoice.delivered_datetime.unwrap() < end_time);
        assert_eq!(log.r#type, ActivityLogType::InvoiceStatusDelivered);

        let filter = InvoiceLineFilter::new().invoice_id(EqualFilter::equal_any(vec![invoice.id]));
        let invoice_lines = get_invoice_lines(&context, Some(filter)).unwrap();

        for lines in invoice_lines.clone() {
            let stock_line_id = lines.invoice_line_row.stock_line_id.clone().unwrap();
            let stock_line = StockLineRowRepository::new(&connection)
                .find_one_by_id(&stock_line_id)
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
                    r.other_party_id = Some(mock_name_linked_to_store_join().name_id.clone());
                }),
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&mock_inbound_shipment_a().id)
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
                    r.other_party_id = Some(mock_name_not_linked_to_store_join().name_id.clone());
                }),
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&mock_inbound_shipment_a().id)
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

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&mock_inbound_shipment_a().id)
            .unwrap();
        let log = ActivityLogRowRepository::new(&connection)
            .find_many_by_record_id(&mock_inbound_shipment_a().id)
            .unwrap()
            .into_iter()
            .find(|l| l.r#type == ActivityLogType::InvoiceStatusVerified)
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
    }
}
