use crate::{
    invoice::query::get_invoice,
    service_provider::ServiceContext,
    sync_processor::{process_records, Record},
    WithDBError,
};
use repository::Invoice;
use repository::{
    db_diesel::InvoiceRowStatus, InvoiceLineRowRepository, InvoiceRowRepository, RepositoryError,
    StockLineRowRepository,
};

mod generate;
mod validate;

use generate::generate;
use validate::validate;

use self::generate::LineAndStockLine;

#[derive(Clone, Debug)]
pub enum UpdateInboundShipmentStatus {
    Delivered,
    Verified,
}

#[derive(Clone, Debug, Default)]
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
    store_id: &str,
    user_id: &str,
    patch: UpdateInboundShipment,
) -> Result<Invoice, OutError> {
    let invoice = ctx
        .connection
        .transaction_sync(|connection| {
            let (invoice, other_party) = validate(connection, store_id, &patch)?;
            let (lines_and_invoice_lines_option, update_invoice) =
                generate(connection, user_id, invoice, other_party, patch)?;

            InvoiceRowRepository::new(connection).upsert_one(&update_invoice)?;

            if let Some(lines_and_invoice_lines) = lines_and_invoice_lines_option {
                let stock_line_repository = StockLineRowRepository::new(connection);
                let invoice_line_respository = InvoiceLineRowRepository::new(connection);

                for LineAndStockLine { line, stock_line } in lines_and_invoice_lines.into_iter() {
                    stock_line_repository.upsert_one(&stock_line)?;
                    invoice_line_respository.upsert_one(&line)?;
                }
            }

            get_invoice(ctx, None, &update_invoice.id)
                .map_err(|error| OutError::DatabaseError(error))?
                .ok_or(OutError::UpdatedInvoiceDoesNotExist)
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
    UpdatedInvoiceDoesNotExist,
    DatabaseError(RepositoryError),
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
    use repository::{
        mock::{
            mock_inbound_shipment_a, mock_store_a, mock_user_account_a, MockData, MockDataInserts,
        },
        test_db::setup_all_with_data,
        InvoiceRowRepository, NameRow, NameStoreJoinRow,
    };
    use util::{inline_edit, inline_init};

    use crate::{
        invoice::inbound_shipment::UpdateInboundShipment, service_provider::ServiceProvider,
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

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.invoice_service;

        // OtherPartyDoesNotExist
        assert_eq!(
            service.update_inbound_shipment(
                &context,
                &mock_store_a().id,
                "n/a",
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
                &mock_store_a().id,
                "n/a",
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
                &mock_store_a().id,
                "n/a",
                inline_init(|r: &mut UpdateInboundShipment| {
                    r.id = mock_inbound_shipment_a().id;
                    r.other_party_id = Some(not_a_supplier().id);
                })
            ),
            Err(ServiceError::OtherPartyNotASupplier)
        );

        // TODO add not Other error (only other party related atm)
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

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.invoice_service;

        // Success
        service
            .update_inbound_shipment(
                &context,
                &mock_store_a().id,
                &mock_user_account_a().id,
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
        )

        // TODO validate other field
    }
}
