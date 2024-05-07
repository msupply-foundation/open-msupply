use super::{ItemNode, LocationNode, PricingNode, StockLineNode};
use async_graphql::*;
use chrono::NaiveDate;
use dataloader::DataLoader;
use graphql_core::{
    loader::{ItemLoader, LocationByIdLoader, StockLineByIdLoader},
    simple_generic_errors::NodeError,
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};
use repository::{InvoiceLine, InvoiceLineRow, InvoiceLineType, ItemRow};
use serde::Serialize;
use service::{usize_to_u32, ListResult};

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")] // only needed to be comparable in tests
pub enum InvoiceLineNodeType {
    StockIn,
    StockOut,
    UnallocatedStock,
    Service,
}
impl InvoiceLineNodeType {
    pub fn from_domain(domain_type: &InvoiceLineType) -> Self {
        use InvoiceLineNodeType::*;
        match domain_type {
            InvoiceLineType::StockIn => StockIn,
            InvoiceLineType::StockOut => StockOut,
            InvoiceLineType::UnallocatedStock => UnallocatedStock,
            InvoiceLineType::Service => Service,
        }
    }

    pub fn to_domain(self) -> InvoiceLineType {
        use InvoiceLineNodeType::*;
        match self {
            StockIn => InvoiceLineType::StockIn,
            StockOut => InvoiceLineType::StockOut,
            UnallocatedStock => InvoiceLineType::UnallocatedStock,
            Service => InvoiceLineType::Service,
        }
    }
}

pub struct InvoiceLineNode {
    invoice_line: InvoiceLine,
}

#[derive(SimpleObject)]
pub struct InvoiceLineConnector {
    total_count: u32,
    nodes: Vec<InvoiceLineNode>,
}

#[Object]
impl InvoiceLineNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }
    pub async fn invoice_id(&self) -> &str {
        &self.row().invoice_id
    }
    pub async fn r#type(&self) -> InvoiceLineNodeType {
        InvoiceLineNodeType::from_domain(&self.row().r#type)
    }
    // Item
    pub async fn item_id(&self) -> &str {
        &self.item_row().id
    }
    pub async fn item_name(&self) -> &str {
        &self.row().item_name
    }
    pub async fn item_code(&self) -> &str {
        &self.row().item_code
    }
    pub async fn item(&self, ctx: &Context<'_>) -> Result<ItemNode> {
        let loader = ctx.get_loader::<DataLoader<ItemLoader>>();
        let item_option = loader.load_one(self.item_row().id.clone()).await?;

        item_option.map(ItemNode::from_domain).ok_or(
            StandardGraphqlError::InternalError(format!(
                "Cannot find item ({}) linked to invoice_line ({})",
                &self.item_row().id,
                &self.row().id
            ))
            .extend(),
        )
    }
    // Quantity
    pub async fn pack_size(&self) -> i32 {
        self.row().pack_size
    }
    pub async fn number_of_packs(&self) -> f64 {
        self.row().number_of_packs
    }
    // Batch
    pub async fn batch(&self) -> &Option<String> {
        &self.row().batch
    }
    pub async fn expiry_date(&self) -> &Option<NaiveDate> {
        &self.row().expiry_date
    }
    pub async fn stock_line(&self, ctx: &Context<'_>) -> Result<Option<StockLineNode>> {
        let loader = ctx.get_loader::<DataLoader<StockLineByIdLoader>>();

        let stock_line_id = match &self.row().stock_line_id {
            None => return Ok(None),
            Some(stock_line_id) => stock_line_id,
        };

        let result = loader.load_one(stock_line_id.clone()).await?;

        Ok(result.map(StockLineNode::from_domain))
    }
    // Price
    pub async fn pricing(&self) -> PricingNode {
        PricingNode {
            invoice_pricing: self.invoice_line.pricing(),
        }
    }
    pub async fn total_before_tax(&self) -> f64 {
        self.row().total_before_tax
    }
    pub async fn total_after_tax(&self) -> f64 {
        self.row().total_after_tax
    }
    pub async fn cost_price_per_pack(&self) -> f64 {
        self.row().cost_price_per_pack
    }
    pub async fn sell_price_per_pack(&self) -> f64 {
        self.row().sell_price_per_pack
    }

    pub async fn tax_percentage(&self) -> &Option<f64> {
        &self.row().tax_percentage
    }
    pub async fn foreign_currency_price_before_tax(&self) -> &Option<f64> {
        &self.row().foreign_currency_price_before_tax
    }
    // Location
    pub async fn location_name(&self) -> Option<&str> {
        self.invoice_line.location_name()
    }
    pub async fn location_id(&self) -> &Option<String> {
        &self.row().location_id
    }
    pub async fn location(&self, ctx: &Context<'_>) -> Result<Option<LocationNode>> {
        let loader = ctx.get_loader::<DataLoader<LocationByIdLoader>>();

        let location_id = match &self.row().location_id {
            None => return Ok(None),
            Some(location_id) => location_id,
        };

        let result = loader.load_one(location_id.clone()).await?;

        Ok(result.map(LocationNode::from_domain))
    }

    // Other
    pub async fn note(&self) -> &Option<String> {
        &self.row().note
    }
    pub async fn return_reason_id(&self) -> &Option<String> {
        &self.row().return_reason_id
    }
}

#[derive(Union)]
pub enum InvoiceLinesResponse {
    Response(InvoiceLineConnector),
}

#[derive(Union)]
pub enum InvoiceLineResponse {
    Error(NodeError),
    Response(InvoiceLineNode),
}

impl InvoiceLineConnector {
    pub fn from_domain(invoice_lines: ListResult<InvoiceLine>) -> InvoiceLineConnector {
        InvoiceLineConnector {
            total_count: invoice_lines.count,
            nodes: invoice_lines
                .rows
                .into_iter()
                .map(InvoiceLineNode::from_domain)
                .collect(),
        }
    }

    pub fn from_vec(invoice_lines: Vec<InvoiceLine>) -> InvoiceLineConnector {
        InvoiceLineConnector {
            total_count: usize_to_u32(invoice_lines.len()),
            nodes: invoice_lines
                .into_iter()
                .map(InvoiceLineNode::from_domain)
                .collect(),
        }
    }

    pub fn empty() -> InvoiceLineConnector {
        InvoiceLineConnector {
            total_count: 0,
            nodes: vec![],
        }
    }
}

impl InvoiceLineNode {
    pub fn from_domain(invoice_line: InvoiceLine) -> InvoiceLineNode {
        InvoiceLineNode { invoice_line }
    }

    pub fn row(&self) -> &InvoiceLineRow {
        &self.invoice_line.invoice_line_row
    }

    pub fn item_row(&self) -> &ItemRow {
        &self.invoice_line.item_row
    }
}

#[cfg(test)]
mod test {

    use async_graphql::{EmptyMutation, Object};
    use chrono::NaiveDate;
    use graphql_core::{assert_graphql_query, test_helpers::setup_graphql_test};
    use repository::{
        mock::MockDataInserts, InvoiceLine, InvoiceLineRow, InvoiceLineType, InvoiceRow, ItemRow,
        LocationRow,
    };
    use serde_json::json;
    use util::inline_init;

    use crate::types::InvoiceLineNode;

    #[actix_rt::test]
    async fn graphql_test_invoice_line_basic() {
        #[derive(Clone)]
        struct TestQuery;

        let (_, _, _, settings) = setup_graphql_test(
            TestQuery,
            EmptyMutation,
            "graphql_test_invoice_line_basic",
            MockDataInserts::none(),
        )
        .await;

        #[Object]
        impl TestQuery {
            pub async fn test_query(&self) -> InvoiceLineNode {
                InvoiceLineNode {
                    invoice_line: repository::InvoiceLine {
                        invoice_line_row: inline_init(|r: &mut InvoiceLineRow| {
                            r.id = "line_id".to_string();
                            r.invoice_id = "line_invoice_id".to_string();
                            r.r#type = InvoiceLineType::Service;
                            r.item_link_id = "line_item_id".to_string();
                            r.item_name = "line_item_name".to_string();
                            r.item_code = "line_item_code".to_string();
                            r.pack_size = 1;
                            r.number_of_packs = 2.0;
                            r.batch = Some("line_batch".to_string());
                            r.expiry_date = Some(NaiveDate::from_ymd_opt(2021, 1, 1).unwrap());
                            r.location_id = Some("line_location_id".to_string());
                            r.note = None;
                        }),
                        invoice_row: InvoiceRow::default(),
                        item_row: inline_init(|r: &mut ItemRow| r.id = "line_item_id".to_string()),
                        location_row_option: Some(inline_init(|r: &mut LocationRow| {
                            r.name = "line_location_name".to_string();
                        })),
                        stock_line_option: None,
                    },
                }
            }
        }

        let expected = json!({
            "testQuery": {
                "__typename": "InvoiceLineNode",
                "id": "line_id",
                "invoiceId": "line_invoice_id",
                "type": "SERVICE",
                "itemId": "line_item_id",
                "itemName": "line_item_name",
                "itemCode": "line_item_code",
                "packSize": 1,
                "numberOfPacks": 2.0,
                "batch": "line_batch",
                "expiryDate": "2021-01-01",
                "locationName": "line_location_name",
                "locationId": "line_location_id",
                "note": null
            }
        }
        );

        let query = r#"
        query {
            testQuery {
                __typename
                id
                invoiceId
                type
                itemId
                itemName
                itemCode
                packSize
                numberOfPacks
                batch
                expiryDate
                locationName
                locationId
                note
            }
        }
        "#;

        assert_graphql_query!(&settings, &query, &None, expected, None);
    }

    #[actix_rt::test]
    async fn graphql_test_invoice_line_pricing() {
        #[derive(Clone)]
        struct TestQuery;

        let (_, _, _, settings) = setup_graphql_test(
            TestQuery,
            EmptyMutation,
            "graphql_test_invoice_line_pricing",
            MockDataInserts::none(),
        )
        .await;

        #[Object]
        impl TestQuery {
            pub async fn test_query_stock_in(&self) -> InvoiceLineNode {
                InvoiceLineNode {
                    invoice_line: inline_init(|record: &mut InvoiceLine| {
                        record.invoice_line_row = inline_init(|r: &mut InvoiceLineRow| {
                            r.total_before_tax = 1.0;
                            r.total_after_tax = 2.0;
                            r.tax_percentage = Some(10.0);
                            r.r#type = InvoiceLineRowType::StockIn
                        })
                    }),
                }
            }
            pub async fn test_query_stock_out(&self) -> InvoiceLineNode {
                InvoiceLineNode {
                    invoice_line: inline_init(|record: &mut InvoiceLine| {
                        record.invoice_line_row = inline_init(|r: &mut InvoiceLineRow| {
                            r.total_before_tax = 1.0;
                            r.total_after_tax = 2.0;
                            r.tax_percentage = Some(5.0);
                            r.r#type = InvoiceLineRowType::StockOut
                        })
                    }),
                }
            }
            pub async fn test_query_service(&self) -> InvoiceLineNode {
                InvoiceLineNode {
                    invoice_line: inline_init(|record: &mut InvoiceLine| {
                        record.invoice_line_row = inline_init(|r: &mut InvoiceLineRow| {
                            r.total_before_tax = 1.0;
                            r.total_after_tax = 2.0;
                            r.tax_percentage = None;
                            r.r#type = InvoiceLineRowType::Service
                        })
                    }),
                }
            }
        }

        let expected = json!({
            "testQueryStockIn": {
                "pricing": {
                    "totalBeforeTax": 1.0,
                    "totalAfterTax": 2.0,
                    "stockTotalBeforeTax": 1.0,
                    "stockTotalAfterTax": 2.0,
                    "serviceTotalBeforeTax": 0.0,
                    "serviceTotalAfterTax": 0.0,
                    "taxPercentage": 10.0
                }
            },
            "testQueryStockOut": {
                "pricing": {
                    "totalBeforeTax": 1.0,
                    "totalAfterTax": 2.0,
                    "stockTotalBeforeTax": 1.0,
                    "stockTotalAfterTax": 2.0,
                    "serviceTotalBeforeTax": 0.0,
                    "serviceTotalAfterTax": 0.0,
                    "taxPercentage": 5.0
                }
            },
            "testQueryService": {
                "pricing": {
                    "totalBeforeTax": 1.0,
                    "totalAfterTax": 2.0,
                    "stockTotalBeforeTax": 0.0,
                    "stockTotalAfterTax": 0.0,
                    "serviceTotalBeforeTax": 1.0,
                    "serviceTotalAfterTax":2.0,
                    "taxPercentage": null
                }
            }
        }
        );

        let query = r#"
        query {
            testQueryStockIn {
              ...pricing
            }
            testQueryStockOut {
                ...pricing
            }
              testQueryService {
                ...pricing
            }           
        }
        fragment pricing on InvoiceLineNode {
            pricing {
                totalBeforeTax
                totalAfterTax
                stockTotalBeforeTax
                stockTotalAfterTax
                serviceTotalBeforeTax
                serviceTotalAfterTax
                taxPercentage
            }
        }
        "#;

        assert_graphql_query!(&settings, &query, &None, expected, None);
    }
    // TODO good place to test loaders
}
