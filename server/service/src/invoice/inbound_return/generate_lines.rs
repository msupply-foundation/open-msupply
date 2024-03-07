use crate::{service_provider::ServiceContext, ListError, ListResult};
use chrono::NaiveDate;
use repository::{EqualFilter, InvoiceLineFilter, InvoiceLineRepository, ItemRow, RepositoryError};
use util::uuid::uuid;

#[derive(Debug, Clone, PartialEq)]
pub struct InboundReturnLine {
    pub id: String,
    pub reason_id: Option<String>,
    pub note: Option<String>,
    pub number_of_packs: f64,
    pub item_row: ItemRow,
    pub packs_issued: Option<f64>,
    pub batch: Option<String>,
    pub pack_size: i32,
    pub stock_line_id: Option<String>,
    pub expiry_date: Option<NaiveDate>,
}

pub struct ExistingLinesInput {
    pub item_id: String,
    pub return_id: String,
}

pub struct GenerateInboundReturnLinesInput {
    pub outbound_shipment_line_ids: Vec<String>,
    pub existing_lines_input: Option<ExistingLinesInput>,
}

pub fn generate_inbound_return_lines(
    ctx: &ServiceContext,
    _store_id: &str,
    GenerateInboundReturnLinesInput {
        outbound_shipment_line_ids,
        existing_lines_input: include_existing_lines,
    }: GenerateInboundReturnLinesInput,
) -> Result<ListResult<InboundReturnLine>, ListError> {
    let new_return_lines = if !outbound_shipment_line_ids.is_empty() {
        generate_new_return_lines(ctx, outbound_shipment_line_ids)?
    } else {
        vec![]
    };

    let existing_return_lines =
        if let Some(ExistingLinesInput { item_id, return_id }) = include_existing_lines {
            get_existing_return_lines(ctx, &item_id, &return_id)?
        } else {
            vec![]
        };

    let return_lines: Vec<InboundReturnLine> = existing_return_lines
        .into_iter()
        .chain(new_return_lines.into_iter())
        .collect();

    Ok(ListResult {
        count: return_lines.len() as u32,
        rows: return_lines,
    })
}

fn generate_new_return_lines(
    ctx: &ServiceContext,
    outbound_shipment_line_ids: Vec<String>,
) -> Result<Vec<InboundReturnLine>, ListError> {
    let invoice_line_repo = InvoiceLineRepository::new(&ctx.connection);
    let outbound_shipment_lines = invoice_line_repo.query_by_filter(
        InvoiceLineFilter::new().id(EqualFilter::equal_any(outbound_shipment_line_ids)),
    )?;

    let new_return_lines: Vec<InboundReturnLine> = outbound_shipment_lines
        .into_iter()
        .map(|invoice_line| InboundReturnLine {
            id: uuid(),
            item_row: invoice_line.item_row,
            packs_issued: Some(invoice_line.invoice_line_row.number_of_packs),
            reason_id: None,
            note: None,
            number_of_packs: 0.0,
            batch: None,
            pack_size: 1,
            stock_line_id: None,
            expiry_date: None,
        })
        .collect();

    Ok(new_return_lines)
}

fn get_existing_return_lines(
    ctx: &ServiceContext,
    item_id: &str,
    return_id: &str,
) -> Result<Vec<InboundReturnLine>, ListError> {
    let invoice_line_repo = InvoiceLineRepository::new(&ctx.connection);
    let existing_invoice_lines = invoice_line_repo.query_by_filter(
        InvoiceLineFilter::new()
            .invoice_id(EqualFilter::equal_to(return_id))
            .item_id(EqualFilter::equal_to(item_id)),
    )?;

    let existing_return_lines: Vec<InboundReturnLine> = existing_invoice_lines
        .into_iter()
        .map(|invoice_line| match invoice_line.stock_line_option {
            Some(stock_line_row) => Ok(InboundReturnLine {
                id: invoice_line.invoice_line_row.id,
                reason_id: invoice_line.invoice_line_row.return_reason_id,
                note: invoice_line.invoice_line_row.note,
                number_of_packs: invoice_line.invoice_line_row.number_of_packs,
                // We only include packs_issued on new lines. In order to get it for existing lines, we'd need
                // to store a linked invoice line of the outbound shipment against the inbound return line
                packs_issued: None,

                item_row: invoice_line.item_row,

                stock_line_id: Some(stock_line_row.id),
                batch: stock_line_row.batch,
                pack_size: stock_line_row.pack_size,
                expiry_date: stock_line_row.expiry_date,
            }),
            None => Err(RepositoryError::NotFound),
        })
        .collect::<Result<Vec<InboundReturnLine>, RepositoryError>>()?;

    Ok(existing_return_lines)
}

#[cfg(test)]
mod test {
    use crate::{invoice::ExistingLinesInput, service_provider::ServiceProvider, ListError};
    use repository::{
        mock::{
            mock_inbound_return_a, mock_inbound_return_a_invoice_line_a, mock_item_a,
            mock_outbound_shipment_a_invoice_lines, MockData, MockDataInserts,
        },
        test_db::{setup_all, setup_all_with_data},
        InvoiceLineRow, RepositoryError,
    };

    type ServiceInput = super::GenerateInboundReturnLinesInput;

    #[actix_rt::test]
    async fn generate_inbound_return_lines_errors() {
        fn inbound_return_line_no_stock_line() -> InvoiceLineRow {
            InvoiceLineRow {
                id: "inbound_return_line_no_stock_line".to_string(),
                item_link_id: mock_item_a().id,
                invoice_id: mock_inbound_return_a().id,
                stock_line_id: None,
                ..Default::default()
            }
        }
        let (_, _, connection_manager, _) = setup_all_with_data(
            "generate_inbound_return_lines_errors",
            MockDataInserts::all(),
            MockData {
                invoice_lines: vec![inbound_return_line_no_stock_line()],
                ..Default::default()
            },
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.invoice_service;

        let store_id = "store_a";
        let outbound_shipment_line_ids = vec![];
        let existing_lines_input = ExistingLinesInput {
            item_id: mock_item_a().id,
            return_id: mock_inbound_return_a().id, // added return line with no stock line above
        };

        assert_eq!(
            service.generate_inbound_return_lines(
                &context,
                store_id,
                ServiceInput {
                    outbound_shipment_line_ids,
                    existing_lines_input: Some(existing_lines_input)
                },
            ),
            Err(ListError::DatabaseError(RepositoryError::NotFound))
        );
    }

    #[actix_rt::test]
    async fn generate_inbound_return_lines_nothing_supplied() {
        let (_, _, connection_manager, _) = setup_all(
            "generate_inbound_return_lines_nothing_supplied",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.invoice_service;

        let store_id = "store_a";
        let outbound_shipment_line_ids = vec![];

        let result = service
            .generate_inbound_return_lines(
                &context,
                store_id,
                ServiceInput {
                    outbound_shipment_line_ids,
                    existing_lines_input: None,
                },
            )
            .unwrap();

        assert_eq!(result.count, 0);
    }

    #[actix_rt::test]
    async fn generate_inbound_return_lines_outbound_shipment_line_ids() {
        let (_, _, connection_manager, _) = setup_all(
            "generate_inbound_return_lines_outbound_shipment_line_ids",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.invoice_service;

        let store_id = "store_a";
        let outbound_shipment_line_ids = mock_outbound_shipment_a_invoice_lines()
            .iter()
            .map(|outbound_shipment_line| outbound_shipment_line.id.clone())
            .collect();

        let result = service
            .generate_inbound_return_lines(
                &context,
                store_id,
                ServiceInput {
                    outbound_shipment_line_ids,
                    existing_lines_input: None,
                },
            )
            .unwrap();

        assert_eq!(result.count, 2);
        // pack_issued set from the outbound shipment
        assert!(result
            .rows
            .iter()
            .all(|row| row.packs_issued.unwrap() > 0.0));
        // number_of_packs is 0, as this is a new return line
        assert!(result.rows.iter().all(|row| row.number_of_packs == 0.0));
    }

    #[actix_rt::test]
    async fn generate_inbound_return_lines_existing_item_lines() {
        let (_, _, connection_manager, _) = setup_all(
            "generate_inbound_return_lines_existing_item_lines",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.invoice_service;

        let store_id = "store_a";
        let outbound_shipment_line_ids = vec![];
        let existing_lines_input = ExistingLinesInput {
            item_id: mock_item_a().id.clone(),
            return_id: mock_inbound_return_a().id, // has 2 lines, 1 item_a, 1 item_b
        };

        let result = service
            .generate_inbound_return_lines(
                &context,
                store_id,
                ServiceInput {
                    outbound_shipment_line_ids,
                    existing_lines_input: Some(existing_lines_input),
                },
            )
            .unwrap();

        assert_eq!(result.count, 1);
        assert_eq!(result.rows[0].item_row.id, "item_a");
        assert_eq!(
            result.rows[0].note,
            mock_inbound_return_a_invoice_line_a().note
        );
    }
}
