use crate::activity_log::activity_log_entry;
use crate::invoice::query::get_invoice;
use crate::service_provider::ServiceContext;
use crate::WithDBError;
use repository::{ActivityLogType, Invoice};
use repository::{InvoiceRowRepository, RepositoryError};

mod generate;
mod validate;

use generate::generate;
use validate::validate;

#[derive(Clone, Debug, Default, PartialEq)]
pub struct InsertInboundShipment {
    pub id: String,
    pub other_party_id: String,
    pub on_hold: Option<bool>,
    pub comment: Option<String>,
    pub their_reference: Option<String>,
    pub colour: Option<String>,
    pub requisition_id: Option<String>,
    pub goods_received_id: Option<String>,
}

type OutError = InsertInboundShipmentError;

pub fn insert_inbound_shipment(
    ctx: &ServiceContext,
    input: InsertInboundShipment,
) -> Result<Invoice, OutError> {
    let invoice = ctx
        .connection
        .transaction_sync(|connection| {
            let other_party = validate(connection, &ctx.store_id, &input)?;
            let new_invoice =
                generate(connection, &ctx.store_id, &ctx.user_id, input, other_party)?;
            InvoiceRowRepository::new(connection).upsert_one(&new_invoice)?;

            activity_log_entry(
                ctx,
                ActivityLogType::InvoiceCreated,
                Some(new_invoice.id.to_string()),
                None,
                None,
            )?;

            get_invoice(ctx, None, &new_invoice.id)
                .map_err(OutError::DatabaseError)?
                .ok_or(OutError::NewlyCreatedInvoiceDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(invoice)
}

#[derive(Debug, PartialEq)]
pub enum InsertInboundShipmentError {
    InvoiceAlreadyExists,
    // Name validation
    OtherPartyDoesNotExist,
    OtherPartyNotVisible,
    OtherPartyNotASupplier,
    CannotLinkARequisitionToInboundShipment,
    RequisitionDoesNotExist,
    InternalOrderDoesNotBelongToStore,
    NotAnInternalOrder,
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
        mock::{
            currency_a, mock_inbound_shipment_c, mock_name_a, mock_name_linked_to_store_join,
            mock_name_not_linked_to_store, mock_store_a, mock_store_linked_to_name,
            mock_user_account_a, MockData, MockDataInserts,
        },
        test_db::setup_all_with_data,
        InvoiceRow, InvoiceRowRepository, NameRow, NameStoreJoinRow,
    };

    use crate::{
        invoice::inbound_shipment::InsertInboundShipment, service_provider::ServiceProvider,
    };

    use super::InsertInboundShipmentError;

    type ServiceError = InsertInboundShipmentError;

    #[actix_rt::test]
    async fn insert_inbound_shipment_errors() {
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
            "insert_inbound_shipment_errors",
            MockDataInserts::all(),
            MockData {
                names: vec![not_visible(), not_a_supplier()],
                name_store_joins: vec![not_a_supplier_join()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_service;

        //InvoiceAlreadyExists
        assert_eq!(
            service.insert_inbound_shipment(
                &context,
                InsertInboundShipment {
                    id: mock_inbound_shipment_c().id.clone(),
                    other_party_id: mock_name_a().id.clone(),
                    ..Default::default()
                },
            ),
            Err(ServiceError::InvoiceAlreadyExists)
        );
        // OtherPartyDoesNotExist
        assert_eq!(
            service.insert_inbound_shipment(
                &context,
                InsertInboundShipment {
                    id: "new_id".to_string(),
                    other_party_id: "invalid".to_string(),
                    ..Default::default()
                },
            ),
            Err(ServiceError::OtherPartyDoesNotExist)
        );
        // OtherPartyNotVisible
        assert_eq!(
            service.insert_inbound_shipment(
                &context,
                InsertInboundShipment {
                    id: "new_id".to_string(),
                    other_party_id: not_visible().id,
                    ..Default::default()
                },
            ),
            Err(ServiceError::OtherPartyNotVisible)
        );
        // OtherPartyNotASupplier
        assert_eq!(
            service.insert_inbound_shipment(
                &context,
                InsertInboundShipment {
                    id: "new_id".to_string(),
                    other_party_id: not_a_supplier().id,
                    ..Default::default()
                },
            ),
            Err(ServiceError::OtherPartyNotASupplier)
        );

        // NewlyCreatedInvoiceDoesNotExist
    }

    #[actix_rt::test]
    async fn insert_inbound_shipment_success() {
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

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "insert_inbound_shipment_success",
            MockDataInserts::all(),
            MockData {
                names: vec![supplier()],
                name_store_joins: vec![supplier_join()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.invoice_service;

        // Success
        service
            .insert_inbound_shipment(
                &context,
                InsertInboundShipment {
                    id: "new_id".to_string(),
                    other_party_id: supplier().id,
                    ..Default::default()
                },
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id("new_id")
            .unwrap()
            .unwrap();

        assert_eq!(
            invoice,
            InvoiceRow {
                name_id: supplier().id,
                user_id: Some(mock_user_account_a().id),
                currency_id: Some(currency_a().id),
                ..invoice.clone()
            }
        );

        //Test success On Hold
        service
            .insert_inbound_shipment(
                &context,
                InsertInboundShipment {
                    id: "test_on_hold".to_string(),
                    other_party_id: supplier().id,
                    on_hold: Some(true),
                    ..Default::default()
                },
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id("test_on_hold")
            .unwrap()
            .unwrap();

        assert_eq!(
            invoice,
            InvoiceRow {
                name_id: supplier().id,
                on_hold: true,
                ..invoice.clone()
            }
        );

        //Test success name_store_id linked to store
        service
            .insert_inbound_shipment(
                &context,
                InsertInboundShipment {
                    id: "test_name_store_id_linked".to_string(),
                    other_party_id: mock_name_linked_to_store_join().name_id.clone(),
                    ..Default::default()
                },
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id("test_name_store_id_linked")
            .unwrap()
            .unwrap();

        assert_eq!(
            invoice,
            InvoiceRow {
                name_store_id: Some(mock_store_linked_to_name().id),
                ..invoice.clone()
            }
        );

        //Test success name_store_id, not linked to store
        service
            .insert_inbound_shipment(
                &context,
                InsertInboundShipment {
                    id: "test_name_store_id_not_linked".to_string(),
                    other_party_id: mock_name_not_linked_to_store().id.clone(),
                    ..Default::default()
                },
            )
            .unwrap();

        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id("test_name_store_id_not_linked")
            .unwrap()
            .unwrap();

        assert_eq!(invoice.name_store_id, None);
    }
}
