pub mod generate;
pub mod validate;

use crate::{invoice::query::get_invoice, service_provider::ServiceContext};
use generate::{generate, GenerateResult};
use repository::{
    ActivityLogRowRepository, Invoice, InvoiceLineRowRepository, InvoiceRowRepository,
    RepositoryError,
};
use validate::validate;

#[derive(Clone, Debug, PartialEq, Default)]
pub struct UpdateOutboundShipmentName {
    pub id: String,
    pub other_party_id: Option<String>,
}

#[derive(Debug, PartialEq)]
pub enum UpdateOutboundShipmentNameError {
    InvoiceDoesNotExist,
    InvoiceIsNotEditable,
    NotAnOutboundShipment,
    NotThisStoreInvoice,
    // Name validation
    OtherPartyNotACustomer,
    OtherPartyNotVisible,
    OtherPartyDoesNotExist,
    // Internal
    UpdatedInvoiceDoesNotExist,
    DatabaseError(RepositoryError),
}

type OutError = UpdateOutboundShipmentNameError;

pub fn update_outbound_shipment_name(
    ctx: &ServiceContext,
    patch: UpdateOutboundShipmentName,
) -> Result<Invoice, OutError> {
    let invoice = ctx
        .connection
        .transaction_sync(|connection| {
            let (invoice, other_party_option) = validate(connection, &ctx.store_id, &patch)?;
            let GenerateResult {
                old_invoice,
                old_invoice_lines,
                new_invoice,
                new_invoice_lines,
                new_activity_log,
            } = generate(connection, invoice, other_party_option, patch.clone())?;

            let invoice_repo = InvoiceRowRepository::new(connection);
            let invoice_line_repo = InvoiceLineRowRepository::new(connection);
            invoice_repo.upsert_one(&new_invoice)?;

            for new_invoice_line in new_invoice_lines {
                invoice_line_repo.upsert_one(&new_invoice_line.invoice_line_row)?;
            }

            for old_invoice_line in old_invoice_lines {
                invoice_line_repo.delete(&old_invoice_line.invoice_line_row.id)?;
            }

            invoice_repo.delete(&old_invoice.id)?;

            for new_activity in new_activity_log {
                ActivityLogRowRepository::new(connection).insert_one(&new_activity)?;
            }

            get_invoice(ctx, None, &new_invoice.id)
                .map_err(OutError::DatabaseError)?
                .ok_or(OutError::UpdatedInvoiceDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    ctx.processors_trigger
        .trigger_shipment_transfer_processors();

    Ok(invoice)
}

impl From<RepositoryError> for UpdateOutboundShipmentNameError {
    fn from(error: RepositoryError) -> Self {
        UpdateOutboundShipmentNameError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{
            mock_inbound_shipment_a, mock_name_a, mock_outbound_shipment_a,
            mock_outbound_shipment_b, mock_outbound_shipment_c, mock_store_a, mock_store_b,
            mock_store_c, MockData, MockDataInserts,
        },
        test_db::setup_all_with_data,
        InvoiceLineRow, InvoiceLineRowRepository, InvoiceRow, InvoiceRowRepository, InvoiceStatus,
        InvoiceType, NameRow, NameStoreJoinRow,
    };
    use util::{inline_edit, inline_init};

    use crate::{
        invoice::outbound_shipment::update_name::UpdateOutboundShipmentName,
        service_provider::ServiceProvider,
    };

    use super::UpdateOutboundShipmentNameError;

    type ServiceError = UpdateOutboundShipmentNameError;

    #[actix_rt::test]
    async fn update_outbound_shipment_name_errors() {
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
                r.store_id = mock_store_b().id;
                r.name_is_customer = false;
            })
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "update_outbound_shipment_name_errors",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.names = vec![not_visible(), not_a_customer()];
                r.name_store_joins = vec![not_a_customer_join()];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let mut context = service_provider
            .context(mock_store_c().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_service;

        // InvoiceDoesNotExist
        assert_eq!(
            service.update_outbound_shipment_name(
                &context,
                inline_init(|r: &mut UpdateOutboundShipmentName| { r.id = "invalid".to_string() })
            ),
            Err(ServiceError::InvoiceDoesNotExist)
        );
        // InvoiceIsNotEditable
        assert_eq!(
            service.update_outbound_shipment_name(
                &context,
                inline_init(|r: &mut UpdateOutboundShipmentName| {
                    r.id = mock_outbound_shipment_b().id;
                })
            ),
            Err(ServiceError::InvoiceIsNotEditable)
        );
        // NotAnOutboundShipment
        context.store_id = mock_store_a().id;
        assert_eq!(
            service.update_outbound_shipment_name(
                &context,
                inline_init(|r: &mut UpdateOutboundShipmentName| {
                    r.id = mock_inbound_shipment_a().id
                })
            ),
            Err(ServiceError::NotAnOutboundShipment)
        );
        // NotThisStoreInvoice
        assert_eq!(
            service.update_outbound_shipment_name(
                &context,
                inline_init(|r: &mut UpdateOutboundShipmentName| {
                    r.id = mock_outbound_shipment_c().id;
                })
            ),
            Err(ServiceError::NotThisStoreInvoice)
        );
        // OtherPartyDoesNotExist
        context.store_id = mock_store_b().id;
        assert_eq!(
            service.update_outbound_shipment_name(
                &context,
                inline_init(|r: &mut UpdateOutboundShipmentName| {
                    r.id = mock_outbound_shipment_a().id;
                    r.other_party_id = Some("invalid".to_string());
                })
            ),
            Err(ServiceError::OtherPartyDoesNotExist)
        );
        // OtherPartyNotVisible
        assert_eq!(
            service.update_outbound_shipment_name(
                &context,
                inline_init(|r: &mut UpdateOutboundShipmentName| {
                    r.id = mock_outbound_shipment_a().id;
                    r.other_party_id = Some(not_visible().id);
                })
            ),
            Err(ServiceError::OtherPartyNotVisible)
        );
        // OtherPartyNotACustomer
        assert_eq!(
            service.update_outbound_shipment_name(
                &context,
                inline_init(|r: &mut UpdateOutboundShipmentName| {
                    r.id = mock_outbound_shipment_a().id;
                    r.other_party_id = Some(not_a_customer().id);
                })
            ),
            Err(ServiceError::OtherPartyNotACustomer)
        );
    }

    #[actix_rt::test]
    async fn update_outbound_shipment_name_success() {
        fn invoice() -> InvoiceRow {
            inline_init(|r: &mut InvoiceRow| {
                r.id = "test_invoice_pricing".to_string();
                r.name_link_id = mock_name_a().id;
                r.store_id = mock_store_c().id;
                r.r#type = InvoiceType::OutboundShipment;
                r.status = InvoiceStatus::Picked;
            })
        }

        fn invoice_line_a() -> InvoiceLineRow {
            inline_init(|l: &mut InvoiceLineRow| {
                l.id = "some_invoice_line_id_a".to_string();
                l.invoice_id = invoice().id;
                l.item_link_id = "item_a".to_string();
                l.location_id = None;
                l.stock_line_id = Some("stock_line_ci_d_siline_a".to_string());
                l.batch = Some("stock_line_ci_d_siline_a".to_string());
            })
        }

        fn invoice_line_b() -> InvoiceLineRow {
            inline_init(|l: &mut InvoiceLineRow| {
                l.id = "some_invoice_line_id_b".to_string();
                l.invoice_id = invoice().id;
                l.item_link_id = "item_b".to_string();
                l.location_id = None;
                l.stock_line_id = Some("item_b_line_a".to_string());
                l.batch = Some("item_b_line_a".to_string());
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
                r.name_link_id = customer().id;
                r.store_id = mock_store_c().id;
                r.name_is_customer = true;
            })
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "update_outbound_shipment_name_success",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.invoices = vec![invoice()];
                r.invoice_lines = vec![invoice_line_a(), invoice_line_b()];
                r.names = vec![customer()];
                r.name_store_joins = vec![customer_join()];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_c().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_service;
        let invoice_row_repo = InvoiceRowRepository::new(&connection);
        let invoice_line_repo = InvoiceLineRowRepository::new(&connection);

        let updated_invoice = service
            .update_outbound_shipment_name(
                &context,
                UpdateOutboundShipmentName {
                    id: invoice().id,
                    other_party_id: Some(customer().id),
                },
            )
            .unwrap();
        let updated_lines = invoice_line_repo
            .find_many_by_invoice_id(&updated_invoice.invoice_row.id)
            .unwrap();

        assert_eq!(
            invoice_row_repo
                .find_one_by_id_option(&invoice().id)
                .unwrap(),
            None
        );
        assert_eq!(
            invoice_line_repo
                .find_many_by_invoice_id(&invoice_line_a().id)
                .unwrap(),
            vec![]
        );
        assert_eq!(
            invoice_row_repo
                .find_one_by_id_option(&updated_invoice.invoice_row.id)
                .unwrap()
                .unwrap(),
            updated_invoice.invoice_row
        );
        assert_ne!(
            updated_invoice.invoice_row.name_link_id,
            invoice().name_link_id
        );
        assert_eq!(
            updated_lines,
            vec![
                inline_edit(&invoice_line_a(), |mut l| {
                    l.id = updated_lines[0].id.clone();
                    l.invoice_id = updated_invoice.invoice_row.id.clone();
                    l
                }),
                inline_edit(&invoice_line_b(), |mut l| {
                    l.id = updated_lines[1].id.clone();
                    l.invoice_id = updated_invoice.invoice_row.id.clone();
                    l
                })
            ]
        );
    }
}
