use crate::{
    invoice_line::{
        common_insert_update::{generate, validate, UpdateInvoiceLine, UpdateInvoiceLineError},
        query::get_invoice_line,
    },
    service_provider::ServiceContext,
};
use repository::{InvoiceLine, InvoiceLineRowRepository, InvoiceRowType, StockLineRowRepository};

type OutError = UpdateInvoiceLineError;

pub fn update_prescription_line(
    ctx: &ServiceContext,
    input: UpdateInvoiceLine,
) -> Result<InvoiceLine, OutError> {
    let updated_line = ctx
        .connection
        .transaction_sync(|connection| {
            let (line, item, batch_pair, invoice) = validate(
                &input,
                &ctx.store_id,
                &connection,
                InvoiceRowType::Prescription,
            )?;

            let (update_line, batch_pair) = generate(input, line, item, batch_pair, invoice)?;
            InvoiceLineRowRepository::new(&connection).upsert_one(&update_line)?;

            let stock_line_repo = StockLineRowRepository::new(&connection);
            stock_line_repo.upsert_one(&batch_pair.main_batch)?;
            if let Some(previous_batch) = batch_pair.previous_batch_option {
                stock_line_repo.upsert_one(&previous_batch)?;
            }

            get_invoice_line(ctx, &update_line.id)
                .map_err(|error| OutError::DatabaseError(error))?
                .ok_or(OutError::UpdatedLineDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(updated_line)
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{
            mock_inbound_shipment_a_invoice_lines, mock_item_a, mock_item_b, mock_prescription_a,
            mock_prescription_a_invoice_line_a, mock_prescription_a_invoice_lines,
            mock_prescription_picked, mock_prescription_verified, mock_stock_line_a,
            mock_stock_line_b, mock_stock_line_location_is_on_hold, mock_stock_line_on_hold,
            mock_stock_line_si_d, mock_store_a, mock_store_b, MockData, MockDataInserts,
        },
        test_db::setup_all_with_data,
        InvoiceLineRow, InvoiceLineRowRepository, StockLineRowRepository,
    };
    use util::{inline_edit, inline_init};

    use crate::{
        invoice_line::common_insert_update::{
            UpdateInvoiceLine, UpdateInvoiceLineError as ServiceError,
        },
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn update_prescription_line_errors() {
        fn verified_invoice_line() -> InvoiceLineRow {
            inline_init(|r: &mut InvoiceLineRow| {
                r.id = "verified".to_string();
                r.invoice_id = mock_prescription_verified().id.clone();
                r.item_id = mock_item_b().id.clone();
                r.stock_line_id = Some(mock_stock_line_b().id.clone());
                r.location_id = None;
                r.inventory_adjustment_reason_id = None;
            })
        }

        fn no_stock_line() -> InvoiceLineRow {
            inline_init(|r: &mut InvoiceLineRow| {
                r.id = "no_stock_line".to_string();
                r.invoice_id = mock_prescription_a().id.clone();
                r.item_id = mock_item_b().id.clone();
                r.stock_line_id = None;
                r.location_id = None;
                r.inventory_adjustment_reason_id = None;
            })
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "update_prescription_line_errors",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.invoice_lines = vec![verified_invoice_line(), no_stock_line()];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let mut context = service_provider
            .context(mock_store_b().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_line_service;

        // LineDoesNotExist
        assert_eq!(
            service.update_prescription_line(
                &context,
                inline_init(|r: &mut UpdateInvoiceLine| {
                    r.id = "invalid".to_string();
                }),
            ),
            Err(ServiceError::LineDoesNotExist)
        );

        // NotThisStoreInvoice
        assert_eq!(
            service.update_prescription_line(
                &context,
                inline_init(|r: &mut UpdateInvoiceLine| {
                    r.id = mock_prescription_a_invoice_line_a().id.clone();
                    r.number_of_packs = Some(10.0);
                }),
            ),
            Err(ServiceError::NotThisStoreInvoice)
        );

        // NotAPrescription
        context.store_id = mock_store_a().id;
        assert_eq!(
            service.update_prescription_line(
                &context,
                inline_init(|r: &mut UpdateInvoiceLine| {
                    r.id = mock_inbound_shipment_a_invoice_lines()[0].id.clone();
                }),
            ),
            Err(ServiceError::NotAPrescription)
        );

        // CannotEditFinalised
        assert_eq!(
            service.update_prescription_line(
                &context,
                inline_init(|r: &mut UpdateInvoiceLine| {
                    r.id = verified_invoice_line().id.clone();
                }),
            ),
            Err(ServiceError::CannotEditFinalised)
        );

        // LineDoesNotReferenceStockLine
        assert_eq!(
            service.update_prescription_line(
                &context,
                inline_init(|r: &mut UpdateInvoiceLine| {
                    r.id = no_stock_line().id.clone();
                }),
            ),
            Err(ServiceError::LineDoesNotReferenceStockLine)
        );

        // ItemNotFound
        assert_eq!(
            service.update_prescription_line(
                &context,
                inline_init(|r: &mut UpdateInvoiceLine| {
                    r.id = mock_prescription_a_invoice_lines()[0].id.clone();
                    r.item_id = Some("invalid".to_string());
                }),
            ),
            Err(ServiceError::ItemNotFound)
        );

        // StockLineNotFound
        assert_eq!(
            service.update_prescription_line(
                &context,
                inline_init(|r: &mut UpdateInvoiceLine| {
                    r.id = mock_prescription_a_invoice_lines()[0].id.clone();
                    r.stock_line_id = Some("invalid".to_string());
                }),
            ),
            Err(ServiceError::StockLineNotFound)
        );

        // NumberOfPacksBelowOne
        assert_eq!(
            service.update_prescription_line(
                &context,
                inline_init(|r: &mut UpdateInvoiceLine| {
                    r.id = mock_prescription_a_invoice_lines()[0].id.clone();
                    r.number_of_packs = Some(0.0);
                }),
            ),
            Err(ServiceError::NumberOfPacksBelowOne)
        );

        // ItemDoesNotMatchStockLine
        assert_eq!(
            service.update_prescription_line(
                &context,
                inline_init(|r: &mut UpdateInvoiceLine| {
                    r.id = mock_prescription_a_invoice_lines()[0].id.clone();
                    r.item_id = Some(mock_item_b().id.clone());
                    r.stock_line_id = Some(mock_stock_line_a().id.clone());
                }),
            ),
            Err(ServiceError::ItemDoesNotMatchStockLine)
        );

        // LocationIsOnHold
        assert_eq!(
            service.update_prescription_line(
                &context,
                inline_init(|r: &mut UpdateInvoiceLine| {
                    r.id = mock_prescription_a_invoice_lines()[0].id.clone();
                    r.item_id = Some(mock_stock_line_location_is_on_hold()[0].item_id.clone());
                    r.stock_line_id = Some(mock_stock_line_location_is_on_hold()[0].id.clone());
                }),
            ),
            Err(ServiceError::LocationIsOnHold)
        );

        // BatchIsOnHold
        assert_eq!(
            service.update_prescription_line(
                &context,
                inline_init(|r: &mut UpdateInvoiceLine| {
                    r.id = mock_prescription_a_invoice_lines()[0].id.clone();
                    r.stock_line_id = Some(mock_stock_line_on_hold()[0].id.clone());
                    r.item_id = Some(mock_stock_line_on_hold()[0].item_id.clone());
                }),
            ),
            Err(ServiceError::BatchIsOnHold)
        );

        // ReductionBelowZero
        assert_eq!(
            service.update_prescription_line(
                &context,
                inline_init(|r: &mut UpdateInvoiceLine| {
                    r.id = mock_prescription_a_invoice_lines()[0].id.clone();
                    r.number_of_packs = Some(100.0);
                }),
            ),
            Err(ServiceError::ReductionBelowZero {
                stock_line_id: mock_prescription_a_invoice_lines()[0]
                    .stock_line_id
                    .clone()
                    .unwrap(),
                line_id: mock_prescription_a_invoice_lines()[0].id.clone(),
            })
        );

        // StockLineAlreadyExistsInInvoice
        assert_eq!(
            service.update_prescription_line(
                &context,
                inline_init(|r: &mut UpdateInvoiceLine| {
                    r.id = mock_prescription_a_invoice_lines()[0].id.clone();
                    r.stock_line_id = Some(mock_stock_line_si_d()[1].id.clone());
                }),
            ),
            Err(ServiceError::StockLineAlreadyExistsInInvoice(
                mock_prescription_a_invoice_lines()[1].id.clone()
            ))
        );
    }

    #[actix_rt::test]
    async fn update_outbound_shipment_line_success() {
        fn picked_invoice_line() -> InvoiceLineRow {
            inline_init(|r: &mut InvoiceLineRow| {
                r.id = "picked invoice line".to_string();
                r.invoice_id = mock_prescription_picked().id.clone();
                r.item_id = mock_item_a().id.clone();
                r.stock_line_id = Some(mock_stock_line_si_d()[0].id.clone());
                r.number_of_packs = 10.0;
                r.pack_size = 1;
            })
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "update_prescription_line_success",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.invoice_lines = vec![picked_invoice_line()];
            }),
        )
        .await;

        // helpers to compare total
        let stock_line_for_invoice_line = |invoice_line: &InvoiceLineRow| {
            let stock_line_id = invoice_line.stock_line_id.as_ref().unwrap();
            StockLineRowRepository::new(&connection)
                .find_one_by_id(&stock_line_id)
                .unwrap()
        };

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_line_service;

        // New line
        let previous_available_number_of_packs = StockLineRowRepository::new(&connection)
            .find_one_by_id(
                &mock_prescription_a_invoice_lines()[0]
                    .stock_line_id
                    .clone()
                    .unwrap(),
            )
            .unwrap()
            .available_number_of_packs;

        // Line before update
        let previous_line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id(&mock_prescription_a_invoice_lines()[0].id.clone())
            .unwrap();

        service
            .update_prescription_line(
                &context,
                inline_init(|r: &mut UpdateInvoiceLine| {
                    r.id = mock_prescription_a_invoice_lines()[0].id.clone();
                    r.number_of_packs = Some(2.0);
                    r.total_before_tax = Some(18.00);
                }),
            )
            .unwrap();

        let prescription_line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id(&mock_prescription_a_invoice_lines()[0].id.clone())
            .unwrap();
        let expected_available_number_of_packs = previous_available_number_of_packs
            + previous_line.number_of_packs
            - prescription_line.number_of_packs;

        assert_eq!(
            prescription_line,
            inline_edit(&mock_prescription_a_invoice_lines()[0], |mut u| {
                u.id = mock_prescription_a_invoice_lines()[0].id.clone();
                u.number_of_packs = 2.0;
                u.total_before_tax = 18.00;
                u.total_after_tax = 18.00;
                u
            })
        );
        assert_eq!(
            expected_available_number_of_packs,
            stock_line_for_invoice_line(&prescription_line).available_number_of_packs
        );

        // Update line for Picked invoices
        let previous_totals = StockLineRowRepository::new(&connection)
            .find_one_by_id(&picked_invoice_line().stock_line_id.clone().unwrap())
            .unwrap();
        let previous_line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id(&picked_invoice_line().id.clone())
            .unwrap();

        service
            .update_prescription_line(
                &context,
                inline_init(|r: &mut UpdateInvoiceLine| {
                    r.id = picked_invoice_line().id.clone();
                    r.number_of_packs = Some(15.0);
                    r.total_before_tax = Some(10.99);
                }),
            )
            .unwrap();
        let picked_line = InvoiceLineRowRepository::new(&connection)
            .find_one_by_id(&picked_invoice_line().id.clone())
            .unwrap();
        let expected_available_number_of_packs = previous_totals.available_number_of_packs
            + previous_line.number_of_packs
            - picked_line.number_of_packs;
        let expected_total_number_of_packs = previous_totals.total_number_of_packs
            + previous_line.number_of_packs
            - picked_line.number_of_packs;

        assert_eq!(
            expected_available_number_of_packs,
            stock_line_for_invoice_line(&picked_line).available_number_of_packs
        );
        assert_eq! {
            expected_total_number_of_packs,
            stock_line_for_invoice_line(&picked_line).total_number_of_packs
        }
    }
}
