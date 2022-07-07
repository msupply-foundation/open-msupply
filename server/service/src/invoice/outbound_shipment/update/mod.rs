use chrono::Utc;
use repository::{
    Invoice, InvoiceLine, InvoiceLineRowRepository, InvoiceRowRepository, InvoiceRowStatus, LogRow,
    LogType, RepositoryError, StockLineRowRepository, TransactionError,
};

pub mod generate;
pub mod validate;

use generate::generate;
use util::uuid::uuid;
use validate::validate;

use crate::invoice::outbound_shipment::update::generate::GenerateResult;
use crate::invoice::query::get_invoice;
use crate::log::log_entry;
use crate::service_provider::ServiceContext;
use crate::sync_processor::{process_records, Record};
#[derive(Clone, Debug, PartialEq)]
pub enum UpdateOutboundShipmentStatus {
    Allocated,
    Picked,
    Shipped,
}
#[derive(Clone, Debug, PartialEq, Default)]
pub struct UpdateOutboundShipment {
    pub id: String,
    pub other_party_id: Option<String>,
    pub status: Option<UpdateOutboundShipmentStatus>,
    pub on_hold: Option<bool>,
    pub comment: Option<String>,
    pub their_reference: Option<String>,
    pub colour: Option<String>,
    pub transport_reference: Option<String>,
}

#[derive(Debug, PartialEq)]
pub enum UpdateOutboundShipmentError {
    CannotReverseInvoiceStatus,
    CannotChangeStatusOfInvoiceOnHold,
    InvoiceDoesNotExists,
    InvoiceIsNotEditable,
    NotAnOutboundShipment,
    // Error applies to unallocated lines with above zero quantity
    CanOnlyChangeToAllocatedWhenNoUnallocatedLines(Vec<InvoiceLine>),
    // Name validation
    OtherPartyNotACustomer,
    OtherPartyNotVisible,
    OtherPartyDoesNotExist,
    // Internal
    UpdatedInvoicenDoesNotExist,
    DatabaseError(RepositoryError),
    /// Holds the id of the invalid invoice line
    InvoiceLineHasNoStockLine(String),
}

type OutError = UpdateOutboundShipmentError;

pub fn update_outbound_shipment(
    ctx: &ServiceContext,
    store_id: &str,
    patch: UpdateOutboundShipment,
) -> Result<Invoice, OutError> {
    let invoice = ctx
        .connection
        .transaction_sync(|connection| {
            let (invoice, other_party_option) = validate(connection, store_id, &patch)?;
            let GenerateResult {
                batches_to_update,
                update_invoice,
                unallocated_lines_to_trim,
            } = generate(invoice, other_party_option, patch.clone(), connection)?;

            InvoiceRowRepository::new(connection).upsert_one(&update_invoice)?;
            if let Some(stock_lines) = batches_to_update {
                let repository = StockLineRowRepository::new(connection);
                for stock_line in stock_lines {
                    repository.upsert_one(&stock_line)?;
                }
            }

            if let Some(lines) = unallocated_lines_to_trim {
                let repository = InvoiceLineRowRepository::new(connection);
                for line in lines {
                    repository.delete(&line.id)?;
                }
            }

            get_invoice(ctx, None, &update_invoice.id)
                .map_err(|error| OutError::DatabaseError(error))?
                .ok_or(OutError::UpdatedInvoicenDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    // TODO use change log (and maybe ask sync porcessor actor to retrigger here)
    println!(
        "{:#?}",
        process_records(
            &ctx.connection,
            vec![Record::InvoiceRow(invoice.invoice_row.clone())],
        )
    );

    if let Some(status) = patch.status {
        log_entry(
            &ctx.connection,
            &LogRow {
                id: uuid(),
                r#type: match status {
                    UpdateOutboundShipmentStatus::Allocated => LogType::InvoiceStatusAllocated,
                    UpdateOutboundShipmentStatus::Picked => LogType::InvoiceStatusPicked,
                    UpdateOutboundShipmentStatus::Shipped => LogType::InvoiceStatusShipped,
                },
                user_id: invoice.invoice_row.user_id.clone(),
                store_id: Some(invoice.invoice_row.store_id.clone()),
                record_id: Some(invoice.invoice_row.id.clone()),
                datetime: Utc::now().naive_utc(),
            },
        )?;
    }

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
    pub fn full_status(&self) -> InvoiceRowStatus {
        match self {
            UpdateOutboundShipmentStatus::Allocated => InvoiceRowStatus::Allocated,
            UpdateOutboundShipmentStatus::Picked => InvoiceRowStatus::Picked,
            UpdateOutboundShipmentStatus::Shipped => InvoiceRowStatus::Shipped,
        }
    }

    pub fn full_status_option(
        status: &Option<UpdateOutboundShipmentStatus>,
    ) -> Option<InvoiceRowStatus> {
        match status {
            Some(status) => Some(status.full_status()),
            None => None,
        }
    }
}

impl UpdateOutboundShipment {
    pub fn full_status(&self) -> Option<InvoiceRowStatus> {
        match &self.status {
            Some(status) => Some(status.full_status()),
            None => None,
        }
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{
            mock_item_a, mock_name_a, mock_outbound_shipment_a, mock_store_a, MockData,
            MockDataInserts,
        },
        test_db::setup_all_with_data,
        InvoiceLineRow, InvoiceLineRowRepository, InvoiceLineRowType, InvoiceRow,
        InvoiceRowRepository, InvoiceRowType, NameRow, NameStoreJoinRow,
    };
    use util::{inline_edit, inline_init};

    use crate::{
        invoice::outbound_shipment::{
            update::UpdateOutboundShipmentStatus, UpdateOutboundShipment,
        },
        service_provider::ServiceProvider,
    };

    use super::UpdateOutboundShipmentError;

    type ServiceError = UpdateOutboundShipmentError;

    #[actix_rt::test]
    async fn update_outbound_shipment_errors() {
        fn not_visible() -> NameRow {
            inline_init(|r: &mut NameRow| {
                r.id = "not_visible".to_string();
            })
        }

        fn not_a_customer() -> NameRow {
            inline_init(|r: &mut NameRow| {
                r.id = "not_a_customer".to_string();
            })
        }

        fn not_a_customer_join() -> NameStoreJoinRow {
            inline_init(|r: &mut NameStoreJoinRow| {
                r.id = "not_a_customer_join".to_string();
                r.name_id = not_a_customer().id;
                r.store_id = mock_store_a().id;
                r.name_is_customer = false;
            })
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "update_outbound_shipment_errors",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.names = vec![not_visible(), not_a_customer()];
                r.name_store_joins = vec![not_a_customer_join()];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.context().unwrap();
        let service = service_provider.invoice_service;

        // OtherPartyDoesNotExist
        assert_eq!(
            service.update_outbound_shipment(
                &context,
                &mock_store_a().id,
                inline_init(|r: &mut UpdateOutboundShipment| {
                    r.id = mock_outbound_shipment_a().id;
                    r.other_party_id = Some("invalid".to_string());
                })
            ),
            Err(ServiceError::OtherPartyDoesNotExist)
        );
        // OtherPartyNotVisible
        assert_eq!(
            service.update_outbound_shipment(
                &context,
                &mock_store_a().id,
                inline_init(|r: &mut UpdateOutboundShipment| {
                    r.id = mock_outbound_shipment_a().id;
                    r.other_party_id = Some(not_visible().id);
                })
            ),
            Err(ServiceError::OtherPartyNotVisible)
        );
        // OtherPartyNotACustomer
        assert_eq!(
            service.update_outbound_shipment(
                &context,
                &mock_store_a().id,
                inline_init(|r: &mut UpdateOutboundShipment| {
                    r.id = mock_outbound_shipment_a().id;
                    r.other_party_id = Some(not_a_customer().id);
                })
            ),
            Err(ServiceError::OtherPartyNotACustomer)
        );

        // TODO add not Other error (only other party related atm)
    }

    #[actix_rt::test]
    async fn update_outbound_shipment_success_trim_unallocated_line() {
        fn invoice() -> InvoiceRow {
            inline_init(|r: &mut InvoiceRow| {
                r.id = "invoice".to_string();
                r.name_id = mock_name_a().id;
                r.store_id = mock_store_a().id;
                r.r#type = InvoiceRowType::OutboundShipment;
            })
        }

        fn invoice_line() -> InvoiceLineRow {
            inline_init(|r: &mut InvoiceLineRow| {
                r.id = "invoice_line".to_string();
                r.invoice_id = invoice().id;
                r.item_id = mock_item_a().id;
                r.r#type = InvoiceLineRowType::UnallocatedStock;
                r.pack_size = 1;
                r.number_of_packs = 0;
            })
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "update_outbound_shipment_success_trim_unallocated_line",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.invoices = vec![invoice()];
                r.invoice_lines = vec![invoice_line()];
            }),
        )
        .await;

        assert_eq!(
            InvoiceLineRowRepository::new(&connection).find_one_by_id_option(&invoice_line().id),
            Ok(Some(invoice_line()))
        );

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.context().unwrap();
        let service = service_provider.invoice_service;

        let update = inline_init(|r: &mut UpdateOutboundShipment| {
            r.id = invoice().id;
            r.status = Some(UpdateOutboundShipmentStatus::Picked);
        });
        let result = service.update_outbound_shipment(&context, &mock_store_a().id, update);

        assert!(matches!(result, Ok(_)), "Not Ok(_) {:#?}", result);

        assert_eq!(
            InvoiceLineRowRepository::new(&connection).find_one_by_id_option(&invoice_line().id),
            Ok(None)
        );
    }

    #[actix_rt::test]
    async fn update_outbound_shipment_success() {
        fn invoice() -> InvoiceRow {
            inline_init(|r: &mut InvoiceRow| {
                r.id = "test_invoice_pricing".to_string();
                r.name_id = mock_name_a().id;
                r.store_id = mock_store_a().id;
                r.r#type = InvoiceRowType::OutboundShipment;
            })
        }

        fn customer() -> NameRow {
            inline_init(|r: &mut NameRow| {
                r.id = "customer".to_string();
            })
        }

        fn customer_join() -> NameStoreJoinRow {
            inline_init(|r: &mut NameStoreJoinRow| {
                r.id = "customer_join".to_string();
                r.name_id = customer().id;
                r.store_id = mock_store_a().id;
                r.name_is_customer = true;
            })
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "update_outbound_shipment_success",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.invoices = vec![invoice()];
                r.names = vec![customer()];
                r.name_store_joins = vec![customer_join()];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.context().unwrap();
        let service = service_provider.invoice_service;

        // Test all fields apart from status
        fn get_update() -> UpdateOutboundShipment {
            UpdateOutboundShipment {
                id: invoice().id,
                other_party_id: Some(customer().id),
                status: None,
                on_hold: Some(true),
                comment: Some("comment".to_string()),
                their_reference: Some("their_reference".to_string()),
                colour: Some("colour".to_string()),
                transport_reference: Some("transport_reference".to_string()),
            }
        }

        let result = service.update_outbound_shipment(&context, "store_a", get_update());

        assert!(matches!(result, Ok(_)), "Not Ok(_) {:#?}", result);

        let updated_record = InvoiceRowRepository::new(&connection)
            .find_one_by_id(&invoice().id)
            .unwrap();

        assert_eq!(
            updated_record,
            inline_edit(&invoice(), |mut u| {
                let UpdateOutboundShipment {
                    id: _,
                    other_party_id: _,
                    status: _,
                    on_hold,
                    comment,
                    their_reference,
                    colour,
                    transport_reference,
                } = get_update();
                u.name_id = customer().id;
                u.on_hold = on_hold.unwrap();
                u.comment = comment;
                u.their_reference = their_reference;
                u.colour = colour;
                u.transport_reference = transport_reference;
                u
            })
        );
    }
}
