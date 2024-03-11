use crate::{service_provider::ServiceContext, ListError, ListResult};
use repository::{
    EqualFilter, InvoiceLine, InvoiceLineFilter, InvoiceLineRepository, InvoiceRowType,
    RepositoryError, StockLine, StockLineFilter, StockLineRepository,
};
use util::uuid::uuid;

#[derive(Debug, Clone, PartialEq)]
pub struct OutboundReturnLine {
    pub id: String,
    pub reason_id: Option<String>,
    pub note: Option<String>,
    pub number_of_packs: f64,
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
    input: GenerateOutboundReturnLinesInput,
) -> Result<ListResult<OutboundReturnLine>, ListError> {
    // If a return_id is provided, get all existing lines for the provided stock_line_ids/item_id
    let existing_return_lines = get_existing_return_lines(ctx, store_id, input.clone())?;

    // Get stock lines for any stock_line_ids passed in, regardless of whether that stock line is currently available
    let from_stock_line_ids = stock_lines_from_stock_line_ids(ctx, store_id, input.stock_line_ids)?;

    // If an item id is provided, get each stock line where stock is available
    let from_item_id = stock_lines_for_item_id(ctx, store_id, &input.item_id)?;

    let new_return_lines = vec![from_stock_line_ids, from_item_id]
        .into_iter()
        .flatten()
        // filter out any stock lines for which we already have a return line (existing are joined below)
        .filter(|new_line| {
            !existing_return_lines.iter().any(|existing_line| {
                new_line.stock_line_row.id == existing_line.stock_line.stock_line_row.id
            })
        })
        .map(stock_line_to_new_return_line)
        .collect::<Vec<OutboundReturnLine>>();

    // return existing lines first, then new lines
    let mut return_lines = existing_return_lines;
    return_lines.extend(new_return_lines);

    Ok(ListResult {
        count: return_lines.len() as u32,
        rows: return_lines,
    })
}

fn stock_lines_from_stock_line_ids(
    ctx: &ServiceContext,
    store_id: &str,
    stock_line_ids: Vec<String>,
) -> Result<Vec<StockLine>, RepositoryError> {
    let stock_line_repo = StockLineRepository::new(&ctx.connection);

    let filter = StockLineFilter::new().id(EqualFilter::equal_any(stock_line_ids));

    let stock_lines = stock_line_repo.query_by_filter(filter, Some(store_id.to_string()));

    stock_lines
}

fn stock_lines_for_item_id(
    ctx: &ServiceContext,
    store_id: &str,
    item_id: &Option<String>,
) -> Result<Vec<StockLine>, RepositoryError> {
    let stock_line_repo = StockLineRepository::new(&ctx.connection);

    match item_id {
        Some(item_id) => {
            let filter = StockLineFilter::new()
                .item_id(EqualFilter::equal_to(item_id))
                .is_available(true);

            let stock_lines = stock_line_repo.query_by_filter(filter, Some(store_id.to_string()));

            stock_lines
        }
        None => Ok(vec![]),
    }
}

fn get_existing_return_lines(
    ctx: &ServiceContext,
    store_id: &str,
    GenerateOutboundReturnLinesInput {
        return_id,
        stock_line_ids,
        item_id,
    }: GenerateOutboundReturnLinesInput,
) -> Result<Vec<OutboundReturnLine>, RepositoryError> {
    match return_id {
        Some(return_id) => {
            let base_filter = InvoiceLineFilter::new()
                .invoice_id(EqualFilter::equal_to(&return_id))
                .invoice_type(InvoiceRowType::OutboundReturn.equal_to());

            let existing_lines_from_stock_line_ids = InvoiceLineRepository::new(&ctx.connection)
                .query_by_filter(
                    base_filter
                        .clone()
                        .stock_line_id(EqualFilter::equal_any(stock_line_ids)),
                )?;

            let existing_lines_for_item_id = if let Some(item_id) = item_id {
                InvoiceLineRepository::new(&ctx.connection)
                    .query_by_filter(base_filter.item_id(EqualFilter::equal_to(&item_id)))?
            } else {
                vec![]
            };

            let existing_return_lines = vec![
                existing_lines_from_stock_line_ids,
                existing_lines_for_item_id,
            ]
            .into_iter()
            .flatten()
            .map(|line| invoice_line_to_return_line(ctx, store_id, &line))
            .collect::<Result<Vec<OutboundReturnLine>, RepositoryError>>();

            existing_return_lines
        }
        None => Ok(vec![]),
    }
}

fn stock_line_to_new_return_line(stock_line: StockLine) -> OutboundReturnLine {
    OutboundReturnLine {
        id: uuid(),
        stock_line,
        reason_id: None,
        note: None,
        number_of_packs: 0.0,
    }
}

fn invoice_line_to_return_line(
    ctx: &ServiceContext,
    store_id: &str,
    line: &InvoiceLine,
) -> Result<OutboundReturnLine, RepositoryError> {
    let stock_line_id =
        line.invoice_line_row
            .stock_line_id
            .as_ref()
            .ok_or(RepositoryError::as_db_error(
                "Invoice line has not stock line ID",
                "",
            ))?;

    let stock_line = StockLineRepository::new(&ctx.connection)
        .query_by_filter(
            StockLineFilter::new().id(EqualFilter::equal_to(stock_line_id)),
            Some(store_id.to_string()),
        )?
        .pop()
        .ok_or(RepositoryError::as_db_error("Stock line not found", ""))?;

    Ok(OutboundReturnLine {
        id: line.invoice_line_row.id.clone(),
        reason_id: line.invoice_line_row.return_reason_id.clone(),
        note: line.invoice_line_row.note.clone(),
        number_of_packs: line.invoice_line_row.number_of_packs,
        stock_line,
    })
}

#[cfg(test)]
mod test {
    use crate::{service_provider::ServiceProvider, ListError};
    use repository::{
        mock::{
            mock_item_a, mock_outbound_return_a, mock_outbound_return_a_invoice_line_a,
            mock_stock_line_a, mock_stock_line_b, mock_stock_line_ci_c, mock_store_a, MockData,
            MockDataInserts,
        },
        test_db::{setup_all, setup_all_with_data},
        InvoiceLineRow, RepositoryError, StockLineRow,
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
                "Invoice line has not stock line ID",
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
            "generate_inbound_return_lines_item_id_and_return_id",
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
        // it should be the first line in the result
        let existing_line = &result.rows[0];
        assert!(
            existing_line.stock_line.stock_line_row.id == unavailable_stock_line().id
                && existing_line.number_of_packs == 1.0
                && existing_line.note == item_a_return_line().note
        );

        assert!(result.rows.iter().all(|line| {
            // except for the line that is already in the return
            line.stock_line.stock_line_row.id == unavailable_stock_line().id
                // all lines have available packs
                || line.stock_line.stock_line_row.available_number_of_packs > 0.0
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
}
