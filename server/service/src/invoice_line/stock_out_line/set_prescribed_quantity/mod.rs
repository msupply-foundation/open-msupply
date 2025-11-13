use repository::{
    EqualFilter, InvoiceLine, InvoiceLineFilter, InvoiceLineRepository, InvoiceLineRow,
    InvoiceLineRowRepository, InvoiceLineType, ItemRow, RepositoryError,
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
    ItemNotFound,
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
                    .item_id(EqualFilter::equal_to(input.item_id.to_string()))
                    .invoice_id(EqualFilter::equal_to(input.invoice_id.to_string())),
            )?;

            let has_prescribed_quantity_or_stock_line = existing_lines.iter().any(|line| {
                line.invoice_line_row.prescribed_quantity.is_some()
                    || line.invoice_line_row.stock_line_id.is_some()
            });

            let unallocated_line = existing_lines
                .iter()
                .find(|line| line.invoice_line_row.r#type == InvoiceLineType::UnallocatedStock);

            // Remove the unallocated line if a proper allocated line exists.
            if existing_lines.len() > 1 && has_prescribed_quantity_or_stock_line {
                if let Some(unallocated_line) = unallocated_line {
                    invoice_line_row_repo.delete(&unallocated_line.invoice_line_row.id)?;
                }
            }

            // Find the line with a prescribed quantity
            let existing_line_with_prescribed_quantity = existing_lines
                .iter()
                .find(|line| line.invoice_line_row.prescribed_quantity.is_some());

            let new_line = match existing_line_with_prescribed_quantity {
                // Update the line that already has a prescribed quantity
                Some(existing_line) => update_prescribed_quantity(
                    existing_line,
                    input.prescribed_quantity,
                    &invoice_line_row_repo,
                )?,
                // Assign the prescribed quantity to a single line or create an unallocated line if none of them have it.
                None => handle_no_prescribed_quantity(
                    &existing_lines,
                    &item_row,
                    &input,
                    &invoice_line_row_repo,
                )?,
            };

            get_invoice_line(ctx, &new_line.id)
                .map_err(SetPrescribedQuantityError::DatabaseError)?
                .ok_or(SetPrescribedQuantityError::NewlyCreatedLineDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(invoice_line)
}

fn handle_no_prescribed_quantity(
    existing_lines: &[InvoiceLine],
    item_row: &ItemRow,
    input: &SetPrescribedQuantity,
    invoice_line_row_repo: &InvoiceLineRowRepository,
) -> Result<InvoiceLineRow, SetPrescribedQuantityError> {
    // Try to find the first line with a stock line ID
    match existing_lines
        .iter()
        .find(|line| line.invoice_line_row.stock_line_id.is_some())
    {
        Some(existing_line_with_stock) => update_prescribed_quantity(
            existing_line_with_stock,
            input.prescribed_quantity,
            invoice_line_row_repo,
        ),
        None => {
            // Create a new unallocated line for the prescription if no line with a stock line ID is found
            let new_invoice_line = generate(uuid(), item_row.clone(), input.clone())?;
            invoice_line_row_repo.upsert_one(&new_invoice_line)?;
            Ok(new_invoice_line)
        }
    }
}

fn update_prescribed_quantity(
    invoice_line: &InvoiceLine,
    prescribed_quantity: f64,
    invoice_line_row_repo: &InvoiceLineRowRepository,
) -> Result<InvoiceLineRow, SetPrescribedQuantityError> {
    let mut updated_line = invoice_line.clone();
    updated_line.invoice_line_row.prescribed_quantity = Some(prescribed_quantity);
    invoice_line_row_repo.upsert_one(&updated_line.invoice_line_row)?;
    Ok(updated_line.invoice_line_row)
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{
            mock_item_a, mock_item_b, mock_prescription_picked, mock_stock_line_a,
            mock_stock_line_b, mock_store_a, MockData, MockDataInserts,
        },
        test_db::setup_all_with_data,
        EqualFilter, InvoiceLineFilter, InvoiceLineRepository, InvoiceLineRow,
        InvoiceLineRowRepository, InvoiceLineType,
    };

    use crate::{
        invoice_line::stock_out_line::SetPrescribedQuantity, service_provider::ServiceProvider,
    };

    fn mock_prescription_unallocated_invoice_line() -> InvoiceLineRow {
        InvoiceLineRow {
            id: "unallocated_invoice_line".to_string(),
            invoice_id: mock_prescription_picked().id,
            item_name: mock_item_a().name,
            item_code: mock_item_a().code,
            item_link_id: mock_item_a().id,
            r#type: InvoiceLineType::UnallocatedStock,
            prescribed_quantity: Some(10.0),
            stock_line_id: None,
            ..Default::default()
        }
    }

    fn mock_prescription_invoice_line_a() -> InvoiceLineRow {
        InvoiceLineRow {
            id: "existing_stock_invoice_line_a".to_string(),
            invoice_id: mock_prescription_picked().id,
            item_name: mock_item_a().name,
            item_code: mock_item_a().code,
            item_link_id: mock_item_a().id,
            r#type: InvoiceLineType::StockOut,
            prescribed_quantity: Some(10.0),
            stock_line_id: Some(mock_stock_line_a().id),
            ..Default::default()
        }
    }

    fn mock_prescription_invoice_line_b() -> InvoiceLineRow {
        InvoiceLineRow {
            id: "existing_stock_invoice_line_b".to_string(),
            invoice_id: mock_prescription_picked().id,
            item_name: mock_item_a().name,
            item_code: mock_item_a().code,
            item_link_id: mock_item_a().id,
            r#type: InvoiceLineType::StockOut,
            stock_line_id: Some(mock_stock_line_b().id),
            ..Default::default()
        }
    }

    fn mock_prescription_invoice_line_c() -> InvoiceLineRow {
        InvoiceLineRow {
            id: "existing_stock_invoice_line_c".to_string(),
            invoice_id: mock_prescription_picked().id,
            item_name: mock_item_a().name,
            item_code: mock_item_a().code,
            item_link_id: mock_item_a().id,
            r#type: InvoiceLineType::StockOut,
            stock_line_id: Some(mock_stock_line_b().id), // TODO: should be different stock line ideally
            ..Default::default()
        }
    }

    #[actix_rt::test]
    async fn set_prescribed_quantity_no_stock_line() {
        let (_, _, connection_manager, _) = setup_all_with_data(
            "set_prescribed_quantity_no_stock_line",
            MockDataInserts::all(),
            MockData {
                invoice_lines: vec![mock_prescription_unallocated_invoice_line()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_line_service;

        let new_prescribed_quantity = 20.0;

        let result = service.set_prescribed_quantity(
            &context,
            SetPrescribedQuantity {
                invoice_id: mock_prescription_unallocated_invoice_line().invoice_id,
                item_id: mock_prescription_unallocated_invoice_line().item_link_id,
                prescribed_quantity: new_prescribed_quantity,
            },
        );

        assert!(result.is_ok());

        let repo = InvoiceLineRowRepository::new(&context.connection);

        let invoice_line = repo
            .find_one_by_id(&mock_prescription_unallocated_invoice_line().id)
            .unwrap()
            .unwrap();

        assert_eq!(
            invoice_line.invoice_id,
            mock_prescription_unallocated_invoice_line().invoice_id
        );
        assert_eq!(
            invoice_line.item_link_id,
            mock_prescription_unallocated_invoice_line().item_link_id
        );
        assert_eq!(
            invoice_line.item_code,
            mock_prescription_unallocated_invoice_line().item_code
        );
        assert_eq!(
            invoice_line.item_name,
            mock_prescription_unallocated_invoice_line().item_name
        );
        assert_eq!(
            invoice_line.prescribed_quantity,
            Some(new_prescribed_quantity)
        );

        let line_repo = InvoiceLineRepository::new(&context.connection);

        let filter = InvoiceLineFilter::new().invoice_id(EqualFilter::equal_to(mock_prescription_unallocated_invoice_line().invoice_id.to_string()));
        let line_count = line_repo.count(Some(filter.clone())).unwrap();
        assert_eq!(line_count, 1);

        // Check a new line gets created if one doesn't exist yet...
        let result = service.set_prescribed_quantity(
            &context,
            SetPrescribedQuantity {
                invoice_id: mock_prescription_unallocated_invoice_line().invoice_id,
                item_id: mock_item_b().id,
                prescribed_quantity: new_prescribed_quantity,
            },
        );

        assert!(result.is_ok());
        let invoice_line = result.unwrap();

        assert_eq!(
            invoice_line.invoice_line_row.prescribed_quantity,
            Some(new_prescribed_quantity)
        );

        let line_count = line_repo.count(Some(filter.clone())).unwrap();
        assert_eq!(line_count, 2);
    }

    #[actix_rt::test]
    async fn set_prescribed_quantity_existing_line_with_prescribed_quantity() {
        let (_, _, connection_manager, _) = setup_all_with_data(
            "set_prescribed_quantity_existing_line_with_prescribed_quantity",
            MockDataInserts::all(),
            MockData {
                invoice_lines: vec![
                    mock_prescription_invoice_line_a(),
                    mock_prescription_invoice_line_b(),
                    mock_prescription_invoice_line_c(),
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

        let new_prescribed_quantity = 55.0;

        let result = service.set_prescribed_quantity(
            &context,
            SetPrescribedQuantity {
                invoice_id: mock_prescription_invoice_line_a().invoice_id,
                item_id: mock_prescription_invoice_line_a().item_link_id,
                prescribed_quantity: new_prescribed_quantity,
            },
        );

        assert!(result.is_ok());

        let invoice_line = result.unwrap();

        // updates invoice line with existing prescribed quantity to updated prescribed quantity
        assert_eq!(
            invoice_line.invoice_line_row.invoice_id,
            mock_prescription_invoice_line_a().invoice_id
        );

        // doesn't update invoice lines that doesn't have prescribed quantity initially
        let line_row_repo = InvoiceLineRowRepository::new(&context.connection);
        let line_a = line_row_repo
            .find_one_by_id(&mock_prescription_invoice_line_a().id)
            .unwrap()
            .unwrap();
        assert_eq!(line_a.prescribed_quantity, Some(new_prescribed_quantity));
        let line_b = line_row_repo
            .find_one_by_id(&mock_prescription_invoice_line_b().id)
            .unwrap()
            .unwrap();

        assert_eq!(line_b.prescribed_quantity, None);

        let line_c = line_row_repo
            .find_one_by_id(&mock_prescription_invoice_line_c().id)
            .unwrap()
            .unwrap();

        assert_eq!(line_c.prescribed_quantity, None);
    }

    #[actix_rt::test]
    async fn set_prescribed_quantity_multiple_lines_with_unallocated() {
        let (_, _, connection_manager, _) = setup_all_with_data(
            "set_prescribed_quantity_multiple_lines_with_unallocated",
            MockDataInserts::all(),
            MockData {
                invoice_lines: vec![
                    mock_prescription_unallocated_invoice_line(),
                    mock_prescription_invoice_line_a(),
                    mock_prescription_invoice_line_b(),
                    mock_prescription_invoice_line_c(),
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

        let new_prescribed_quantity = 15.0;

        let result = service.set_prescribed_quantity(
            &context,
            SetPrescribedQuantity {
                invoice_id: mock_prescription_unallocated_invoice_line().invoice_id,
                item_id: mock_prescription_unallocated_invoice_line().item_link_id,
                prescribed_quantity: new_prescribed_quantity,
            },
        );

        assert!(result.is_ok());

        let line_row_repo = InvoiceLineRowRepository::new(&context.connection);

        // Check that the first allocated line gets the prescribed quantity
        let line_a = line_row_repo
            .find_one_by_id(&mock_prescription_invoice_line_a().id)
            .unwrap()
            .unwrap();
        assert_eq!(line_a.prescribed_quantity, Some(new_prescribed_quantity));

        // Check other lines don't have the prescribed quantity
        let line_b = line_row_repo
            .find_one_by_id(&mock_prescription_invoice_line_b().id)
            .unwrap()
            .unwrap();
        assert_eq!(line_b.prescribed_quantity, None);

        let line_c = line_row_repo
            .find_one_by_id(&mock_prescription_invoice_line_c().id)
            .unwrap()
            .unwrap();
        assert_eq!(line_c.prescribed_quantity, None);

        // Check that the unallocated line is deleted
        let result = service
            .get_invoice_line(&context, &mock_prescription_unallocated_invoice_line().id)
            .unwrap();

        assert!(result.is_none());
    }
}
