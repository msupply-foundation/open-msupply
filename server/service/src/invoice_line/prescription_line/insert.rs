use crate::{
    invoice_line::{
        common_insert_line::{generate, validate, InsertInvoiceLine, InsertInvoiceLineError},
        query::get_invoice_line,
    },
    service_provider::ServiceContext,
};
use repository::{InvoiceLine, InvoiceLineRowRepository, InvoiceRowType, StockLineRowRepository};

type OutError = InsertInvoiceLineError;

pub fn insert_prescription_line(
    ctx: &ServiceContext,
    input: InsertInvoiceLine,
) -> Result<InvoiceLine, OutError> {
    let new_line = ctx
        .connection
        .transaction_sync(|connection| {
            let (item, invoice, batch) = validate(
                &input,
                &ctx.store_id,
                &connection,
                InvoiceRowType::Prescription,
            )?;
            let (new_line, update_batch) = generate(input, item, batch, invoice)?;
            InvoiceLineRowRepository::new(&connection).upsert_one(&new_line)?;
            StockLineRowRepository::new(&connection).upsert_one(&update_batch)?;
            get_invoice_line(ctx, &new_line.id)
                .map_err(|error| OutError::DatabaseError(error))?
                .ok_or(OutError::NewlyCreatedLineDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(new_line)
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{
            mock_item_b, mock_item_b_lines, mock_item_c, mock_item_c_lines, mock_prescription_a,
            mock_prescription_a_invoice_lines, mock_stock_line_a,
            mock_stock_line_location_is_on_hold, mock_stock_line_on_hold, mock_stock_line_si_d,
            mock_store_a, mock_store_b, MockDataInserts,
        },
        test_db::setup_all,
        InvoiceLineRow, InvoiceLineRowRepository, StockLineRowRepository,
    };
    use util::{inline_edit, inline_init};

    use crate::{
        invoice_line::{
            common_insert_line::InsertInvoiceLine,
            common_insert_line::InsertInvoiceLineError as ServiceError,
        },
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn insert_prescription_line_errors() {
        let (_, _, connection_manager, _) =
            setup_all("insert_prescription_line_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let mut context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_line_service;

        // LineAlreadyExists
        assert_eq!(
            service.insert_prescription_line(
                &context,
                inline_init(|r: &mut InsertInvoiceLine| {
                    r.id = mock_prescription_a_invoice_lines()[0].id.clone();
                    r.invoice_id = mock_prescription_a().id.clone();
                }),
            ),
            Err(ServiceError::LineAlreadyExists)
        );

        // ItemNotFound
        assert_eq!(
            service.insert_prescription_line(
                &context,
                inline_init(|r: &mut InsertInvoiceLine| {
                    r.id = "new prescription line id".to_string();
                    r.invoice_id = mock_prescription_a().id;
                    r.number_of_packs = 1.0;
                    r.stock_line_id = mock_item_b_lines()[0].id.clone();
                }),
            ),
            Err(ServiceError::ItemNotFound)
        );

        // InvoiceDoesNotExist
        assert_eq!(
            service.insert_prescription_line(
                &context,
                inline_init(|r: &mut InsertInvoiceLine| {
                    r.id = "new prescription line id".to_string();
                    r.invoice_id = "new invoice id".to_string();
                    r.item_id = mock_item_b_lines()[0].item_id.clone();
                    r.number_of_packs = 1.0;
                    r.stock_line_id = mock_item_b_lines()[0].id.clone();
                }),
            ),
            Err(ServiceError::InvoiceDoesNotExist)
        );

        // StockLineNotFound
        assert_eq!(
            service.insert_prescription_line(
                &context,
                inline_init(|r: &mut InsertInvoiceLine| {
                    r.id = "new prescription line id".to_string();
                    r.invoice_id = "invalid".to_string();
                    r.number_of_packs = 1.0;
                }),
            ),
            Err(ServiceError::StockLineNotFound)
        );

        // NumberOfPacksBelowOne
        assert_eq!(
            service.insert_prescription_line(
                &context,
                inline_init(|r: &mut InsertInvoiceLine| {
                    r.id = "new perscription id".to_string();
                    r.invoice_id = mock_prescription_a().id;
                    r.number_of_packs = 0.0;
                }),
            ),
            Err(ServiceError::NumberOfPacksBelowOne)
        );

        // LocationIsOnHold
        assert_eq!(
            service.insert_prescription_line(
                &context,
                inline_init(|r: &mut InsertInvoiceLine| {
                    r.id = "new prescription line id".to_string();
                    r.invoice_id = mock_prescription_a().id;
                    r.number_of_packs = 1.0;
                    r.stock_line_id = mock_stock_line_location_is_on_hold()[0].id.clone();
                    r.item_id = mock_stock_line_location_is_on_hold()[0].item_id.clone();
                }),
            ),
            Err(ServiceError::LocationIsOnHold)
        );

        // ItemDoesNotMatchStockLine
        assert_eq!(
            service.insert_prescription_line(
                &context,
                inline_init(|r: &mut InsertInvoiceLine| {
                    r.id = "new presciption line id".to_string();
                    r.invoice_id = mock_prescription_a().id;
                    r.number_of_packs = 1.0;
                    r.stock_line_id = mock_stock_line_a().id.clone();
                    r.item_id = mock_item_b().id.clone();
                }),
            ),
            Err(ServiceError::ItemDoesNotMatchStockLine)
        );

        // BatchIsOnHold
        assert_eq!(
            service.insert_prescription_line(
                &context,
                inline_init(|r: &mut InsertInvoiceLine| {
                    r.id = "new prescription line id".to_string();
                    r.invoice_id = mock_prescription_a().id;
                    r.number_of_packs = 1.0;
                    r.stock_line_id = mock_stock_line_on_hold()[0].id.clone();
                    r.item_id = mock_stock_line_on_hold()[0].item_id.clone();
                }),
            ),
            Err(ServiceError::BatchIsOnHold)
        );

        //StockLineAlreadyExistsInInvoice
        assert_eq!(
            service.insert_prescription_line(
                &context,
                inline_init(|r: &mut InsertInvoiceLine| {
                    r.id = "new prescription line id".to_string();
                    r.invoice_id = mock_prescription_a().id;
                    r.number_of_packs = 4.0;
                    r.stock_line_id = "stock_line_si_d_siline_a".to_string();
                    r.item_id = "item_a".to_string();
                }),
            ),
            Err(ServiceError::StockLineAlreadyExistsInInvoice(
                mock_prescription_a_invoice_lines()[0].id.clone()
            ))
        );

        // ReductionBelowZero
        assert_eq!(
            service.insert_prescription_line(
                &context,
                inline_init(|r: &mut InsertInvoiceLine| {
                    r.id = "new prescription line id".to_string();
                    r.invoice_id = mock_prescription_a().id;
                    r.number_of_packs = 40.0;
                    r.stock_line_id = mock_stock_line_a().id.clone();
                    r.item_id = mock_stock_line_a().item_id.clone();
                }),
            ),
            Err(ServiceError::ReductionBelowZero {
                stock_line_id: mock_stock_line_a().id.clone(),
            })
        );

        // NotThisStoreInvoice
        context.store_id = mock_store_b().id;
        assert_eq!(
            service.insert_prescription_line(
                &context,
                inline_init(|r: &mut InsertInvoiceLine| {
                    r.id = "new prescription line id".to_string();
                    r.invoice_id = mock_prescription_a().id;
                    r.number_of_packs = 1.0;
                    r.stock_line_id = mock_stock_line_si_d()[0].id.clone();
                    r.item_id = mock_stock_line_a().item_id.clone();
                }),
            ),
            Err(ServiceError::NotThisStoreInvoice)
        );
    }

    #[actix_rt::test]
    async fn insert_prescription_line_success() {
        let (_, connection, connection_manager, _) =
            setup_all("insert_prescription_line_success", MockDataInserts::all()).await;

        // helpers to compare total
        let stock_line_for_invoice_line = |invoice_line: &InvoiceLineRow| {
            let stock_line_id = invoice_line.stock_line_id.clone().unwrap();
            StockLineRowRepository::new(&connection)
                .find_one_by_id(&stock_line_id)
                .unwrap()
        };

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_line_service;

        let available_number_of_packs = StockLineRowRepository::new(&connection)
            .find_one_by_id(&mock_item_c_lines()[0].id.clone())
            .unwrap()
            .available_number_of_packs;

        service
            .insert_prescription_line(
                &context,
                inline_init(|r: &mut InsertInvoiceLine| {
                    r.id = "new prescription line id".to_string();
                    r.invoice_id = mock_prescription_a().id;
                    r.stock_line_id = mock_item_c_lines()[0].id.clone();
                    r.item_id = mock_item_c_lines()[0].item_id.clone();
                    r.number_of_packs = 1.0;
                    r.total_before_tax = Some(1.0);
                }),
            )
            .unwrap();
        let new_prescription_line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id("new prescription line id")
            .unwrap();
        let expected_available_stock =
            available_number_of_packs - new_prescription_line.number_of_packs;

        assert_eq!(
            new_prescription_line,
            inline_edit(&new_prescription_line, |mut u| {
                u.id = "new prescription line id".to_string();
                u.item_id = mock_item_c().id.clone();
                u.pack_size = 1;
                u.number_of_packs = 1.0;
                u
            })
        );
        assert_eq!(
            expected_available_stock,
            stock_line_for_invoice_line(&new_prescription_line).available_number_of_packs
        );
    }
}
