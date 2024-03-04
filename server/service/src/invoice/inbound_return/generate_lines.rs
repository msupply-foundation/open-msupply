use crate::{service_provider::ServiceContext, ListError, ListResult};
use repository::{
    EqualFilter, InvoiceLineFilter, InvoiceLineRepository, ItemRow, RepositoryError, StockLineRow,
};
use util::uuid::uuid;

#[derive(Debug, Clone)]
pub struct InboundReturnLine {
    pub id: String,
    pub reason_id: Option<String>,
    pub note: Option<String>,
    pub number_of_packs: f64,
    pub stock_line_row: StockLineRow,
    pub item_row: ItemRow,
    pub packs_issued: f64, // TODO: how to store...
}

pub struct GenerateInboundReturnLinesInput {
    pub outbound_shipment_line_ids: Vec<String>,
    pub item_id: Option<String>,
    pub return_id: Option<String>,
}

pub fn generate_inbound_return_lines(
    ctx: &ServiceContext,
    _store_id: &str,
    GenerateInboundReturnLinesInput {
        outbound_shipment_line_ids,
        item_id: _,
        return_id: _,
    }: GenerateInboundReturnLinesInput,
) -> Result<ListResult<InboundReturnLine>, ListError> {
    let invoice_line_repo = InvoiceLineRepository::new(&ctx.connection);

    let outbound_shipment_lines = if !outbound_shipment_line_ids.is_empty() {
        let filter = InvoiceLineFilter::new().id(EqualFilter::equal_any(
            outbound_shipment_line_ids
                .iter()
                .map(String::clone)
                .collect(),
        ));

        invoice_line_repo.query_by_filter(filter)?
    } else {
        vec![]
    };

    // if want to show number issued... would need to maintain relationship with OS?
    // or new field on the invoice line to store number issued against the return
    // Would we lose the stock line? Or will it just be 0 stock available?

    let new_return_lines: Vec<InboundReturnLine> = outbound_shipment_lines
        .iter()
        .map(|invoice_line| match &invoice_line.stock_line_option {
            Some(stock_line_row) => Ok(InboundReturnLine {
                id: uuid(),
                stock_line_row: stock_line_row.clone(),
                item_row: invoice_line.item_row.clone(),
                reason_id: None,
                note: None,
                number_of_packs: 0.0,
                packs_issued: invoice_line.invoice_line_row.number_of_packs,
            }),
            None => Err(RepositoryError::NotFound),
        })
        .collect::<Result<Vec<InboundReturnLine>, RepositoryError>>()?;

    // TODO:
    // if item_id - actually i think empty, they would populate right?

    // TODO:
    // if return_id, query for return lines by return id. Include in item_id response

    Ok(ListResult {
        count: new_return_lines.len() as u32,
        rows: new_return_lines,
    })
}

#[cfg(test)]
mod test {
    use crate::service_provider::ServiceProvider;
    use repository::{
        mock::{mock_outbound_shipment_a_invoice_lines, MockDataInserts},
        test_db::setup_all,
    };

    type ServiceInput = super::GenerateInboundReturnLinesInput;

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
        let item_id = None;
        let return_id = None;

        let result = service
            .generate_inbound_return_lines(
                &context,
                store_id,
                ServiceInput {
                    outbound_shipment_line_ids,
                    item_id,
                    return_id,
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
        let item_id = None;
        let return_id = None;

        let result = service
            .generate_inbound_return_lines(
                &context,
                store_id,
                ServiceInput {
                    outbound_shipment_line_ids,
                    item_id,
                    return_id,
                },
            )
            .unwrap();

        assert_eq!(result.count, 2);
        // pack_issued set from the outbound shipment
        assert!(result.rows.iter().all(|row| row.packs_issued > 0.0));
        // number_of_packs is 0, as this is a new return line
        assert!(result.rows.iter().all(|row| row.number_of_packs == 0.0));
    }
}
