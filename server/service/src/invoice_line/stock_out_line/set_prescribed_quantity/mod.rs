use repository::{
    EqualFilter, InvoiceLine, InvoiceLineFilter, InvoiceLineRepository, InvoiceLineRowRepository,
    InvoiceLineType, RepositoryError,
};
use util::uuid::uuid;

use crate::{invoice_line::query::get_invoice_line, service_provider::ServiceContext};

mod generate;
use generate::generate;
mod validate;
use validate::validate;

#[derive(Clone, Debug, PartialEq, Default)]
pub struct SetPrescribedQuantity {
    pub invoice_id: String,
    pub item_id: String,
    pub prescribed_quantity: f64,
}

#[derive(Clone, Debug, PartialEq)]
pub enum SetPrescribedQuantityError {
    ItemNotFound, // check if valid item id
    InvoiceDoesNotExist,
    NotAStockItem,
    NotAPrescription,
    NotThisStoreInvoice,
    NewlyCreatedLineDoesNotExist,
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for SetPrescribedQuantityError {
    fn from(error: RepositoryError) -> Self {
        SetPrescribedQuantityError::DatabaseError(error)
    }
}

pub fn set_prescribed_quantity(
    ctx: &ServiceContext,
    input: SetPrescribedQuantity,
) -> Result<InvoiceLine, SetPrescribedQuantityError> {
    let invoice_line = ctx
        .connection
        .transaction_sync(|connection| {
            let item_row = validate(connection, &ctx.store_id, &input)?;

            let invoice_line_row_repo = InvoiceLineRowRepository::new(connection);

            let existing_lines = InvoiceLineRepository::new(connection).query_by_filter(
                InvoiceLineFilter::new()
                    .item_id(EqualFilter::equal_to(&input.item_id))
                    .invoice_id(EqualFilter::equal_to(&input.invoice_id)),
            )?;

            if existing_lines.len() > 1 {
                let has_prescribed_quantity_or_stock_line = existing_lines.iter().any(|line| {
                    line.invoice_line_row.prescribed_quantity.is_some()
                        || line.invoice_line_row.stock_line_id.is_some()
                });

                if has_prescribed_quantity_or_stock_line {
                    if let Some(unallocated_line) = existing_lines.iter().find(|line| {
                        line.invoice_line_row.r#type == InvoiceLineType::UnallocatedStock
                    }) {
                        invoice_line_row_repo.delete(&unallocated_line.invoice_line_row.id)?;
                    }
                }
            }

            let existing_line_with_stock = existing_lines
                .iter()
                .find(|line| line.invoice_line_row.stock_line_id.is_some());

            let new_line;
            if let Some(existing_line) = existing_line_with_stock {
                let mut updated_line = existing_line.clone();
                updated_line.invoice_line_row.prescribed_quantity = Some(input.prescribed_quantity);
                invoice_line_row_repo.upsert_one(&updated_line.invoice_line_row)?;
                new_line = updated_line.invoice_line_row
            } else {
                let invoice_line = generate(uuid(), item_row, input.clone())?;
                invoice_line_row_repo.upsert_one(&invoice_line)?;
                new_line = invoice_line;
            }

            get_invoice_line(ctx, &new_line.id)
                .map_err(SetPrescribedQuantityError::DatabaseError)?
                .ok_or(SetPrescribedQuantityError::NewlyCreatedLineDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(invoice_line)
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{
            mock_item_a, mock_prescription_a_invoice_line_a, mock_prescription_picked,
            mock_stock_line_a, mock_store_a, MockData, MockDataInserts,
        },
        test_db::{setup_all, setup_all_with_data},
        InvoiceLineRow, InvoiceLineType,
    };

    use crate::{
        invoice_line::stock_out_line::SetPrescribedQuantity, service_provider::ServiceProvider,
    };

    fn mark_prescription_unallocated_invoice_line() -> InvoiceLineRow {
        InvoiceLineRow {
            id: "test_invoice_line".to_string(),
            invoice_id: mock_prescription_picked().id,
            item_name: mock_item_a().name,
            item_code: mock_item_a().code,
            item_link_id: mock_item_a().id,
            r#type: InvoiceLineType::UnallocatedStock,
            prescribed_quantity: Some(10.0),
            stock_line_id: None,

            // default values
            pack_size: 0.0,
            number_of_packs: 0.0,
            total_before_tax: 0.0,
            total_after_tax: 0.0,
            tax_percentage: None,
            note: None,
            location_id: None,
            batch: None,
            expiry_date: None,
            sell_price_per_pack: 0.0,
            cost_price_per_pack: 0.0,
            inventory_adjustment_reason_id: None,
            return_reason_id: None,
            foreign_currency_price_before_tax: None,
            item_variant_id: None,
        }
    }

    fn mock_existing_stock_invoice_line() -> InvoiceLineRow {
        InvoiceLineRow {
            id: "existing_stock_invoice_line".to_string(),
            invoice_id: mock_prescription_picked().id,
            item_name: mock_item_a().name,
            item_code: mock_item_a().code,
            item_link_id: mock_item_a().id,
            r#type: InvoiceLineType::StockOut,
            prescribed_quantity: None,
            stock_line_id: Some(mock_stock_line_a().id),

            // default values
            pack_size: 0.0,
            number_of_packs: 0.0,
            total_before_tax: 0.0,
            total_after_tax: 0.0,
            tax_percentage: None,
            note: None,
            location_id: None,
            batch: None,
            expiry_date: None,
            sell_price_per_pack: 0.0,
            cost_price_per_pack: 0.0,
            inventory_adjustment_reason_id: None,
            return_reason_id: None,
            foreign_currency_price_before_tax: None,
            item_variant_id: None,
        }
    }

    #[actix_rt::test]
    async fn set_prescribed_quantity_no_item_line() {
        let (_, _, connection_manager, _) = setup_all_with_data(
            "set_prescribed_quantity_no_item_line",
            MockDataInserts::all(),
            MockData {
                invoice_lines: vec![mark_prescription_unallocated_invoice_line()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_line_service;

        let result = service.set_prescribed_quantity(
            &context,
            SetPrescribedQuantity {
                invoice_id: mark_prescription_unallocated_invoice_line().invoice_id,
                item_id: mark_prescription_unallocated_invoice_line().item_link_id,
                prescribed_quantity: 10.0,
            },
        );

        assert!(result.is_ok());

        let invoice_line = result.unwrap();

        assert_eq!(
            invoice_line.invoice_line_row.invoice_id,
            mark_prescription_unallocated_invoice_line().invoice_id
        );

        assert_eq!(
            invoice_line.invoice_line_row.item_link_id,
            mark_prescription_unallocated_invoice_line().item_link_id
        );

        assert_eq!(
            invoice_line.invoice_line_row.item_code,
            mark_prescription_unallocated_invoice_line().item_code
        );

        assert_eq!(
            invoice_line.invoice_line_row.item_name,
            mark_prescription_unallocated_invoice_line().item_name
        );

        assert_eq!(
            invoice_line.invoice_line_row.prescribed_quantity,
            mark_prescription_unallocated_invoice_line().prescribed_quantity
        );
    }

    #[actix_rt::test]
    async fn set_prescribed_quantity_existing_stock_line() {
        let (_, _, connection_manager, _) = setup_all(
            "set_prescribed_quantity_existing_stock_line",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_line_service;

        let result = service.set_prescribed_quantity(
            &context,
            SetPrescribedQuantity {
                invoice_id: mock_prescription_a_invoice_line_a().invoice_id,
                item_id: mock_prescription_a_invoice_line_a().item_link_id,
                prescribed_quantity: 10.0,
            },
        );

        assert!(result.is_ok());

        let invoice_line = result.unwrap();

        assert_eq!(
            invoice_line.invoice_line_row.invoice_id,
            mock_prescription_a_invoice_line_a().invoice_id
        );

        assert_eq!(
            invoice_line.invoice_line_row.item_link_id,
            mock_prescription_a_invoice_line_a().item_link_id
        );

        assert_eq!(
            invoice_line.invoice_line_row.item_code,
            mock_prescription_a_invoice_line_a().item_code
        );

        assert_eq!(
            invoice_line.invoice_line_row.item_name,
            mock_prescription_a_invoice_line_a().item_name
        );

        assert_eq!(
            invoice_line.invoice_line_row.prescribed_quantity,
            Some(10.0)
        );
    }

    #[actix_rt::test]
    async fn set_prescribed_quantity_multiple_lines_with_unallocated() {
        let (_, _, connection_manager, _) = setup_all_with_data(
            "set_prescribed_quantity_multiple_lines_with_unallocated",
            MockDataInserts::all(),
            MockData {
                invoice_lines: vec![
                    mark_prescription_unallocated_invoice_line(),
                    mock_existing_stock_invoice_line(),
                ],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_line_service;

        let result = service.set_prescribed_quantity(
            &context,
            SetPrescribedQuantity {
                invoice_id: mark_prescription_unallocated_invoice_line().invoice_id,
                item_id: mark_prescription_unallocated_invoice_line().item_link_id,
                prescribed_quantity: 10.0,
            },
        );

        assert!(result.is_ok());

        let invoice_line = result.unwrap();

        assert_eq!(
            invoice_line.invoice_line_row.invoice_id,
            mock_existing_stock_invoice_line().invoice_id
        );

        assert_eq!(
            invoice_line.invoice_line_row.item_link_id,
            mock_existing_stock_invoice_line().item_link_id
        );

        assert_eq!(
            invoice_line.invoice_line_row.item_code,
            mock_existing_stock_invoice_line().item_code
        );

        assert_eq!(
            invoice_line.invoice_line_row.item_name,
            mock_existing_stock_invoice_line().item_name
        );

        assert_eq!(
            invoice_line.invoice_line_row.prescribed_quantity,
            Some(10.0)
        );
    }
}
