use crate::errors::AddFromMasterListError;
use crate::{
    invoice::check_invoice_exists, service_provider::ServiceContext,
    sync_processor::invoice::common::get_lines_for_invoice,
};
use repository::EqualFilter;
use repository::{
    InvoiceLine, InvoiceLineFilter, InvoiceLineRepository, InvoiceLineRow,
    InvoiceLineRowRepository, InvoiceRow, InvoiceRowStatus, InvoiceRowType, MasterList,
    MasterListFilter, MasterListLineFilter, MasterListLineRepository, MasterListRepository,
    RepositoryError, StorageConnection,
};

use super::generate_invoice_lines;

#[derive(Debug, PartialEq)]
pub struct AddFromMasterList {
    pub outbound_shipment_id: String,
    pub master_list_id: String,
}

type OutError = AddFromMasterListError;

pub fn add_from_master_list(
    ctx: &ServiceContext,
    store_id: &str,
    input: AddFromMasterList,
) -> Result<Vec<InvoiceLine>, OutError> {
    let invoice_lines = ctx
        .connection
        .transaction_sync(|connection| {
            let invoice_row = validate(connection, store_id, &input)?;
            let new_invoice_line_rows = generate(ctx, invoice_row, &input)?;

            let invoice_line_row_repository = InvoiceLineRowRepository::new(&connection);

            for invoice_line_row in new_invoice_line_rows {
                invoice_line_row_repository.upsert_one(&invoice_line_row)?;
            }

            match InvoiceLineRepository::new(connection).query_by_filter(
                InvoiceLineFilter::new()
                    .invoice_id(EqualFilter::equal_to(&input.outbound_shipment_id)),
            ) {
                Ok(lines) => Ok(lines),
                Err(error) => Err(OutError::DatabaseError(error)),
            }
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(invoice_lines)
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &AddFromMasterList,
) -> Result<InvoiceRow, OutError> {
    let invoice_row = match check_invoice_exists(&input.outbound_shipment_id, connection) {
        Ok(row) => row,
        Err(_error) => return Err(OutError::RecordDoesNotExist),
    };

    if invoice_row.store_id != store_id {
        return Err(OutError::NotThisStore);
    }

    if invoice_row.status != InvoiceRowStatus::New {
        return Err(OutError::CannotEditRecord);
    }

    if invoice_row.r#type != InvoiceRowType::OutboundShipment {
        return Err(OutError::RecordIsIncorrectType);
    }

    check_master_list_for_store(connection, store_id, &input.master_list_id)?
        .ok_or(OutError::MasterListNotFoundForThisStore)?;

    Ok(invoice_row)
}

fn generate(
    ctx: &ServiceContext,
    invoice_row: InvoiceRow,
    input: &AddFromMasterList,
) -> Result<Vec<InvoiceLineRow>, RepositoryError> {
    let invoice_lines = get_lines_for_invoice(&ctx.connection, &input.outbound_shipment_id)?;

    let item_ids_in_invoice: Vec<String> = invoice_lines
        .into_iter()
        .map(|invoice_line| invoice_line.item_id)
        .collect();

    let master_list_lines_not_in_invoice = MasterListLineRepository::new(&ctx.connection)
        .query_by_filter(
            MasterListLineFilter::new()
                .master_list_id(EqualFilter::equal_to(&input.master_list_id))
                .item_id(EqualFilter::not_equal_all(item_ids_in_invoice)),
        )?;

    let items_ids_not_in_invoice: Vec<String> = master_list_lines_not_in_invoice
        .into_iter()
        .map(|master_list_line| master_list_line.item_id)
        .collect();

    Ok(generate_invoice_lines(
        ctx,
        &invoice_row,
        items_ids_not_in_invoice,
    )?)
}

pub fn check_master_list_for_store(
    connection: &StorageConnection,
    store_id: &str,
    master_list_id: &str,
) -> Result<Option<MasterList>, RepositoryError> {
    let mut rows = MasterListRepository::new(connection).query_by_filter(
        MasterListFilter::new()
            .id(EqualFilter::equal_to(master_list_id))
            .exists_for_store_id(EqualFilter::equal_to(store_id)),
    )?;
    Ok(rows.pop())
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{
            common::FullMockMasterList,
            mock_draft_request_invoice_for_update_test,
            mock_draft_response_invoice_for_update_test, mock_item_a, mock_item_b, mock_item_c,
            mock_item_d, mock_name_store_a, mock_request_draft_invoice_calculation_test,
            mock_sent_request_invoice, mock_test_not_store_a_master_list,
            test_item_stats::{self},
            MockData, MockDataInserts,
        },
        test_db::{setup_all, setup_all_with_data},
        MasterListLineRow, MasterListNameJoinRow, MasterListRow,
    };
    use util::inline_init;

    use crate::{
        invoice::{
            common::get_lines_for_invoice,
            request_invoice::{AddFromMasterList, AddFromMasterListError as ServiceError},
        },
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn add_from_master_list_errors() {
        let (_, _, connection_manager, _) =
            setup_all("add_from_master_list_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.invoice_service;

        // InvoiceDoesNotExist
        assert_eq!(
            service.add_from_master_list(
                &context,
                "store_a",
                AddFromMasterList {
                    outbound_shipment_id: "invalid".to_owned(),
                    master_list_id: "n/a".to_owned()
                },
            ),
            Err(ServiceError::InvoiceDoesNotExist)
        );

        // NotThisStoreInvoice
        assert_eq!(
            service.add_from_master_list(
                &context,
                "store_b",
                AddFromMasterList {
                    outbound_shipment_id: mock_draft_request_invoice_for_update_test().id,
                    master_list_id: "n/a".to_owned()
                },
            ),
            Err(ServiceError::NotThisStoreInvoice)
        );

        // CannotEditInvoice
        assert_eq!(
            service.add_from_master_list(
                &context,
                "store_a",
                AddFromMasterList {
                    outbound_shipment_id: mock_sent_request_invoice().id,
                    master_list_id: "n/a".to_owned()
                },
            ),
            Err(ServiceError::CannotEditInvoice)
        );

        // NotARequestInvoice
        assert_eq!(
            service.add_from_master_list(
                &context,
                "store_a",
                AddFromMasterList {
                    outbound_shipment_id: mock_draft_response_invoice_for_update_test().id,
                    master_list_id: "n/a".to_owned()
                },
            ),
            Err(ServiceError::NotARequestInvoice)
        );

        // MasterListNotFoundForThisStore
        assert_eq!(
            service.add_from_master_list(
                &context,
                "store_a",
                AddFromMasterList {
                    outbound_shipment_id: mock_draft_request_invoice_for_update_test().id,
                    master_list_id: mock_test_not_store_a_master_list().master_list.id
                },
            ),
            Err(ServiceError::MasterListNotFoundForThisStore)
        );
    }

    #[actix_rt::test]
    async fn add_from_master_list_success() {
        fn master_list() -> FullMockMasterList {
            let id = "master_list".to_owned();
            let join1 = format!("{}1", id);
            let line1 = format!("{}1", id);
            let line2 = format!("{}2", id);
            let line3 = format!("{}3", id);

            FullMockMasterList {
                master_list: MasterListRow {
                    id: id.clone(),
                    name: id.clone(),
                    code: id.clone(),
                    description: id.clone(),
                },
                joins: vec![MasterListNameJoinRow {
                    id: join1,
                    master_list_id: id.clone(),
                    name_id: mock_name_store_a().id,
                }],
                lines: vec![
                    MasterListLineRow {
                        id: line1.clone(),
                        item_id: mock_item_a().id,
                        master_list_id: id.clone(),
                    },
                    MasterListLineRow {
                        id: line2.clone(),
                        item_id: test_item_stats::item().id,
                        master_list_id: id.clone(),
                    },
                    MasterListLineRow {
                        id: line3.clone(),
                        item_id: test_item_stats::item2().id,
                        master_list_id: id.clone(),
                    },
                ],
            }
        }

        let (_, connection, connection_manager, _) = setup_all_with_data(
            "add_from_master_list_success",
            MockDataInserts::all(),
            test_item_stats::mock_item_stats().join(inline_init(|r: &mut MockData| {
                r.full_master_lists = vec![master_list()];
            })),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.invoice_service;

        let result = service
            .add_from_master_list(
                &context,
                "store_a",
                AddFromMasterList {
                    outbound_shipment_id: mock_request_draft_invoice_calculation_test().invoice.id,
                    master_list_id: master_list().master_list.id,
                },
            )
            .unwrap();

        let lines = get_lines_for_invoice(
            &connection,
            &mock_request_draft_invoice_calculation_test().invoice.id,
        )
        .unwrap();

        assert_eq!(result, lines);

        let mut item_ids: Vec<String> = lines
            .clone()
            .into_iter()
            .map(|invoice_line| invoice_line.invoice_line_row.item_id)
            .collect();
        item_ids.sort_by(|a, b| a.cmp(&b));

        let mut test_item_ids = vec![
            mock_item_a().id,
            mock_item_b().id,
            mock_item_c().id,
            mock_item_d().id,
            test_item_stats::item().id,
            test_item_stats::item2().id,
        ];
        test_item_ids.sort_by(|a, b| a.cmp(&b));

        assert_eq!(item_ids, test_item_ids);
        let line = lines
            .iter()
            .find(|line| line.invoice_line_row.item_id == test_item_stats::item().id)
            .unwrap();

        assert_eq!(
            line.invoice_line_row.available_stock_on_hand,
            test_item_stats::item_1_soh() as i32
        );
        assert_eq!(
            line.invoice_line_row.average_monthly_consumption,
            test_item_stats::item1_amc_3_months() as i32
        );
        assert_eq!(
            line.invoice_line_row.suggested_quantity,
            // 10 = invoice max_mos
            test_item_stats::item1_amc_3_months() as i32 * 10
                - test_item_stats::item_1_soh() as i32
        );

        let line = lines
            .iter()
            .find(|line| line.invoice_line_row.item_id == test_item_stats::item2().id)
            .unwrap();

        assert_eq!(
            line.invoice_line_row.available_stock_on_hand,
            test_item_stats::item_2_soh() as i32
        );
        assert_eq!(
            line.invoice_line_row.average_monthly_consumption,
            test_item_stats::item2_amc_3_months() as i32
        );
        assert_eq!(
            line.invoice_line_row.suggested_quantity,
            // 10 = invoice max_mos
            test_item_stats::item2_amc_3_months() as i32 * 10
                - test_item_stats::item_2_soh() as i32
        );
    }
}
