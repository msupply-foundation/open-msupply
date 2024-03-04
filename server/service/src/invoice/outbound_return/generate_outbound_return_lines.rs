use crate::{service_provider::ServiceContext, ListError, ListResult};
use repository::{
    EqualFilter, InvoiceLine, InvoiceLineFilter, InvoiceLineRepository, RepositoryError, StockLine,
    StockLineFilter, StockLineRepository,
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
    let stock_line_repo = StockLineRepository::new(&ctx.connection);

    // If any stock_line_ids are passed in, we should return a new OutboundReturnLine for each
    // regardless of whether that stock line is currently available
    let from_stock_line_ids = if !stock_line_ids.is_empty() {
        let filter = StockLineFilter::new().id(EqualFilter::equal_any(stock_line_ids));

        let return_lines = stock_line_repo
            .query_by_filter(filter, Some(store_id.to_string()))?
            .iter()
            .map(stock_line_to_new_return_line)
            .collect();

        return_lines
    } else {
        vec![]
    };

    // If an item id is provided, we should return a new OutboundReturnLine for each stock line
    // of that item that is currently available
    let from_item_id = match &item_id {
        Some(item_id) => {
            let filter = StockLineFilter::new()
                .item_id(EqualFilter::equal_to(item_id))
                .is_available(true);

            let return_lines = stock_line_repo
                .query_by_filter(filter, Some(store_id.to_string()))?
                .iter()
                .map(stock_line_to_new_return_line)
                .collect();

            return_lines
        }
        None => vec![],
    };

    // If a return id is included alongside the item, we should include those existing return lines
    // for that item
    let existing_return_lines = match (item_id, return_id) {
        (Some(item_id), Some(return_id)) => {
            let lines = InvoiceLineRepository::new(&ctx.connection).query_by_filter(
                InvoiceLineFilter::new()
                    .invoice_id(EqualFilter::equal_to(&return_id))
                    .item_id(EqualFilter::equal_to(&item_id)),
            )?;

            lines
                .iter()
                .map(|line| invoice_line_to_new_return_line(ctx, store_id, line))
                .collect::<Result<Vec<OutboundReturnLine>, RepositoryError>>()?
        }
        _ => vec![],
    };

    // Filter out any stock lines that are already included in the existing return lines
    let new_item_lines = from_item_id
        .into_iter()
        .filter(|new_line| {
            !existing_return_lines.iter().any(|existing_line| {
                new_line.stock_line.stock_line_row.id == existing_line.stock_line.stock_line_row.id
            })
        })
        .collect::<Vec<OutboundReturnLine>>();

    let mut return_lines = from_stock_line_ids;
    return_lines.extend(existing_return_lines);
    return_lines.extend(new_item_lines);

    Ok(ListResult {
        count: return_lines.len() as u32,
        rows: return_lines,
    })
}

fn stock_line_to_new_return_line(stock_line: &StockLine) -> OutboundReturnLine {
    OutboundReturnLine {
        id: uuid(),
        stock_line: stock_line.clone(),
        reason_id: None,
        note: None,
        number_of_packs: 0.0,
    }
}

fn invoice_line_to_new_return_line(
    ctx: &ServiceContext,
    store_id: &str,
    line: &InvoiceLine,
) -> Result<OutboundReturnLine, RepositoryError> {
    let stock_line_id = line
        .invoice_line_row
        .stock_line_id
        .as_ref()
        .ok_or(RepositoryError::NotFound)?;

    let stock_line = StockLineRepository::new(&ctx.connection)
        .query_by_filter(
            StockLineFilter::new().id(EqualFilter::equal_to(stock_line_id)),
            Some(store_id.to_string()),
        )?
        .pop()
        .ok_or(RepositoryError::NotFound)?;

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
            mock_item_a, mock_item_a_lines, mock_outbound_return_a, mock_store_a, MockData,
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

        // NotFound
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
            Err(ListError::DatabaseError(RepositoryError::NotFound))
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
        let stock_line_ids = mock_item_a_lines()
            .iter()
            .map(|stock_line| stock_line.id.clone())
            .collect();
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
        assert_eq!(result.rows[0].stock_line.item_row.id, "item_a");
    }

    #[actix_rt::test]
    async fn generate_inbound_return_lines_item_id() {
        let (_, _, connection_manager, _) = setup_all(
            "generate_inbound_return_lines_item_id",
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
    async fn generate_inbound_return_lines_item_id_and_return_id() {
        fn unavailable_stock_line() -> StockLineRow {
            StockLineRow {
                id: "unavailable_stock_line".to_string(),
                item_link_id: "item_a".to_string(),
                store_id: "store_a".to_string(),
                available_number_of_packs: 0.0,
                ..Default::default()
            }
        }
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

        // all are item_a stock lines (item_b lines from the existing return are not included)
        assert!(result
            .rows
            .iter()
            .all(|line| line.stock_line.item_row.id == mock_item_a().id));

        // the stock line that is already in the return should be included, even though it
        // has no available packs
        // it should also have the correct number of packs/note/return_reason_id mapped
        assert!(result.rows.iter().any(|line| {
            line.stock_line.stock_line_row.id == unavailable_stock_line().id
                && line.number_of_packs == 1.0
                && line.note == item_a_return_line().note
        }));

        assert!(result.rows.iter().all(|line| {
            // except for the line that is already in the return
            line.stock_line.stock_line_row.id == unavailable_stock_line().id
                // all lines have available packs
                || line.stock_line.stock_line_row.available_number_of_packs > 0.0
        }));
    }
}
