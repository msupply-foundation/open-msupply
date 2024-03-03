use crate::{service_provider::ServiceContext, ListError, ListResult};
use repository::{
    EqualFilter, InvoiceLineFilter, InvoiceLineRepository, StockLine, StockLineFilter,
    StockLineRepository,
};
use util::uuid::uuid;
mod validate;
use validate::validate;

#[derive(Debug, Clone)]
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
    if stock_line_ids.is_empty() && item_id.is_none() && return_id.is_none() {
        return Ok(ListResult {
            count: 0,
            rows: vec![],
        });
    }

    let mut filter = StockLineFilter::new();

    if !stock_line_ids.is_empty() {
        filter.id = Some(EqualFilter::equal_any(
            stock_line_ids.iter().map(String::clone).collect(),
        ))
    }
    match &item_id {
        Some(item_id) => {
            filter.item_id = Some(EqualFilter::equal_to(item_id));
            filter.is_available = Some(true);
        }
        None => {}
    }

    // TODO... if only return id, we shouldn't do this query...
    let stock_lines = StockLineRepository::new(&ctx.connection)
        .query_by_filter(filter, Some(store_id.to_string()))?;

    let new_return_lines: Vec<OutboundReturnLine> = stock_lines
        .iter()
        .map(|stock_line| OutboundReturnLine {
            id: uuid(),
            stock_line: stock_line.clone(),

            reason_id: None,
            note: None,
            number_of_packs: 0.0,
        })
        .collect();

    // if stock_line_ids - generate lines for each (no availability filter)

    // if item_id - generate lines for available stock_lines of that item

    // if return_id & item_id - return lines for that item in that return... and the other available stock lines

    // wanna validate return id and item id exist... and are for this store etc...? its a query maybe it don't be mattering too much?
    // ah damn
    // if return id
    // and item id

    let existing_return_lines = if let Some(return_id) = return_id {
        let mut return_line_filter = InvoiceLineFilter::new().id(EqualFilter::equal_to(&return_id));

        if let Some(item_id) = &item_id {
            return_line_filter.item_id = Some(EqualFilter::equal_to(item_id));
        }

        let existing_return_lines: Result<Vec<OutboundReturnLine>, ListError> =
            InvoiceLineRepository::new(&ctx.connection)
                .query_by_filter(return_line_filter)?
                .iter()
                .map(|line| -> Result<OutboundReturnLine, ListError> {
                    let invoice_line_row = line.invoice_line_row.clone();

                    let stock_line_id = match line.stock_line_option.clone() {
                        Some(stock_line) => stock_line.id,
                        None => return Err(ListError::LimitBelowMin(1)),
                    };

                    let stock_line = StockLineRepository::new(&ctx.connection)
                        .query_by_filter(
                            StockLineFilter::new().id(EqualFilter::equal_to(&stock_line_id)),
                            Some(store_id.to_string()),
                        )?
                        .pop();

                    let stock_line = match stock_line {
                        Some(stock_line) => stock_line,
                        None => return Err(ListError::LimitBelowMin(1)),
                    };
                    Ok(OutboundReturnLine {
                        id: invoice_line_row.id,
                        reason_id: invoice_line_row.return_reason_id,
                        note: invoice_line_row.note,
                        number_of_packs: invoice_line_row.number_of_packs,
                        stock_line,
                    })
                })
                .collect();
        existing_return_lines
    } else {
        Ok(vec![])
    }?;

    let mut return_lines = new_return_lines;
    return_lines.extend(existing_return_lines);

    Ok(ListResult {
        count: return_lines.len() as u32,
        rows: return_lines,
    })
}

#[cfg(test)]
mod test {
    use crate::service_provider::ServiceProvider;
    use repository::{
        mock::{mock_item_a_lines, MockDataInserts},
        test_db::setup_all,
    };

    type ServiceInput = super::GenerateOutboundReturnLinesInput;

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
}
