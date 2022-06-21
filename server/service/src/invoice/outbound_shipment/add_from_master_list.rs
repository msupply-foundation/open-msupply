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
            common::FullMockMasterList, mock_inbound_shipment_c, mock_item_a, mock_item_b,
            mock_item_c, mock_item_d, mock_name_store_c, mock_new_outbound_shipment_no_lines,
            mock_outbound_shipment_c, mock_outbound_shipment_no_lines,
            mock_outbound_shipment_shipped, mock_test_not_store_a_master_list, MockData,
            MockDataInserts,
        },
        test_db::{setup_all, setup_all_with_data},
        MasterListLineRow, MasterListNameJoinRow, MasterListRow,
    };
    use util::inline_init;

    use crate::{
        errors::AddFromMasterListError as ServiceError,
        invoice::outbound_shipment::AddFromMasterList, service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn add_from_master_list_errors() {
        let (_, _, connection_manager, _) =
            setup_all("add_from_master_list_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.invoice_service;

        // RecordDoesNotExist
        assert_eq!(
            service.add_from_master_list(
                &context,
                "store_a",
                AddFromMasterList {
                    outbound_shipment_id: "invalid".to_owned(),
                    master_list_id: "n/a".to_owned()
                },
            ),
            Err(ServiceError::RecordDoesNotExist)
        );

        // NotThisStore
        assert_eq!(
            service.add_from_master_list(
                &context,
                "store_b",
                AddFromMasterList {
                    outbound_shipment_id: mock_outbound_shipment_no_lines().id,
                    master_list_id: "n/a".to_owned()
                },
            ),
            Err(ServiceError::NotThisStore)
        );

        // CannotEditRecord
        assert_eq!(
            service.add_from_master_list(
                &context,
                "store_c",
                AddFromMasterList {
                    outbound_shipment_id: mock_outbound_shipment_shipped().id,
                    master_list_id: "n/a".to_owned()
                },
            ),
            Err(ServiceError::CannotEditRecord)
        );

        // RecordIsIncorrectType
        assert_eq!(
            service.add_from_master_list(
                &context,
                "store_a",
                AddFromMasterList {
                    outbound_shipment_id: mock_inbound_shipment_c().id,
                    master_list_id: "n/a".to_owned()
                },
            ),
            Err(ServiceError::RecordIsIncorrectType)
        );

        // MasterListNotFoundForThisStore
        assert_eq!(
            service.add_from_master_list(
                &context,
                "store_c",
                AddFromMasterList {
                    outbound_shipment_id: mock_outbound_shipment_c().id,
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
            let line4 = format!("{}4", id);

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
                    name_id: mock_name_store_c().id,
                }],
                lines: vec![
                    MasterListLineRow {
                        id: line1.clone(),
                        item_id: mock_item_a().id,
                        master_list_id: id.clone(),
                    },
                    MasterListLineRow {
                        id: line2.clone(),
                        item_id: mock_item_b().id,
                        master_list_id: id.clone(),
                    },
                    MasterListLineRow {
                        id: line3.clone(),
                        item_id: mock_item_c().id,
                        master_list_id: id.clone(),
                    },
                    MasterListLineRow {
                        id: line4.clone(),
                        item_id: mock_item_d().id,
                        master_list_id: id.clone(),
                    },
                ],
            }
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "add_from_master_list_success",
            MockDataInserts::all(),
            inline_init(|r: &mut MockData| {
                r.full_master_lists = vec![master_list()];
            }),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.invoice_service;

        let result: Vec<repository::InvoiceLineRow> = service
            .add_from_master_list(
                &context,
                "store_c",
                AddFromMasterList {
                    outbound_shipment_id: mock_new_outbound_shipment_no_lines().id,
                    master_list_id: master_list().master_list.id,
                },
            )
            .unwrap()
            .into_iter()
            .map(|line| line.invoice_line_row)
            .collect();

        let mut item_ids: Vec<String> = result
            .clone()
            .into_iter()
            .map(|invoice_line| invoice_line.item_id)
            .collect();
        item_ids.sort_by(|a, b| a.cmp(&b));

        let mut test_item_ids = vec![
            mock_item_a().id,
            mock_item_b().id,
            mock_item_c().id,
            mock_item_d().id,
        ];
        test_item_ids.sort_by(|a, b| a.cmp(&b));

        assert_eq!(item_ids, test_item_ids);
        let line = result
            .iter()
            .find(|line| line.item_id == mock_item_a().id)
            .unwrap();

        assert_eq!(line.number_of_packs, 0);
        assert_eq!(line.item_name, mock_item_a().name);
        assert_eq!(line.item_code, mock_item_a().code);

        let line = result
            .iter()
            .find(|line| line.item_id == mock_item_b().id)
            .unwrap();

        assert_eq!(line.number_of_packs, 0);
        assert_eq!(line.item_name, mock_item_b().name);
        assert_eq!(line.item_code, mock_item_b().code);
    }
}
