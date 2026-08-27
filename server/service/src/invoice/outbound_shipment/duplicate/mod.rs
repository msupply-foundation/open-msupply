use crate::activity_log::activity_log_entry;
use crate::invoice::query::get_invoice;
use crate::service_provider::ServiceContext;
use repository::{
    ActivityLogType, Invoice, InvoiceLineRowRepository, InvoiceRowRepository, RepositoryError,
};

mod generate;
mod validate;

use generate::{generate, GenerateResult};
use validate::validate;

#[derive(Debug, PartialEq)]
pub enum DuplicateOutboundShipmentError {
    InvoiceDoesNotExist,
    NotThisStoreInvoice,
    NotAnOutboundShipment,
    CustomerIsInactive,
    NewlyCreatedInvoiceDoesNotExist,
    DatabaseError(RepositoryError),
}
type OutError = DuplicateOutboundShipmentError;

#[derive(Debug, Clone, PartialEq)]
pub struct DuplicateOutboundShipment {
    pub invoice: Invoice,
    pub skipped_item_count: usize,
}

pub fn duplicate_outbound_shipment(
    ctx: &ServiceContext,
    source_id: String,
) -> Result<DuplicateOutboundShipment, OutError> {
    let result = ctx
        .connection
        .transaction_sync(
            |connection| -> Result<DuplicateOutboundShipment, OutError> {
                let source_invoice = validate(connection, &ctx.store_id, &source_id)?;
                let GenerateResult {
                    new_invoice,
                    new_lines,
                    skipped_item_count,
                } = generate(connection, &ctx.store_id, &ctx.user_id, source_invoice)?;

                InvoiceRowRepository::new(connection).upsert_one(&new_invoice)?;

                let invoice_line_row_repository = InvoiceLineRowRepository::new(connection);
                for line in new_lines.iter() {
                    invoice_line_row_repository.upsert_one(line)?;
                }

                activity_log_entry(
                    ctx,
                    ActivityLogType::InvoiceCreated,
                    Some(new_invoice.id.clone()),
                    None,
                    None,
                )?;

                let invoice = get_invoice(ctx, None, &new_invoice.id, None)
                    .map_err(OutError::DatabaseError)?
                    .ok_or(OutError::NewlyCreatedInvoiceDoesNotExist)?;

                Ok(DuplicateOutboundShipment {
                    invoice,
                    skipped_item_count,
                })
            },
        )
        .map_err(|error| error.to_inner_error())?;

    Ok(result)
}

impl From<RepositoryError> for DuplicateOutboundShipmentError {
    fn from(error: RepositoryError) -> Self {
        DuplicateOutboundShipmentError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{
            common::FullMockMasterList, mock_inbound_shipment_a, mock_name_store_a,
            mock_outbound_shipment_a, mock_outbound_shipment_a_invoice_lines, mock_store_b,
            mock_user_account_a, MockData, MockDataInserts,
        },
        test_db::{setup_all, setup_all_with_data},
        InvoiceLineRow, InvoiceLineRowRepository, InvoiceLineType, InvoiceRow, InvoiceStatus,
        MasterListLineRow, MasterListNameJoinRow, MasterListRow, NameStoreJoinRow,
    };

    use crate::service_provider::ServiceProvider;

    use super::DuplicateOutboundShipmentError;

    type ServiceError = DuplicateOutboundShipmentError;

    fn master_list_visible_to_store_b(items: &[&str]) -> FullMockMasterList {
        let master_list_id = "duplicate_os_catalogue".to_string();
        FullMockMasterList {
            master_list: MasterListRow {
                id: master_list_id.clone(),
                name: "duplicate_os_catalogue".to_string(),
                code: "duplicate_os_catalogue".to_string(),
                is_active: true,
                ..Default::default()
            },
            joins: vec![MasterListNameJoinRow {
                id: "duplicate_os_catalogue_join".to_string(),
                master_list_id: master_list_id.clone(),
                name_id: mock_store_b().name_id,
            }],
            lines: items
                .iter()
                .map(|item_id| MasterListLineRow {
                    id: format!("duplicate_os_catalogue_{item_id}"),
                    item_id: item_id.to_string(),
                    master_list_id: master_list_id.clone(),
                    ..Default::default()
                })
                .collect(),
        }
    }

    fn customer_visible_to_store_b() -> NameStoreJoinRow {
        NameStoreJoinRow {
            id: "duplicate_os_customer_join".to_string(),
            name_id: mock_name_store_a().id,
            store_id: mock_store_b().id,
            name_is_customer: true,
            name_is_supplier: false,
        }
    }

    #[actix_rt::test]
    async fn duplicate_outbound_shipment_errors() {
        let (_, _, connection_manager, _) =
            setup_all("duplicate_outbound_shipment_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let mut context = service_provider
            .context(mock_store_b().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.invoice_service;

        // InvoiceDoesNotExist
        assert_eq!(
            service.duplicate_outbound_shipment(&context, "does_not_exist".to_string()),
            Err(ServiceError::InvoiceDoesNotExist)
        );

        // NotThisStoreInvoice
        assert_eq!(
            service.duplicate_outbound_shipment(&context, mock_inbound_shipment_a().id),
            Err(ServiceError::NotThisStoreInvoice)
        );

        // CustomerIsInactive
        assert_eq!(
            service.duplicate_outbound_shipment(&context, mock_outbound_shipment_a().id),
            Err(ServiceError::CustomerIsInactive)
        );

        // NotAnOutboundShipment
        context.store_id = mock_inbound_shipment_a().store_id;
        assert_eq!(
            service.duplicate_outbound_shipment(&context, mock_inbound_shipment_a().id),
            Err(ServiceError::NotAnOutboundShipment)
        );
    }

    #[actix_rt::test]
    async fn duplicate_outbound_shipment_success() {
        let (_, connection, connection_manager, _) = setup_all_with_data(
            "duplicate_outbound_shipment_success",
            MockDataInserts::all(),
            MockData {
                name_store_joins: vec![customer_visible_to_store_b()],
                full_master_lists: vec![master_list_visible_to_store_b(&["item_a"])],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_b().id, mock_user_account_a().id)
            .unwrap();
        let service = service_provider.invoice_service;

        let source = mock_outbound_shipment_a();

        let duplicate = service
            .duplicate_outbound_shipment(&context, source.id.clone())
            .unwrap();
        // item_b was skipped (not active)
        assert_eq!(duplicate.skipped_item_count, 1);
        let new_invoice = duplicate.invoice.invoice_row;

        assert_ne!(new_invoice.id, source.id);
        assert_ne!(new_invoice.invoice_number, source.invoice_number);

        assert_eq!(
            new_invoice,
            InvoiceRow {
                id: new_invoice.id.clone(),
                invoice_number: new_invoice.invoice_number,
                created_datetime: new_invoice.created_datetime,
                user_id: Some(mock_user_account_a().id),
                status: InvoiceStatus::New,
                comment: Some(format!(
                    "Copied from shipment #{} (Sort comment test ab)",
                    source.invoice_number
                )),
                on_hold: false,
                expected_delivery_date: None,
                requisition_id: None,
                purchase_order_id: None,
                allocated_datetime: None,
                picked_datetime: None,
                shipped_datetime: None,
                delivered_datetime: None,
                received_datetime: None,
                verified_datetime: None,
                cancelled_datetime: None,
                backdated_datetime: None,
                linked_invoice_id: None,
                original_shipment_id: None,
                is_cancellation: false,
                ..source.clone()
            }
        );

        let source_lines = mock_outbound_shipment_a_invoice_lines();
        let new_lines = InvoiceLineRowRepository::new(&connection)
            .find_many_by_invoice_id(&new_invoice.id)
            .unwrap();
        assert_eq!(new_lines.len(), 1);
        assert!(new_lines.iter().all(|line| line.item_id != "item_b"));

        for new_line in &new_lines {
            let source_line = source_lines
                .iter()
                .find(|line| line.item_id == new_line.item_id)
                .unwrap();

            assert_ne!(new_line.id, source_line.id);
            assert_eq!(
                new_line,
                &InvoiceLineRow {
                    id: new_line.id.clone(),
                    invoice_id: new_invoice.id.clone(),
                    r#type: InvoiceLineType::UnallocatedStock,
                    stock_line_id: None,
                    location_id: None,
                    batch: None,
                    expiry_date: None,
                    cost_price_per_pack: 0.0,
                    sell_price_per_pack: 0.0,
                    total_before_tax: 0.0,
                    total_after_tax: 0.0,
                    tax_percentage: None,
                    foreign_currency_price_before_tax: None,
                    prescribed_quantity: None,
                    manufacture_date: None,
                    volume_per_pack: 0.0,
                    shipped_pack_size: None,
                    shipped_number_of_packs: None,
                    received_number_of_packs: None,
                    status: None,
                    vvm_status_id: None,
                    reason_option_id: None,
                    purchase_order_line_id: None,
                    linked_invoice_id: None,
                    linked_invoice_line_id: None,
                    ..source_line.clone()
                }
            );
        }
    }
}
