use crate::{service_provider::ServiceContext, ListError, ListResult};
use repository::{
    EqualFilter, InvoiceLine, InvoiceLineFilter, InvoiceLineRepository, InvoiceLineRow,
    RepositoryError, StockLine, StockLineFilter, StockLineRepository,
};
use util::uuid::uuid;

#[derive(Debug, Clone, PartialEq)]
pub struct OutboundReturnLine {
    pub id: String,
    pub reason_id: Option<String>,
    pub note: Option<String>,
    pub number_of_packs: f64,
    pub available_number_of_packs: f64,
    pub stock_line: StockLine,
}

#[derive(Debug, Clone)]
pub struct GenerateOutboundReturnLinesInput {
    pub stock_line_ids: Vec<String>,
    pub item_id: Option<String>,
    pub return_id: Option<String>,
}

pub fn generate_outbound_return_lines(
    ctx: &ServiceContext,
    store_id: &str,
    GenerateOutboundReturnLinesInput {
        stock_line_ids,
        item_id,
        return_id,
    }: GenerateOutboundReturnLinesInput,
) -> Result<ListResult<OutboundReturnLine>, ListError> {
    // If a return_id is provided, get all existing lines for the provided stock_line_ids and item_id
    let existing_return_lines =
        get_existing_return_lines(ctx, return_id, &stock_line_ids, &item_id)?;

    // Add stock line ids from existing_return_lines
    let stock_line_ids = stock_line_ids
        .into_iter()
        .chain(
            existing_return_lines
                .iter()
                // get_existing_return_lines will throw an erro if stock_line_id does not exist on invoice_line
                .filter_map(|l| l.invoice_line_row.stock_line_id.clone()),
        )
        .collect();

    // Get stock lines for any stock_line_ids passed in, regardless of whether that stock line is currently available
    let from_stock_line_ids = stock_lines_from_stock_line_ids(ctx, store_id, &stock_line_ids)?;

    // If an item id is provided, get each stock line where stock is available (will also exclude stock_line_ids)
    let from_item_id = stock_lines_for_item_id(ctx, store_id, &item_id, stock_line_ids)?;

    // At this point should have all stock lines, from input and from existing return_lines, iterate over them create
    // iterator with this shape (Option<OutboundInvoiceLine>, StockLine), so they can be mapped with outbound_line_from_stock_line_and_invoice_line
    let all_stock_lines = from_stock_line_ids.into_iter().chain(from_item_id);
    let match_stock_line_to_invoice_line = |sl: &StockLine, il: &InvoiceLine| -> bool {
        il.invoice_line_row.stock_line_id.as_ref() == Some(&sl.stock_line_row.id)
    };
    let stock_line_and_outbound_line = all_stock_lines.map(|stock_line| {
        let invoice_line = existing_return_lines
            .iter()
            .find(|invoice_line| match_stock_line_to_invoice_line(&stock_line, invoice_line));
        (invoice_line.cloned(), stock_line)
    });

    // Map iterator over (Option<OutboundInvoiceLine>, StockLine) to Vec<OutboundReturnLine>
    let return_lines: Vec<OutboundReturnLine> = stock_line_and_outbound_line
        .map(outbound_line_from_stock_line_and_invoice_line)
        .collect();

    Ok(ListResult {
        count: return_lines.len() as u32,
        rows: return_lines,
    })
}

fn stock_lines_from_stock_line_ids(
    ctx: &ServiceContext,
    store_id: &str,
    stock_line_ids: &Vec<String>,
) -> Result<Vec<StockLine>, RepositoryError> {
    let stock_line_repo = StockLineRepository::new(&ctx.connection);

    let filter = StockLineFilter::new().id(EqualFilter::equal_any(stock_line_ids.clone()));

    stock_line_repo.query_by_filter(filter, Some(store_id.to_string()))
}

fn stock_lines_for_item_id(
    ctx: &ServiceContext,
    store_id: &str,
    item_id: &Option<String>,
    stock_line_ids_to_exclude: Vec<String>,
) -> Result<Vec<StockLine>, RepositoryError> {
    let stock_line_repo = StockLineRepository::new(&ctx.connection);

    match item_id {
        Some(item_id) => {
            let filter = StockLineFilter::new()
                .item_id(EqualFilter::equal_to(item_id))
                .id(EqualFilter::not_equal_all(stock_line_ids_to_exclude))
                .store_id(EqualFilter::equal_to(store_id))
                .is_available(true);

            stock_line_repo.query_by_filter(filter, None)
        }
        None => Ok(vec![]),
    }
}

fn get_existing_return_lines(
    ctx: &ServiceContext,
    return_id: Option<String>,
    stock_line_ids: &Vec<String>,
    item_id: &Option<String>,
) -> Result<Vec<InvoiceLine>, RepositoryError> {
    let Some(return_id) = return_id else {
        return Ok(vec![]);
    };
    let base_filter = InvoiceLineFilter::new().invoice_id(EqualFilter::equal_to(&return_id));
    let repo = InvoiceLineRepository::new(&ctx.connection);

    let lines_by_stock_line = repo.query_by_filter(
        base_filter
            .clone()
            .stock_line_id(EqualFilter::equal_any(stock_line_ids.clone())),
    )?;

    // We can't just filter by stock lines alone, since not available stock lines for item will not be included
    // but they could already exist in current invoice
    let Some(item_id) = item_id else {
        return Ok(lines_by_stock_line);
    };

    let lines_by_item_id =
        repo.query_by_filter(base_filter.clone().item_id(EqualFilter::equal_to(item_id)))?;

    let all_lines = lines_by_stock_line.into_iter().chain(lines_by_item_id);

    // Do sanity check to ensure all invoice lines have stock_line_id
    let result = all_lines
        .map(|l| match &l.invoice_line_row.stock_line_id {
            Some(_) => Ok(l),
            None => Err(RepositoryError::as_db_error(
                "Invoice line has no stock line ID",
                "",
            )),
        })
        .collect::<Result<_, _>>()?;

    Ok(result)
}

fn outbound_line_from_stock_line_and_invoice_line(
    (invoice_line, stock_line): (Option<InvoiceLine>, StockLine),
) -> OutboundReturnLine {
    let Some(invoice_line) = invoice_line else {
        return OutboundReturnLine {
            id: uuid(),
            reason_id: None,
            note: None,
            number_of_packs: 0.0,
            available_number_of_packs: stock_line.stock_line_row.available_number_of_packs,
            stock_line,
        };
    };

    let InvoiceLineRow {
        id,
        return_reason_id,
        note,
        number_of_packs,
        ..
    } = invoice_line.invoice_line_row;

    // Quantity available for return should include the number of packs already in the return
    // (Available stock is reduced as soon as it is added to a return)
    let number_of_packs_available_to_return =
        stock_line.stock_line_row.available_number_of_packs + number_of_packs;

    OutboundReturnLine {
        id,
        note,
        number_of_packs,
        reason_id: return_reason_id,
        available_number_of_packs: number_of_packs_available_to_return,
        stock_line,
    }
}
#[cfg(test)]
mod test {
    use crate::{service_provider::ServiceProvider, ListError};
    use repository::{
        mock::{
            mock_item_a, mock_outbound_return_a, mock_outbound_return_a_invoice_line_a,
            mock_outbound_return_b, mock_stock_line_a, mock_stock_line_b, mock_stock_line_ci_c,
            mock_store_a, MockData, MockDataInserts,
        },
        test_db::{setup_all, setup_all_with_data},
        InvoiceLineRow, ItemRow, ItemType, RepositoryError, StockLineRow,
    };

    type ServiceInput = super::GenerateOutboundReturnLinesInput;

    #[actix_rt::test]
    async fn generate_outbound_return_lines_errors() {
        fn no_stock_line() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "no_stock_line".to_string(),
                invoice_id: mock_outbound_return_a().id,
                item_link_id: mock_item_a().id,
                ..Default::default()
            }
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "generate_outbound_return_lines_errors",
            MockDataInserts::all(),
            MockData {
                invoice_lines: vec![no_stock_line()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.invoice_service;

        let store_id = mock_store_a().id;
        let stock_line_ids = vec![];
        let item_id = Some(mock_item_a().id);
        let return_id = Some(mock_outbound_return_a().id);

        // Return invoice doesn't have an associated stock_line
        assert_eq!(
            service.generate_outbound_return_lines(
                &context,
                &store_id,
                ServiceInput {
                    stock_line_ids,
                    item_id,
                    return_id,
                },
            ),
            Err(ListError::DatabaseError(RepositoryError::as_db_error(
                "Invoice line has no stock line ID",
                ""
            )))
        );
    }

    #[actix_rt::test]
    async fn generate_outbound_return_lines_nothing_supplied() {
        let (_, _, connection_manager, _) = setup_all(
            "generate_outbound_return_lines_nothing_supplied",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.invoice_service;

        let store_id = "store_a";
        let stock_line_ids = vec![];
        let item_id = None;
        let return_id = Some(mock_outbound_return_a().id);

        let result = service
            .generate_outbound_return_lines(
                &context,
                store_id,
                ServiceInput {
                    stock_line_ids,
                    item_id,
                    return_id,
                },
            )
            .unwrap();

        assert_eq!(result.count, 0);
    }

    #[actix_rt::test]
    async fn generate_outbound_return_lines_only_return_id() {
        let (_, _, connection_manager, _) = setup_all(
            "generate_outbound_return_lines_only_return_id",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.invoice_service;

        let store_id = "store_a";
        let stock_line_ids = vec![];
        let item_id = None;
        let return_id = None;

        let result = service
            .generate_outbound_return_lines(
                &context,
                store_id,
                ServiceInput {
                    stock_line_ids,
                    item_id,
                    return_id,
                },
            )
            .unwrap();

        assert_eq!(result.count, 0);
    }

    #[actix_rt::test]
    async fn generate_outbound_return_lines_stock_line_ids() {
        let (_, _, connection_manager, _) = setup_all(
            "generate_outbound_return_lines_stock_line_ids",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.invoice_service;

        let store_id = "store_a";
        let stock_line_ids = vec![mock_stock_line_a().id, mock_stock_line_b().id];
        let item_id = None;
        let return_id = None;

        let result = service
            .generate_outbound_return_lines(
                &context,
                store_id,
                ServiceInput {
                    stock_line_ids,
                    item_id,
                    return_id,
                },
            )
            .unwrap();

        assert_eq!(result.count, 2);

        let return_line_for_stock_line_a = result
            .rows
            .iter()
            .find(|line| line.stock_line.stock_line_row.id == mock_stock_line_a().id)
            .unwrap();

        assert_eq!(return_line_for_stock_line_a.number_of_packs, 0.0);
        assert_eq!(return_line_for_stock_line_a.available_number_of_packs, 30.0);
        // available on stock_line_a
    }

    #[actix_rt::test]
    async fn generate_outbound_return_lines_item_id() {
        let (_, _, connection_manager, _) = setup_all(
            "generate_outbound_return_lines_item_id",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.invoice_service;

        let store_id = "store_a";
        let stock_line_ids = vec![];
        let item_id = Some("item_query_test1".to_string());
        let return_id = None;

        let result = service
            .generate_outbound_return_lines(
                &context,
                store_id,
                ServiceInput {
                    stock_line_ids,
                    item_id,
                    return_id,
                },
            )
            .unwrap();

        assert_eq!(result.count, 1);
        assert_eq!(
            result.rows[0].stock_line.stock_line_row.id,
            "item_query_test1"
        );
    }

    #[actix_rt::test]
    async fn generate_outbound_return_lines_item_id_stock_belongs_to_multiple_stores() {
        fn test_item() -> ItemRow {
            ItemRow {
                id: "test_item".to_string(),
                r#type: ItemType::Stock,
                default_pack_size: 1.0,
                ..Default::default()
            }
        }

        fn stock_line_store_a() -> StockLineRow {
            StockLineRow {
                id: "stock_line_store_a".to_string(),
                item_link_id: "test_item".to_string(),
                store_id: "store_a".to_string(),
                available_number_of_packs: 5.0,
                ..Default::default()
            }
        }
        fn stock_line_store_b() -> StockLineRow {
            StockLineRow {
                id: "stock_line_store_b".to_string(),
                item_link_id: "test_item".to_string(),
                store_id: "store_b".to_string(),
                available_number_of_packs: 5.0,
                ..Default::default()
            }
        }

        let (_, _, connection_manager, _) = setup_all_with_data(
            "generate_inbound_return_lines_item_id_and_return_id",
            MockDataInserts::all(),
            MockData {
                items: vec![test_item()],
                stock_lines: vec![stock_line_store_a(), stock_line_store_b()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.invoice_service;

        let store_id = mock_store_a().id;
        let stock_line_ids = vec![];
        let item_id = Some(test_item().id);
        let return_id = None;

        let result = service
            .generate_outbound_return_lines(
                &context,
                &store_id,
                ServiceInput {
                    stock_line_ids,
                    item_id,
                    return_id,
                },
            )
            .unwrap();

        // the stock test_item stock line for store B should not be included!
        assert_eq!(result.rows.len(), 1);
        assert_eq!(
            result.rows[0].stock_line.stock_line_row.id,
            stock_line_store_a().id
        );
    }

    #[actix_rt::test]
    async fn generate_outbound_return_lines_item_id_and_return_id() {
        fn unavailable_stock_line() -> StockLineRow {
            StockLineRow {
                id: "unavailable_stock_line".to_string(),
                item_link_id: "item_a".to_string(),
                store_id: "store_a".to_string(),
                available_number_of_packs: 0.0,
                ..Default::default()
            }
        }
        // add a line to mock_outbound_return_a with a stock line that has no more available packs
        fn item_a_return_line() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "item_a_return_line".to_string(),
                invoice_id: mock_outbound_return_a().id,
                item_link_id: mock_item_a().id,
                stock_line_id: Some(unavailable_stock_line().id),
                number_of_packs: 1.0,
                note: Some("test note".to_string()),
                ..Default::default()
            }
        }
        let (_, _, connection_manager, _) = setup_all_with_data(
            "generate_outbound_return_lines_item_id_and_return_id",
            MockDataInserts::all(),
            MockData {
                stock_lines: vec![unavailable_stock_line()],
                invoice_lines: vec![item_a_return_line()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.invoice_service;

        let store_id = mock_store_a().id;
        let stock_line_ids = vec![];
        let item_id = Some(mock_item_a().id);
        let return_id = Some(mock_outbound_return_a().id);

        let result = service
            .generate_outbound_return_lines(
                &context,
                &store_id,
                ServiceInput {
                    stock_line_ids,
                    item_id,
                    return_id,
                },
            )
            .unwrap();

        // all are item_a stock lines
        // the return has item_b lines, but these should not be included here
        assert!(result
            .rows
            .iter()
            .all(|line| line.stock_line.item_row.id == mock_item_a().id));

        // the stock line that is already in the return should be included, even though it
        // has no available packs
        // it should also have the correct number of packs/note/return_reason_id mapped
        // println!("{:#?}", result);
        let existing_line = result
            .rows
            .iter()
            .find(|l| l.stock_line.stock_line_row.id == unavailable_stock_line().id);

        assert!(existing_line.is_some());
        let existing_line = existing_line.unwrap();

        assert_eq!(existing_line.id, item_a_return_line().id);
        assert_eq!(
            existing_line.stock_line.stock_line_row.id,
            unavailable_stock_line().id
        );
        assert_eq!(existing_line.note, item_a_return_line().note);
        assert_eq!(existing_line.number_of_packs, 1.0);
        assert_eq!(existing_line.available_number_of_packs, 1.0); // num of packs in stock line (0.0) + num of packs in return (1.0)

        assert!(result.rows.iter().all(|line| {
            // all lines have available packs (even if no further available stock, packs already included in the return are counted as available here)
            line.available_number_of_packs > 0.0
        }));
    }

    #[actix_rt::test]
    async fn generate_outbound_return_lines_stock_line_ids_and_return_id() {
        let (_, _, connection_manager, _) = setup_all(
            "generate_outbound_return_lines_stock_line_ids_and_return_id",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.invoice_service;

        let store_id = mock_store_a().id;
        let stock_line_ids = vec![mock_stock_line_a().id, mock_stock_line_ci_c()[0].id.clone()];
        let item_id = None;
        let return_id = Some(mock_outbound_return_a().id); // has a stock_line_a line

        let result = service
            .generate_outbound_return_lines(
                &context,
                &store_id,
                ServiceInput {
                    stock_line_ids,
                    item_id,
                    return_id,
                },
            )
            .unwrap();

        assert_eq!(result.rows.len(), 2);

        // the stock line that is already in the return should be included
        // it should be the first line in the result
        let existing_line = &result.rows[0];
        assert_eq!(
            existing_line.stock_line.stock_line_row.id,
            mock_stock_line_a().id
        );
        assert_eq!(
            existing_line.number_of_packs,
            mock_outbound_return_a_invoice_line_a().number_of_packs
        );

        let new_line = &result.rows[1];
        assert_eq!(
            new_line.stock_line.stock_line_row.id,
            mock_stock_line_ci_c()[0].id
        );
        assert_eq!(new_line.number_of_packs, 0.0);
    }

    #[actix_rt::test]
    async fn generate_outbound_return_lines_dedupes_existing_lines() {
        let (_, _, connection_manager, _) = setup_all(
            "generate_outbound_return_lines_dedupes_existing_lines",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.invoice_service;

        let store_id = mock_store_a().id;

        let stock_line_ids = vec![mock_stock_line_a().id]; // has item_id of item_a
        let item_id = Some(mock_item_a().id);
        let return_id = Some(mock_outbound_return_b().id); // has stock_line_a

        let result = service
            .generate_outbound_return_lines(
                &context,
                &store_id,
                ServiceInput {
                    stock_line_ids,
                    item_id,
                    return_id,
                },
            )
            .unwrap();

        // ensure we get the 1 existing line back, not 2 (via both stock_line_id and item_id)
        let existing_lines = result
            .rows
            .iter()
            .filter(|l| l.number_of_packs > 0.0)
            .collect::<Vec<_>>();

        assert_eq!(existing_lines.len(), 1);
    }
}
