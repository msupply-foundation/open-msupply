use crate::{service_provider::ServiceContext, ListError, ListResult};
use chrono::NaiveDate;
use repository::{
    EqualFilter, InvoiceLine, InvoiceLineFilter, InvoiceLineRepository, InvoiceLineRow,
    InvoiceType, ItemRow,
};
use util::uuid::uuid;

#[derive(Debug, Clone, PartialEq, Default)]
pub struct CustomerReturnLine {
    pub id: String,
    pub reason_id: Option<String>,
    pub note: Option<String>,
    pub number_of_packs: f64,
    pub item_row: ItemRow,
    pub packs_issued: Option<f64>,
    pub batch: Option<String>,
    pub pack_size: f64,
    pub stock_line_id: Option<String>,
    pub expiry_date: Option<NaiveDate>,
}

pub struct ExistingLinesInput {
    pub item_id: String,
    pub return_id: String,
}

pub struct GenerateCustomerReturnLinesInput {
    pub outbound_shipment_line_ids: Vec<String>,
    pub existing_lines_input: Option<ExistingLinesInput>,
}

pub fn generate_customer_return_lines(
    ctx: &ServiceContext,
    _store_id: &str,
    GenerateCustomerReturnLinesInput {
        outbound_shipment_line_ids,
        existing_lines_input: include_existing_lines,
    }: GenerateCustomerReturnLinesInput,
) -> Result<ListResult<CustomerReturnLine>, ListError> {
    let existing_return_lines =
        if let Some(ExistingLinesInput { item_id, return_id }) = include_existing_lines {
            get_existing_return_lines(ctx, &item_id, &return_id)?
        } else {
            vec![]
        };

    let new_return_lines = generate_new_return_lines(ctx, outbound_shipment_line_ids)?;

    // return existing first, then new lines
    let return_lines: Vec<CustomerReturnLine> = existing_return_lines
        .into_iter()
        .chain(new_return_lines)
        .collect();

    Ok(ListResult {
        count: return_lines.len() as u32,
        rows: return_lines,
    })
}

fn get_existing_return_lines(
    ctx: &ServiceContext,
    item_id: &str,
    return_id: &str,
) -> Result<Vec<CustomerReturnLine>, ListError> {
    let invoice_line_repo = InvoiceLineRepository::new(&ctx.connection);
    let existing_invoice_lines = invoice_line_repo.query_by_filter(
        InvoiceLineFilter::new()
            .invoice_id(EqualFilter::equal_to(return_id))
            .invoice_type(InvoiceType::CustomerReturn.equal_to())
            .item_id(EqualFilter::equal_to(item_id)),
    )?;

    let existing_return_lines = existing_invoice_lines
        .into_iter()
        .map(CustomerReturnLine::from_return_invoice_line)
        .collect::<Vec<CustomerReturnLine>>();

    Ok(existing_return_lines)
}

impl CustomerReturnLine {
    fn extend_from_invoice_line(self, line: InvoiceLine) -> Self {
        let InvoiceLineRow {
            pack_size,
            expiry_date,
            batch,
            ..
        } = line.invoice_line_row;
        Self {
            item_row: line.item_row,
            batch,
            pack_size,
            expiry_date,
            ..self
        }
    }

    fn from_return_invoice_line(line: InvoiceLine) -> Self {
        Self {
            id: line.invoice_line_row.id.clone(),
            reason_id: line.invoice_line_row.return_reason_id.clone(),
            note: line.invoice_line_row.note.clone(),
            number_of_packs: line.invoice_line_row.number_of_packs,
            stock_line_id: line.invoice_line_row.stock_line_id.clone(),
            // We only include packs_issued on new lines. In order to get it for existing lines, we'd need
            // to store a linked invoice line of the outbound shipment against the inbound return line
            packs_issued: None,
            ..Default::default()
        }
        .extend_from_invoice_line(line)
    }
}

fn generate_new_return_lines(
    ctx: &ServiceContext,
    outbound_shipment_line_ids: Vec<String>,
) -> Result<Vec<CustomerReturnLine>, ListError> {
    let invoice_line_repo = InvoiceLineRepository::new(&ctx.connection);
    let outbound_shipment_lines = invoice_line_repo.query_by_filter(
        InvoiceLineFilter::new().id(EqualFilter::equal_any(outbound_shipment_line_ids)),
    )?;

    let new_return_lines: Vec<CustomerReturnLine> = outbound_shipment_lines
        .into_iter()
        .map(|invoice_line| {
            CustomerReturnLine {
                id: uuid(),
                packs_issued: Some(invoice_line.invoice_line_row.number_of_packs),
                ..Default::default()
            }
            .extend_from_invoice_line(invoice_line)
        })
        .collect();

    Ok(new_return_lines)
}

#[cfg(test)]
mod test {
    use crate::{invoice::ExistingLinesInput, service_provider::ServiceProvider};
    use repository::{
        mock::{
            mock_customer_return_a, mock_customer_return_a_invoice_line_a, mock_item_a,
            mock_outbound_shipment_a_invoice_lines, MockDataInserts,
        },
        test_db::setup_all,
    };

    type ServiceInput = super::GenerateCustomerReturnLinesInput;

    #[actix_rt::test]
    async fn generate_customer_return_lines_nothing_supplied() {
        let (_, _, connection_manager, _) = setup_all(
            "generate_customer_return_lines_nothing_supplied",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.invoice_service;

        let store_id = "store_a";

        let result = service
            .generate_customer_return_lines(
                &context,
                store_id,
                ServiceInput {
                    outbound_shipment_line_ids: vec![],
                    existing_lines_input: None,
                },
            )
            .unwrap();

        assert_eq!(result.count, 0);
    }

    #[actix_rt::test]
    async fn generate_customer_return_lines_outbound_shipment_line_ids() {
        let (_, _, connection_manager, _) = setup_all(
            "generate_customer_return_lines_outbound_shipment_line_ids",
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
            .generate_customer_return_lines(
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
    async fn generate_customer_return_lines_existing_item_lines() {
        let (_, _, connection_manager, _) = setup_all(
            "generate_customer_return_lines_existing_item_lines",
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
            return_id: mock_customer_return_a().id, // has 2 lines, 1 item_a, 1 item_b
        };

        let result = service
            .generate_customer_return_lines(
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
            mock_customer_return_a_invoice_line_a().note
        );
    }
}
