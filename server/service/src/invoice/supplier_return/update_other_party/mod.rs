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
pub struct UpdateSupplierReturnOtherParty {
    pub id: String,
    pub other_party_id: Option<String>,
}

#[derive(Debug, PartialEq)]
pub enum UpdateSupplierReturnOtherPartyError {
    InvoiceDoesNotExist,
    InvoiceIsNotEditable,
    NotAnSupplierReturn,
    NotThisStoreInvoice,
    // Name validation
    OtherPartyNotASupplier,
    OtherPartyNotVisible,
    OtherPartyDoesNotExist,
    // Internal
    UpdatedInvoiceDoesNotExist,
    DatabaseError(RepositoryError),
}

type OutError = UpdateSupplierReturnOtherPartyError;

pub fn update_supplier_return_other_party(
    ctx: &ServiceContext,
    patch: UpdateSupplierReturnOtherParty,
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

    ctx.processors_trigger.trigger_invoice_transfer_processors();

    Ok(invoice)
}

impl From<RepositoryError> for UpdateSupplierReturnOtherPartyError {
    fn from(error: RepositoryError) -> Self {
        UpdateSupplierReturnOtherPartyError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{
            mock_inbound_shipment_a, mock_name_a, mock_store_a, mock_store_b, mock_store_c,
            mock_supplier_return_a, mock_supplier_return_b, MockData, MockDataInserts,
        },
        test_db::setup_all_with_data,
        InvoiceLineRow, InvoiceLineRowRepository, InvoiceRow, InvoiceRowRepository, InvoiceStatus,
        InvoiceType, NameRow, NameStoreJoinRow,
    };

    use crate::{
        invoice::supplier_return::update_other_party::UpdateSupplierReturnOtherParty,
        service_provider::ServiceProvider,
    };

    use super::UpdateSupplierReturnOtherPartyError;

    type ServiceError = UpdateSupplierReturnOtherPartyError;

    #[actix_rt::test]
    async fn update_supplier_return_other_party_errors() {
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
                store_id: mock_store_b().id,
                name_is_supplier: false,
                ..Default::default()
            }
        }

        fn return_not_editable() -> InvoiceRow {
            let mut r = mock_supplier_return_a().clone();
            r.status = InvoiceStatus::Shipped;
            r
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "update_supplier_return_other_party_errors",
            MockDataInserts::all(),
            MockData {
                names: vec![not_visible(), not_a_supplier()],
                name_store_joins: vec![not_a_supplier_join()],
                invoices: vec![return_not_editable()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let mut context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_service;

        // InvoiceDoesNotExist
        assert_eq!(
            service.update_supplier_return_other_party(
                &context,
                UpdateSupplierReturnOtherParty {
                    id: "invalid".to_string(),
                    ..Default::default()
                }
            ),
            Err(ServiceError::InvoiceDoesNotExist)
        );
        // InvoiceIsNotEditable
        assert_eq!(
            service.update_supplier_return_other_party(
                &context,
                UpdateSupplierReturnOtherParty {
                    id: return_not_editable().id,
                    ..Default::default()
                }
            ),
            Err(ServiceError::InvoiceIsNotEditable)
        );
        // NotAnSupplierReturn
        context.store_id = mock_store_a().id;
        assert_eq!(
            service.update_supplier_return_other_party(
                &context,
                UpdateSupplierReturnOtherParty {
                    id: mock_inbound_shipment_a().id,
                    ..Default::default()
                }
            ),
            Err(ServiceError::NotAnSupplierReturn)
        );
        // NotThisStoreInvoice
        assert_eq!(
            service.update_supplier_return_other_party(
                &context,
                UpdateSupplierReturnOtherParty {
                    id: mock_supplier_return_b().id,
                    ..Default::default()
                }
            ),
            Err(ServiceError::NotThisStoreInvoice)
        );
        // OtherPartyDoesNotExist
        context.store_id = mock_store_b().id;
        assert_eq!(
            service.update_supplier_return_other_party(
                &context,
                UpdateSupplierReturnOtherParty {
                    id: mock_supplier_return_b().id,
                    other_party_id: Some("invalid".to_string()),
                    ..Default::default()
                }
            ),
            Err(ServiceError::OtherPartyDoesNotExist)
        );
        // OtherPartyNotVisible
        assert_eq!(
            service.update_supplier_return_other_party(
                &context,
                UpdateSupplierReturnOtherParty {
                    id: mock_supplier_return_b().id,
                    other_party_id: Some(not_visible().id),
                    ..Default::default()
                }
            ),
            Err(ServiceError::OtherPartyNotVisible)
        );
        // OtherPartyNotASupplier
        assert_eq!(
            service.update_supplier_return_other_party(
                &context,
                UpdateSupplierReturnOtherParty {
                    id: mock_supplier_return_b().id,
                    other_party_id: Some(not_a_supplier().id),
                    ..Default::default()
                }
            ),
            Err(ServiceError::OtherPartyNotASupplier)
        );
    }

    #[actix_rt::test]
    async fn update_supplier_return_other_party_success() {
        fn invoice() -> InvoiceRow {
            InvoiceRow {
                id: "test_other_party_change".to_string(),
                name_link_id: mock_name_a().id,
                store_id: mock_store_c().id,
                r#type: InvoiceType::SupplierReturn,
                status: InvoiceStatus::Picked,
                ..Default::default()
            }
        }

        fn invoice_line_a() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "some_invoice_line_id_a".to_string(),
                invoice_id: invoice().id,
                item_link_id: "item_a".to_string(),
                location_id: None,
                stock_line_id: Some("stock_line_ci_d_siline_a".to_string()),
                batch: Some("stock_line_ci_d_siline_a".to_string()),
                ..Default::default()
            }
        }

        fn invoice_line_b() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "some_invoice_line_id_b".to_string(),
                invoice_id: invoice().id,
                item_link_id: "item_b".to_string(),
                location_id: None,
                stock_line_id: Some("item_b_line_a".to_string()),
                batch: Some("item_b_line_a".to_string()),
                ..Default::default()
            }
        }

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
                store_id: mock_store_c().id,
                name_is_supplier: true,
                ..Default::default()
            }
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "update_supplier_return_other_party_success",
            MockDataInserts::all(),
            MockData {
                invoices: vec![invoice()],
                invoice_lines: vec![invoice_line_a(), invoice_line_b()],
                names: vec![supplier()],
                name_store_joins: vec![supplier_join()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_c().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_service;
        let invoice_row_repo = InvoiceRowRepository::new(&connection);
        let invoice_line_repo = InvoiceLineRowRepository::new(&connection);

        let updated_invoice = service
            .update_supplier_return_other_party(
                &context,
                UpdateSupplierReturnOtherParty {
                    id: invoice().id,
                    other_party_id: Some(supplier().id),
                },
            )
            .unwrap();
        let updated_lines = invoice_line_repo
            .find_many_by_invoice_id(&updated_invoice.invoice_row.id)
            .unwrap();

        assert_eq!(
            invoice_row_repo.find_one_by_id(&invoice().id).unwrap(),
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
                .find_one_by_id(&updated_invoice.invoice_row.id)
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
                {
                    let mut l = invoice_line_a().clone();
                    l.id = updated_lines[0].id.clone();
                    l.invoice_id = updated_invoice.invoice_row.id.clone();
                    l
                },
                {
                    let mut l = invoice_line_b().clone();
                    l.id = updated_lines[1].id.clone();
                    l.invoice_id = updated_invoice.invoice_row.id.clone();
                    l
                }
            ]
        );
    }
}
