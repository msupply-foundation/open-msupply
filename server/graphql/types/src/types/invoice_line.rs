use crate::types::{program_node::ProgramNode, VVMStatusNode};

use super::{
    CampaignNode, InventoryAdjustmentReasonNode, ItemNode, ItemVariantNode, LocationNode, NameNode,
    PricingNode, ReasonOptionNode, ReturnReasonNode, StockLineNode,
};
use async_graphql::*;
use chrono::NaiveDate;
use dataloader::DataLoader;
use graphql_core::{
    loader::{
        CampaignByIdLoader, ItemLoader, ItemVariantByItemVariantIdLoader, NameByIdLoader,
        NameByIdLoaderInput, ProgramByIdLoader, ReasonOptionLoader, StockLineByIdLoader,
        VVMStatusByIdLoader,
    },
    simple_generic_errors::NodeError,
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};
use repository::{location::Location, InvoiceLine, InvoiceLineRow, ItemRow};
use serde::Serialize;
use service::{usize_to_u32, ListResult};

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")] // only needed to be comparable in tests
#[graphql(remote = "repository::db_diesel::invoice_line_row
    ::InvoiceLineType")]
pub enum InvoiceLineNodeType {
    StockIn,
    StockOut,
    UnallocatedStock,
    Service,
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
        InvoiceLineNodeType::from(self.row().r#type.clone())
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
    pub async fn item_variant_id(&self) -> &Option<String> {
        &self.row().item_variant_id
    }
    pub async fn vvm_status_id(&self) -> &Option<String> {
        &self.row().vvm_status_id
    }
    pub async fn vvm_status(&self, ctx: &Context<'_>) -> Result<Option<VVMStatusNode>> {
        if self.row().vvm_status_id.is_none() {
            return Ok(None);
        }

        let loader = ctx.get_loader::<DataLoader<VVMStatusByIdLoader>>();
        let status_id = match self.row().vvm_status_id.clone() {
            Some(status_id) => status_id,
            None => return Ok(None),
        };

        Ok(loader
            .load_one(status_id)
            .await?
            .map(VVMStatusNode::from_domain))
    }
    // Quantity
    pub async fn pack_size(&self) -> f64 {
        self.row().pack_size
    }
    pub async fn number_of_packs(&self) -> f64 {
        self.row().number_of_packs
    }
    pub async fn prescribed_quantity(&self) -> Option<f64> {
        self.row().prescribed_quantity
    }
    pub async fn shipped_number_of_packs(&self) -> Option<f64> {
        self.row().shipped_number_of_packs
    }
    pub async fn shipped_pack_size(&self) -> Option<f64> {
        self.row().shipped_pack_size
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

    pub async fn location(&self) -> Option<LocationNode> {
        self.invoice_line.location_row_option.as_ref().map(|row| {
            LocationNode::from_domain(Location {
                location_row: row.clone(),
            })
        })
    }

    // Other
    pub async fn note(&self) -> &Option<String> {
        &self.row().note
    }

    #[graphql(deprecation = "Since 2.8.0. Use reason_option instead")]
    pub async fn return_reason_id(&self) -> &Option<String> {
        &self.row().reason_option_id
    }

    #[graphql(deprecation = "Since 2.8.0. Use reason_option instead")]
    pub async fn return_reason(&self, ctx: &Context<'_>) -> Result<Option<ReturnReasonNode>> {
        let loader = ctx.get_loader::<DataLoader<ReasonOptionLoader>>();

        let return_reason_id = match &self.row().reason_option_id {
            Some(return_reason_id) => return_reason_id,
            None => return Ok(None),
        };

        let result = loader.load_one(return_reason_id.clone()).await?;

        Ok(result.map(ReturnReasonNode::from_domain))
    }

    #[graphql(deprecation = "Since 2.8.0. Use reason_option instead")]
    pub async fn inventory_adjustment_reason(
        &self,
        ctx: &Context<'_>,
    ) -> Result<Option<InventoryAdjustmentReasonNode>> {
        let loader = ctx.get_loader::<DataLoader<ReasonOptionLoader>>();
        let inventory_adjustment_reason_id = match &self.row().reason_option_id {
            None => return Ok(None),
            Some(inventory_adjustment_reason_id) => inventory_adjustment_reason_id,
        };

        let result = loader
            .load_one(inventory_adjustment_reason_id.clone())
            .await?;

        Ok(result.map(InventoryAdjustmentReasonNode::from_domain))
    }

    pub async fn donor(&self, ctx: &Context<'_>, store_id: String) -> Result<Option<NameNode>> {
        let donor_id = match &self.row().donor_id {
            None => return Ok(None),
            Some(donor_id) => donor_id,
        };
        let loader = ctx.get_loader::<DataLoader<NameByIdLoader>>();
        let result = loader
            .load_one(NameByIdLoaderInput::new(&store_id, donor_id))
            .await?;

        Ok(result.map(NameNode::from_domain))
    }

    pub async fn item_variant(&self, ctx: &Context<'_>) -> Result<Option<ItemVariantNode>> {
        let loader = ctx.get_loader::<DataLoader<ItemVariantByItemVariantIdLoader>>();

        let item_variant_id = match &self.row().item_variant_id {
            None => return Ok(None),
            Some(item_variant_id) => item_variant_id,
        };

        let result = loader.load_one(item_variant_id.clone()).await?;

        Ok(result.map(ItemVariantNode::from_domain))
    }

    pub async fn reason_option(&self, ctx: &Context<'_>) -> Result<Option<ReasonOptionNode>> {
        let loader = ctx.get_loader::<DataLoader<ReasonOptionLoader>>();
        let reason_option_id = match &self.row().reason_option_id {
            None => return Ok(None),
            Some(reason_option_id) => reason_option_id,
        };

        let result = loader.load_one(reason_option_id.clone()).await?;
        Ok(result.map(ReasonOptionNode::from_domain))
    }

    pub async fn campaign(&self, ctx: &Context<'_>) -> Result<Option<CampaignNode>> {
        let loader = ctx.get_loader::<DataLoader<CampaignByIdLoader>>();

        let campaign_id = match &self.row().campaign_id {
            Some(campaign_id) => campaign_id,
            None => return Ok(None),
        };

        let result = loader.load_one(campaign_id.clone()).await?;
        Ok(result.map(CampaignNode::from_domain))
    }

    pub async fn program(&self, ctx: &Context<'_>) -> Result<Option<ProgramNode>> {
        let loader = ctx.get_loader::<DataLoader<ProgramByIdLoader>>();

        let program_id = match &self.row().program_id {
            Some(program_id) => program_id,
            None => return Ok(None),
        };

        let result = loader
            .load_one(program_id.clone())
            .await?
            .map(|program_row| ProgramNode { program_row });

        Ok(result)
    }

    pub async fn linked_invoice_id(&self) -> &Option<String> {
        &self.row().linked_invoice_id
    }

    pub async fn volume_per_pack(&self) -> f64 {
        self.row().volume_per_pack
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
                        invoice_line_row: InvoiceLineRow {
                            id: "line_id".to_string(),
                            invoice_id: "line_invoice_id".to_string(),
                            r#type: InvoiceLineType::Service,
                            item_link_id: "line_item_id".to_string(),
                            item_name: "line_item_name".to_string(),
                            item_code: "line_item_code".to_string(),
                            pack_size: 1.0,
                            number_of_packs: 2.0,
                            batch: Some("line_batch".to_string()),
                            expiry_date: Some(NaiveDate::from_ymd_opt(2021, 1, 1).unwrap()),
                            location_id: Some("line_location_id".to_string()),
                            note: None,
                            ..Default::default()
                        },
                        invoice_row: InvoiceRow::default(),
                        item_row: ItemRow {
                            id: "line_item_id".to_string(),
                            ..Default::default()
                        },
                        location_row_option: Some(LocationRow {
                            name: "line_location_name".to_string(),
                            ..Default::default()
                        }),
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
                "packSize": 1.0,
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
                    invoice_line: InvoiceLine {
                        invoice_line_row: InvoiceLineRow {
                            total_before_tax: 1.0,
                            total_after_tax: 2.0,
                            tax_percentage: Some(10.0),
                            r#type: InvoiceLineType::StockIn,
                            ..Default::default()
                        },
                        ..Default::default()
                    },
                }
            }
            pub async fn test_query_stock_out(&self) -> InvoiceLineNode {
                InvoiceLineNode {
                    invoice_line: InvoiceLine {
                        invoice_line_row: InvoiceLineRow {
                            total_before_tax: 1.0,
                            total_after_tax: 2.0,
                            tax_percentage: Some(5.0),
                            r#type: InvoiceLineType::StockOut,
                            ..Default::default()
                        },
                        ..Default::default()
                    },
                }
            }
            pub async fn test_query_service(&self) -> InvoiceLineNode {
                InvoiceLineNode {
                    invoice_line: InvoiceLine {
                        invoice_line_row: InvoiceLineRow {
                            total_before_tax: 1.0,
                            total_after_tax: 2.0,
                            tax_percentage: None,
                            r#type: InvoiceLineType::Service,
                            ..Default::default()
                        },
                        ..Default::default()
                    },
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
