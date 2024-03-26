use repository::{ActivityLogType, Invoice, InvoiceRowRepository};
use repository::{RepositoryError, TransactionError};

pub mod generate;
pub mod validate;

use generate::generate;
use validate::validate;

use crate::activity_log::activity_log_entry;
use crate::invoice::query::get_invoice;
use crate::service_provider::ServiceContext;

#[derive(Clone, Debug, Default, PartialEq)]
pub struct InsertOutboundShipment {
    pub id: String,
    pub other_party_id: String,
    pub on_hold: Option<bool>,
    pub comment: Option<String>,
    pub their_reference: Option<String>,
    pub colour: Option<String>,
}

#[derive(Clone, Debug, PartialEq)]
pub enum InsertOutboundShipmentError {
    InvoiceAlreadyExists,
    // Name validation
    OtherPartyNotACustomer,
    OtherPartyNotVisible,
    OtherPartyDoesNotExist,
    // Internal
    NewlyCreatedInvoiceDoesNotExist,
    DatabaseError(RepositoryError),
}

type OutError = InsertOutboundShipmentError;

/// Insert a new outbound shipment and returns the invoice when successful.
pub fn insert_outbound_shipment(
    ctx: &ServiceContext,
    input: InsertOutboundShipment,
) -> Result<Invoice, OutError> {
    let invoice = ctx
        .connection
        .transaction_sync(|connection| {
            let other_party = validate(connection, &ctx.store_id, &input)?;
            let new_invoice =
                generate(connection, &ctx.store_id, &ctx.user_id, input, other_party)?;

            InvoiceRowRepository::new(&connection).upsert_one(&new_invoice)?;

            activity_log_entry(
                &ctx,
                ActivityLogType::InvoiceCreated,
                Some(new_invoice.id.to_owned()),
                None,
                None,
            )?;

            get_invoice(ctx, None, &new_invoice.id)
                .map_err(|error| OutError::DatabaseError(error))?
                .ok_or(OutError::NewlyCreatedInvoiceDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(invoice)
}

impl From<RepositoryError> for InsertOutboundShipmentError {
    fn from(error: RepositoryError) -> Self {
        InsertOutboundShipmentError::DatabaseError(error)
    }
}

impl From<TransactionError<InsertOutboundShipmentError>> for InsertOutboundShipmentError {
    fn from(error: TransactionError<InsertOutboundShipmentError>) -> Self {
        match error {
            TransactionError::Transaction { msg, level } => {
                InsertOutboundShipmentError::DatabaseError(RepositoryError::TransactionError {
                    msg,
                    level,
                })
            }
            TransactionError::Inner(e) => e,
        }
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{
            currency_a, mock_name_linked_to_store_join, mock_name_not_linked_to_store,
            mock_outbound_shipment_a, mock_store_a, mock_store_linked_to_name, mock_user_account_a,
            MockData, MockDataInserts,
        },
        test_db::setup_all_with_data,
        InvoiceRowRepository, NameRow, NameStoreJoinRow,
    };
    use util::{inline_edit, inline_init};

    use crate::{
        invoice::outbound_shipment::insert::InsertOutboundShipment,
        service_provider::ServiceProvider,
    };

    use super::InsertOutboundShipmentError;

    type ServiceError = InsertOutboundShipmentError;

    #[actix_rt::test]
    async fn insert_outbound_shipment_errors() {
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
                r.name_link_id = not_a_customer().id;
                r.store_id = mock_store_a().id;
                r.name_is_customer = false;
            })
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "insert_outbound_shipment_errors",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.names = vec![not_visible(), not_a_customer()];
                r.name_store_joins = vec![not_a_customer_join()];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_service;

        //InvoiceAlreadyExists
        assert_eq!(
            service.insert_outbound_shipment(
                &context,
                inline_init(|r: &mut InsertOutboundShipment| {
                    r.id = mock_outbound_shipment_a().id;
                })
            ),
            Err(ServiceError::InvoiceAlreadyExists)
        );
        // OtherPartyDoesNotExist
        assert_eq!(
            service.insert_outbound_shipment(
                &context,
                inline_init(|r: &mut InsertOutboundShipment| {
                    r.id = "new_id".to_string();
                    r.other_party_id = "invalid".to_string();
                })
            ),
            Err(ServiceError::OtherPartyDoesNotExist)
        );
        // OtherPartyNotVisible
        assert_eq!(
            service.insert_outbound_shipment(
                &context,
                inline_init(|r: &mut InsertOutboundShipment| {
                    r.id = "new_id".to_string();
                    r.other_party_id = not_visible().id;
                })
            ),
            Err(ServiceError::OtherPartyNotVisible)
        );
        // OtherPartyNotACustomer
        assert_eq!(
            service.insert_outbound_shipment(
                &context,
                inline_init(|r: &mut InsertOutboundShipment| {
                    r.id = "new_id".to_string();
                    r.other_party_id = not_a_customer().id;
                })
            ),
            Err(ServiceError::OtherPartyNotACustomer)
        );

        // TODO NewlyCreatedInvoiceDoesNotExist
    }

    #[actix_rt::test]
    async fn insert_outbound_shipment_success() {
        fn customer() -> NameRow {
            inline_init(|r: &mut NameRow| {
                r.id = "customer".to_string();
            })
        }

        fn customer_join() -> NameStoreJoinRow {
            inline_init(|r: &mut NameStoreJoinRow| {
                r.id = "customer_join".to_string();
                r.name_link_id = customer().id;
                r.store_id = mock_store_a().id;
                r.name_is_customer = true;
            })
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "insert_outbound_shipment_success",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.names = vec![customer()];
                r.name_store_joins = vec![customer_join()];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.invoice_service;

        // Success
        service
            .insert_outbound_shipment(
                &context,
                inline_init(|r: &mut InsertOutboundShipment| {
                    r.id = "new_id".to_string();
                    r.other_party_id = customer().id;
                }),
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id("new_id")
            .unwrap();

        assert_eq!(
            invoice,
            inline_edit(&invoice, |mut u| {
                u.name_link_id = customer().id;
                u.user_id = Some(mock_user_account_a().id);
                u.currency_id = currency_a().id;
                u
            })
        );

        //Test success onHold
        service
            .insert_outbound_shipment(
                &context,
                inline_init(|r: &mut InsertOutboundShipment| {
                    r.id = "test_on_hold".to_string();
                    r.other_party_id = customer().id;
                    r.on_hold = Some(true);
                }),
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id("test_on_hold")
            .unwrap();

        assert_eq!(
            invoice,
            inline_edit(&invoice, |mut u| {
                u.name_link_id = customer().id;
                u.on_hold = true;
                u
            })
        );

        //Test success name_store_id linked to store
        service
            .insert_outbound_shipment(
                &context,
                inline_init(|r: &mut InsertOutboundShipment| {
                    r.id = "test_name_store_id_linked".to_string();
                    r.other_party_id = mock_name_linked_to_store_join().name_link_id.clone();
                }),
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id("test_name_store_id_linked")
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
            .insert_outbound_shipment(
                &context,
                inline_init(|r: &mut InsertOutboundShipment| {
                    r.id = "test_name_store_id_not_linked".to_string();
                    r.other_party_id = mock_name_not_linked_to_store().id.clone();
                }),
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id("test_name_store_id_not_linked")
            .unwrap();

        assert_eq!(invoice.name_store_id, None)
    }
}
