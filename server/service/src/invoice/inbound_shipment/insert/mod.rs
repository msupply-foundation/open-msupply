use crate::invoice::query::get_invoice;
use crate::log::log_entry;
use crate::service_provider::ServiceContext;
use crate::WithDBError;
use repository::{Invoice, LogRow, LogType};
use repository::{InvoiceRowRepository, RepositoryError};

mod generate;
mod validate;

use generate::generate;
use util::uuid::uuid;
use validate::validate;

#[derive(Clone, Debug, Default)]
pub struct InsertInboundShipment {
    pub id: String,
    pub other_party_id: String,
    pub on_hold: Option<bool>,
    pub comment: Option<String>,
    pub their_reference: Option<String>,
    pub colour: Option<String>,
}

type OutError = InsertInboundShipmentError;

pub fn insert_inbound_shipment(
    ctx: &ServiceContext,
    store_id: &str,
    user_id: &str,
    input: InsertInboundShipment,
) -> Result<Invoice, OutError> {
    let invoice = ctx
        .connection
        .transaction_sync(|connection| {
            let other_party = validate(connection, store_id, &input)?;
            let new_invoice = generate(connection, store_id, user_id, input, other_party)?;
            InvoiceRowRepository::new(connection).upsert_one(&new_invoice)?;
            get_invoice(ctx, None, &new_invoice.id)
                .map_err(|error| OutError::DatabaseError(error))?
                .ok_or(OutError::NewlyCreatedInvoiceDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    log_entry(
        &ctx.connection,
        &LogRow {
            id: uuid(),
            r#type: LogType::InvoiceCreated,
            user_id: Some(user_id.to_string()),
            store_id: Some(invoice.invoice_row.store_id.clone()),
            record_id: Some(invoice.invoice_row.id.clone()),
            datetime: invoice.invoice_row.created_datetime.clone(),
        },
    )?;

    Ok(invoice)
}

#[derive(Debug, PartialEq)]
pub enum InsertInboundShipmentError {
    InvoiceAlreadyExists,
    // Name validation
    OtherPartyDoesNotExist,
    OtherPartyNotVisible,
    OtherPartyNotASupplier,
    // Internal error
    NewlyCreatedInvoiceDoesNotExist,
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for InsertInboundShipmentError {
    fn from(error: RepositoryError) -> Self {
        InsertInboundShipmentError::DatabaseError(error)
    }
}

impl<ERR> From<WithDBError<ERR>> for InsertInboundShipmentError
where
    ERR: Into<InsertInboundShipmentError>,
{
    fn from(result: WithDBError<ERR>) -> Self {
        match result {
            WithDBError::DatabaseError(error) => error.into(),
            WithDBError::Error(error) => error.into(),
        }
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{mock_store_a, mock_user_account_a, MockData, MockDataInserts},
        test_db::setup_all_with_data,
        InvoiceRowRepository, NameRow, NameStoreJoinRow,
    };
    use util::{inline_edit, inline_init};

    use crate::{
        invoice::inbound_shipment::InsertInboundShipment, service_provider::ServiceProvider,
    };

    use super::InsertInboundShipmentError;

    type ServiceError = InsertInboundShipmentError;

    #[actix_rt::test]
    async fn insert_inbound_shipment_errors() {
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
            "insert_inbound_shipment_errors",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.names = vec![not_visible(), not_a_supplier()];
                r.name_store_joins = vec![not_a_supplier_join()];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.context().unwrap();
        let service = service_provider.invoice_service;

        // OtherPartyDoesNotExist
        assert_eq!(
            service.insert_inbound_shipment(
                &context,
                &mock_store_a().id,
                "n/a",
                inline_init(|r: &mut InsertInboundShipment| {
                    r.id = "new_id".to_string();
                    r.other_party_id = "invalid".to_string();
                })
            ),
            Err(ServiceError::OtherPartyDoesNotExist)
        );
        // OtherPartyNotVisible
        assert_eq!(
            service.insert_inbound_shipment(
                &context,
                &mock_store_a().id,
                "n/a",
                inline_init(|r: &mut InsertInboundShipment| {
                    r.id = "new_id".to_string();
                    r.other_party_id = not_visible().id;
                })
            ),
            Err(ServiceError::OtherPartyNotVisible)
        );
        // OtherPartyNotASupplier
        assert_eq!(
            service.insert_inbound_shipment(
                &context,
                &mock_store_a().id,
                "n/a",
                inline_init(|r: &mut InsertInboundShipment| {
                    r.id = "new_id".to_string();
                    r.other_party_id = not_a_supplier().id;
                })
            ),
            Err(ServiceError::OtherPartyNotASupplier)
        );

        // TODO add not Other error (only other party related atm)
    }

    #[actix_rt::test]
    async fn insert_inbound_shipment_success() {
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
            "insert_inbound_shipment_success",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.names = vec![supplier()];
                r.name_store_joins = vec![supplier_join()];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.context().unwrap();
        let service = service_provider.invoice_service;

        // Success
        service
            .insert_inbound_shipment(
                &context,
                &mock_store_a().id,
                &mock_user_account_a().id,
                inline_init(|r: &mut InsertInboundShipment| {
                    r.id = "new_id".to_string();
                    r.other_party_id = supplier().id;
                }),
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id("new_id")
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
