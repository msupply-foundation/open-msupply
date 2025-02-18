use repository::{
    InvoiceLine, InvoiceLineRowRepository, InvoiceRowRepository, RepositoryError,
    StockLineRowRepository,
};

mod validate;
use validate::{validate, ValidateResults};
mod generate;
use generate::{generate, GenerateResult};

use crate::service_provider::ServiceContext;

use super::query::get_invoice_line;

#[derive(Clone, Debug, Default, PartialEq)]
pub struct InsertFromInternalOrderLine {
    pub invoice_id: String,
    pub requisition_line_id: String,
}

#[derive(Debug, PartialEq, Clone)]
pub enum InsertFromInternalOrderLineError {
    InvoiceDoesNotExist,
    NotThisStoreInvoice,
    CannotEditFinalised,
    NotAnInboundShipment,
    RequisitionLineDoesNotExist,
    ItemDoesNotExist,
    RequisitionNotLinkedToInvoice,
    NewlyCreatedLineDoesNotExist,
    DatabaseError(RepositoryError),
}

pub fn insert_from_internal_order_line(
    ctx: &ServiceContext,
    input: InsertFromInternalOrderLine,
) -> Result<InvoiceLine, InsertFromInternalOrderLineError> {
    let new_line = ctx
        .connection
        .transaction_sync(|connection| {
            let ValidateResults {
                invoice: old_invoice,
                requisition_line,
                item,
            } = validate(connection, &ctx.store_id, &input)?;

            let GenerateResult {
                invoice,
                invoice_line,
                stock_line,
            } = generate(
                connection,
                &ctx.user_id,
                item,
                old_invoice,
                requisition_line,
            )?;

            StockLineRowRepository::new(connection).upsert_one(&stock_line)?;
            InvoiceLineRowRepository::new(connection).upsert_one(&invoice_line)?;

            if let Some(invoice_row) = invoice {
                InvoiceRowRepository::new(connection).upsert_one(&invoice_row)?;
            }

            get_invoice_line(ctx, &invoice_line.id)
                .map_err(InsertFromInternalOrderLineError::DatabaseError)?
                .ok_or(InsertFromInternalOrderLineError::NewlyCreatedLineDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(new_line)
}

impl From<RepositoryError> for InsertFromInternalOrderLineError {
    fn from(error: RepositoryError) -> Self {
        InsertFromInternalOrderLineError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{
            mock_item_a, mock_name_store_b, mock_outbound_shipment_e, mock_store_a, mock_store_b,
            mock_user_account_a, MockData, MockDataInserts,
        },
        test_db::setup_all_with_data,
        EqualFilter, InvoiceLine, InvoiceLineFilter, InvoiceLineRepository, InvoiceRow,
        InvoiceStatus, InvoiceType, RequisitionLineRow, RequisitionRow, StorePreferenceRow,
    };

    use crate::{
        invoice_line::inbound_shipment_from_internal_order_lines::{
            InsertFromInternalOrderLine, InsertFromInternalOrderLineError as ServiceError,
        },
        service_provider::ServiceProvider,
    };

    use super::insert_from_internal_order_line;

    fn store_pref() -> StorePreferenceRow {
        StorePreferenceRow {
            id: mock_store_a().id,
            manually_link_internal_order_to_inbound_shipment: true,
            ..Default::default()
        }
    }

    fn requisition_test() -> RequisitionRow {
        RequisitionRow {
            id: "requisition_test".to_string(),
            requisition_number: 5,
            name_link_id: mock_name_store_b().id,
            store_id: mock_store_a().id,
            ..Default::default()
        }
    }

    fn requisition_line_test() -> RequisitionLineRow {
        RequisitionLineRow {
            id: "requisition_line_test".to_string(),
            requisition_id: requisition_test().id,
            item_link_id: mock_item_a().id,
            requested_quantity: 5.0,
            ..Default::default()
        }
    }

    fn invoice_linked_to_requisition() -> InvoiceRow {
        InvoiceRow {
            id: "invoice_linked_to_requisition".to_string(),
            requisition_id: Some(requisition_test().id),
            store_id: mock_store_a().id,
            name_link_id: mock_name_store_b().id,
            status: InvoiceStatus::New,
            r#type: InvoiceType::InboundShipment,
            ..Default::default()
        }
    }

    #[actix_rt::test]
    async fn insert_from_internal_order_line_errors() {
        fn store_b_pref() -> StorePreferenceRow {
            StorePreferenceRow {
                id: mock_store_b().id,
                manually_link_internal_order_to_inbound_shipment: true,
                ..Default::default()
            }
        }

        fn finalised_invoice_linked_to_requisition() -> InvoiceRow {
            InvoiceRow {
                id: "finalised_invoice_linked_to_requisition".to_string(),
                requisition_id: Some(requisition_test().id),
                store_id: mock_store_a().id,
                name_link_id: mock_name_store_b().id,
                status: InvoiceStatus::Verified,
                r#type: InvoiceType::InboundShipment,
                ..Default::default()
            }
        }

        fn requisition_not_linked_to_invoice() -> RequisitionRow {
            RequisitionRow {
                id: "requisition_not_linked_to_invoice".to_string(),
                requisition_number: 5,
                name_link_id: mock_name_store_b().id,
                store_id: mock_store_a().id,
                ..Default::default()
            }
        }

        fn requisition_line_not_linked_to_invoice() -> RequisitionLineRow {
            RequisitionLineRow {
                id: "requisition_line_not_linked_to_invoice".to_string(),
                requisition_id: requisition_not_linked_to_invoice().id,
                item_link_id: mock_item_a().id,
                requested_quantity: 5.0,
                ..Default::default()
            }
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "insert_from_internal_order_line_errors",
            MockDataInserts::all(),
            MockData {
                store_preferences: vec![store_pref(), store_b_pref()],
                requisitions: vec![requisition_test(), requisition_not_linked_to_invoice()],
                requisition_lines: vec![
                    requisition_line_test(),
                    requisition_line_not_linked_to_invoice(),
                ],
                invoices: vec![
                    invoice_linked_to_requisition(),
                    finalised_invoice_linked_to_requisition(),
                ],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let mut context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();

        // InvoiceDoesNotExist
        assert_eq!(
            insert_from_internal_order_line(
                &context,
                InsertFromInternalOrderLine {
                    invoice_id: "invalid".to_string(),
                    requisition_line_id: requisition_line_test().id,
                }
            ),
            Err(ServiceError::InvoiceDoesNotExist)
        );

        // NotThisStoreInvoice
        context.store_id = mock_store_b().id;
        assert_eq!(
            insert_from_internal_order_line(
                &context,
                InsertFromInternalOrderLine {
                    invoice_id: invoice_linked_to_requisition().id,
                    requisition_line_id: requisition_line_test().id,
                }
            ),
            Err(ServiceError::NotThisStoreInvoice)
        );

        // CannotEditFinalised
        context.store_id = mock_store_a().id;
        assert_eq!(
            insert_from_internal_order_line(
                &context,
                InsertFromInternalOrderLine {
                    invoice_id: finalised_invoice_linked_to_requisition().id,
                    requisition_line_id: requisition_line_test().id,
                }
            ),
            Err(ServiceError::CannotEditFinalised)
        );

        // NotAnInboundShipment
        assert_eq!(
            insert_from_internal_order_line(
                &context,
                InsertFromInternalOrderLine {
                    invoice_id: mock_outbound_shipment_e().id,
                    requisition_line_id: requisition_line_test().id,
                }
            ),
            Err(ServiceError::NotAnInboundShipment)
        );

        // RequisitionLineDoesNotExist
        assert_eq!(
            insert_from_internal_order_line(
                &context,
                InsertFromInternalOrderLine {
                    invoice_id: invoice_linked_to_requisition().id,
                    requisition_line_id: "invalid".to_string(),
                }
            ),
            Err(ServiceError::RequisitionLineDoesNotExist)
        );

        // RequisitionNotLinkedToInvoice
        assert_eq!(
            insert_from_internal_order_line(
                &context,
                InsertFromInternalOrderLine {
                    invoice_id: invoice_linked_to_requisition().id,
                    requisition_line_id: requisition_line_not_linked_to_invoice().id,
                }
            ),
            Err(ServiceError::RequisitionNotLinkedToInvoice)
        );
    }

    #[actix_rt::test]
    async fn insert_from_internal_order_line_success() {
        let (_, connection, connection_manager, _) = setup_all_with_data(
            "insert_from_internal_order_line",
            MockDataInserts::all(),
            MockData {
                store_preferences: vec![store_pref()],
                requisitions: vec![requisition_test()],
                requisition_lines: vec![requisition_line_test()],
                invoices: vec![invoice_linked_to_requisition()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, mock_user_account_a().id)
            .unwrap();

        let result = insert_from_internal_order_line(
            &context,
            InsertFromInternalOrderLine {
                invoice_id: invoice_linked_to_requisition().id,
                requisition_line_id: requisition_line_test().id,
            },
        )
        .unwrap();

        let InvoiceLine {
            invoice_line_row: inbound_line,
            ..
        } = InvoiceLineRepository::new(&connection)
            .query_by_filter(
                InvoiceLineFilter::new()
                    .invoice_id(EqualFilter::equal_to(&invoice_linked_to_requisition().id)),
            )
            .unwrap()
            .pop()
            .unwrap();

        assert_eq!(result.invoice_line_row, inbound_line);
    }
}
