use async_graphql::*;
use chrono::{DateTime, Utc};
use dataloader::DataLoader;
use repository::{
    requisition_row::{RequisitionRow, RequisitionType},
    ItemRow, RequisitionLine, RequisitionLineRow,
};
use service::{
    item_stats::ItemStats, requisition::request_requisition::RequisitionItemInformation,
    usize_to_u32,
};

use graphql_core::{
    loader::{
        InvoiceLineForRequisitionLine, ItemLoader, ItemStatsLoaderInput, ItemsStatsForItemLoader,
        LinkedRequisitionLineLoader, NameByIdLoader, NameByIdLoaderInput, ProgramByIdLoader,
        ReasonOptionLoader, RequisitionAndItemId, RequisitionItemInfoLoader,
        RequisitionItemInfoLoaderInput, RequisitionLineSupplyStatusLoader,
    },
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};

use super::{InvoiceLineConnector, ItemNode, ItemStatsNode, NameNode, ReasonOptionNode};

#[derive(PartialEq, Debug)]
pub struct RequisitionLineNode {
    requisition_line: RequisitionLine,
}

#[derive(SimpleObject)]
pub struct RequisitionLineConnector {
    total_count: u32,
    nodes: Vec<RequisitionLineNode>,
}

#[Object]
impl RequisitionLineNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn item_id(&self) -> &str {
        &self.item_row().id
    }

    pub async fn item_name(&self) -> &str {
        &self.row().item_name
    }

    pub async fn comment(&self) -> &Option<String> {
        &self.row().comment
    }

    pub async fn item(&self, ctx: &Context<'_>) -> Result<ItemNode> {
        let loader = ctx.get_loader::<DataLoader<ItemLoader>>();
        let item_option = loader.load_one(self.item_row().id.clone()).await?;

        item_option.map(ItemNode::from_domain).ok_or(
            StandardGraphqlError::InternalError(format!(
                "Cannot find item_id {} for requisition_line_id {}",
                &self.item_row().id,
                &self.row().id
            ))
            .extend(),
        )
    }

    /// Quantity requested
    pub async fn requested_quantity(&self) -> &f64 {
        &self.row().requested_quantity
    }

    /// Quantity to be supplied in the next shipment, only used in response requisition
    pub async fn supply_quantity(&self) -> &f64 {
        &self.row().supply_quantity
    }

    /// Calculated quantity
    /// When months_of_stock < requisition.min_months_of_stock, calculated = average_monthly_consumption * requisition.max_months_of_stock - months_of_stock
    pub async fn suggested_quantity(&self) -> &f64 {
        &self.row().suggested_quantity
    }

    pub async fn approved_quantity(&self) -> &f64 {
        &self.row().approved_quantity
    }

    pub async fn approval_comment(&self) -> &Option<String> {
        &self.row().approval_comment
    }

    /// OutboundShipment lines linked to requisitions line
    pub async fn outbound_shipment_lines(&self, ctx: &Context<'_>) -> Result<InvoiceLineConnector> {
        // Outbound shipments link to response requisition, so for request requisition
        // use linked requisition id
        let requisition_row = &self.requisition_line.requisition_row;
        let requisition_id = match requisition_row.r#type {
            RequisitionType::Request => match &requisition_row.linked_requisition_id {
                Some(linked_requisition_id) => linked_requisition_id,
                None => return Ok(InvoiceLineConnector::empty()),
            },
            _ => &self.row().requisition_id,
        };

        let loader = ctx.get_loader::<DataLoader<InvoiceLineForRequisitionLine>>();
        let result_option = loader
            .load_one(RequisitionAndItemId::new(
                requisition_id,
                &self.item_row().id,
            ))
            .await?;

        let result = result_option.unwrap_or(vec![]);

        Ok(InvoiceLineConnector::from_vec(result))
    }

    /// InboundShipment lines linked to requisitions line
    pub async fn inbound_shipment_lines(&self, ctx: &Context<'_>) -> Result<InvoiceLineConnector> {
        // Outbound shipments links to request requisition, so for response requisition
        // use linked requisition id
        let requisition_row = &self.requisition_line.requisition_row;
        let requisition_id = match requisition_row.r#type {
            RequisitionType::Response => match &requisition_row.linked_requisition_id {
                Some(linked_requisition_id) => linked_requisition_id,
                None => return Ok(InvoiceLineConnector::empty()),
            },
            _ => &self.row().requisition_id,
        };

        let loader = ctx.get_loader::<DataLoader<InvoiceLineForRequisitionLine>>();
        let result_option = loader
            .load_one(RequisitionAndItemId::new(
                requisition_id,
                &self.item_row().id,
            ))
            .await?;

        let result = result_option.unwrap_or(vec![]);

        Ok(InvoiceLineConnector::from_vec(result))
    }

    /// For request requisition: snapshot stats (when requisition was created)
    /// For response requisition current item stats
    pub async fn item_stats(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "Defaults to 3 months")] amc_lookback_months: Option<f64>,
    ) -> Result<ItemStatsNode> {
        if self.requisition_row().r#type == RequisitionType::Request {
            return Ok(ItemStatsNode {
                item_stats: ItemStats::from_requisition_line(&self.requisition_line),
            });
        }

        let loader = ctx.get_loader::<DataLoader<ItemsStatsForItemLoader>>();
        let result = loader
            .load_one(ItemStatsLoaderInput::new(
                &self.requisition_row().store_id,
                &self.item_row().id,
                amc_lookback_months,
            ))
            .await?
            .ok_or(
                StandardGraphqlError::InternalError(format!(
                    "Cannot find item stats for requisition line {} and store {}",
                    &self.item_row().id,
                    &self.requisition_row().store_id,
                ))
                .extend(),
            )?;

        Ok(ItemStatsNode::from_domain(result))
    }

    /// Quantity remaining to supply
    /// supplyQuantity minus all (including unallocated) linked invoice lines numberOfPacks * packSize
    /// Only available in response requisition, request requisition returns 0
    pub async fn remaining_quantity_to_supply(&self, ctx: &Context<'_>) -> Result<f64> {
        if self.requisition_row().r#type == RequisitionType::Request {
            return Ok(0.0);
        }

        let loader = ctx.get_loader::<DataLoader<RequisitionLineSupplyStatusLoader>>();

        let response_option = loader
            .load_one(RequisitionAndItemId::new(
                &self.row().requisition_id,
                &self.item_row().id,
            ))
            .await?;

        Ok(response_option
            .map(|requisition_line_status| requisition_line_status.remaining_quantity())
            .unwrap_or(0.0))
    }

    /// Quantity already issued in outbound shipments
    pub async fn already_issued(&self, ctx: &Context<'_>) -> Result<f64> {
        let loader = ctx.get_loader::<DataLoader<RequisitionLineSupplyStatusLoader>>();

        let response_option = loader
            .load_one(RequisitionAndItemId::new(
                &self.row().requisition_id,
                &self.item_row().id,
            ))
            .await?;

        Ok(response_option
            .map(|requisition_line_status| requisition_line_status.quantity_in_invoices())
            .unwrap_or(0.0))
    }

    pub async fn linked_requisition_line(
        &self,
        ctx: &Context<'_>,
    ) -> Result<Option<RequisitionLineNode>> {
        let linked_requisition_id =
            if let Some(linked_requisition_id) = &self.requisition_row().linked_requisition_id {
                linked_requisition_id
            } else {
                return Ok(None);
            };

        let loader = ctx.get_loader::<DataLoader<LinkedRequisitionLineLoader>>();
        let result_option = loader
            .load_one(RequisitionAndItemId::new(
                linked_requisition_id,
                &self.item_row().id,
            ))
            .await?;

        Ok(result_option.map(RequisitionLineNode::from_domain))
    }

    pub async fn average_monthly_consumption(&self) -> &f64 {
        &self.row().average_monthly_consumption
    }

    // Manual requisition fields
    pub async fn initial_stock_on_hand_units(&self) -> &f64 {
        &self.row().initial_stock_on_hand_units
    }

    pub async fn incoming_units(&self) -> &f64 {
        &self.row().incoming_units
    }

    pub async fn outgoing_units(&self) -> &f64 {
        &self.row().outgoing_units
    }

    pub async fn loss_in_units(&self) -> &f64 {
        &self.row().loss_in_units
    }

    pub async fn addition_in_units(&self) -> &f64 {
        &self.row().addition_in_units
    }

    pub async fn expiring_units(&self) -> &f64 {
        &self.row().expiring_units
    }

    pub async fn days_out_of_stock(&self) -> &f64 {
        &self.row().days_out_of_stock
    }

    pub async fn option_id(&self) -> &Option<String> {
        &self.row().option_id
    }

    pub async fn reason(&self, ctx: &Context<'_>) -> Result<Option<ReasonOptionNode>> {
        let loader = ctx.get_loader::<DataLoader<ReasonOptionLoader>>();

        let reason_option_id = match &self.row().option_id {
            Some(reason_option_id) => reason_option_id,
            None => return Ok(None),
        };

        let result = loader.load_one(reason_option_id.clone()).await?;

        Ok(result.map(ReasonOptionNode::from_domain))
    }

    pub async fn available_stock_on_hand(&self) -> &f64 {
        &self.row().available_stock_on_hand
    }

    pub async fn requisition_number(&self) -> &i64 {
        &self.requisition_row().requisition_number
    }

    pub async fn item_information(
        &self,
        ctx: &Context<'_>,
    ) -> Result<Option<Vec<RequisitionItemInformationNode>>> {
        let (program_id, period_id) = match (
            &self.requisition_row().program_id,
            &self.requisition_row().period_id,
        ) {
            (Some(program_id), Some(period_id)) => (program_id, period_id),
            _ => return Ok(None),
        };

        let program_loader = ctx.get_loader::<DataLoader<ProgramByIdLoader>>();
        let program = match program_loader.load_one(program_id.clone()).await? {
            Some(program) => program,
            None => {
                return Err(
                    StandardGraphqlError::InternalError("Program not found".to_string()).extend(),
                )
            }
        };

        let loader = ctx.get_loader::<DataLoader<RequisitionItemInfoLoader>>();
        let result = loader
            .load_one(RequisitionItemInfoLoaderInput::new(
                &self.requisition_row().store_id,
                &self.item_row().id,
                (
                    program_id.clone(),
                    program.elmis_code.clone(),
                    period_id.clone(),
                ),
            ))
            .await?;

        Ok(result.map(RequisitionItemInformationNode::from_vec))
    }
}

impl RequisitionLineNode {
    pub fn from_domain(requisition_line: RequisitionLine) -> RequisitionLineNode {
        RequisitionLineNode { requisition_line }
    }
}

impl RequisitionLineConnector {
    pub fn from_vec(requisition_lines: Vec<RequisitionLine>) -> RequisitionLineConnector {
        RequisitionLineConnector {
            total_count: usize_to_u32(requisition_lines.len()),
            nodes: requisition_lines
                .into_iter()
                .map(RequisitionLineNode::from_domain)
                .collect(),
        }
    }
}

impl RequisitionLineNode {
    pub fn row(&self) -> &RequisitionLineRow {
        &self.requisition_line.requisition_line_row
    }
    pub fn requisition_row(&self) -> &RequisitionRow {
        &self.requisition_line.requisition_row
    }
    pub fn item_row(&self) -> &ItemRow {
        &self.requisition_line.item_row
    }
}

#[derive(PartialEq, Debug)]
pub struct RequisitionItemInformationNode {
    pub requisition_item_information: RequisitionItemInformation,
}

#[Object]
impl RequisitionItemInformationNode {
    pub async fn id(&self) -> &str {
        &self.requisition_item_information.id
    }

    pub async fn amc_in_units(&self) -> f64 {
        self.requisition_item_information.amc_in_units
    }

    pub async fn stock_in_units(&self) -> f64 {
        self.requisition_item_information.stock_in_units
    }

    pub async fn adjustments_in_units(&self) -> f64 {
        self.requisition_item_information.adjustments_in_units
    }

    pub async fn date_range(&self) -> Option<DateTime<Utc>> {
        self.requisition_item_information
            .date_range
            .map(|naive_date| DateTime::<Utc>::from_naive_utc_and_offset(naive_date, Utc))
    }

    pub async fn outgoing_in_units(&self) -> f64 {
        self.requisition_item_information.outgoing_in_units
    }

    pub async fn name(&self, ctx: &Context<'_>, store_id: String) -> Result<NameNode> {
        let loader = ctx.get_loader::<DataLoader<NameByIdLoader>>();

        let response_option = loader
            .load_one(NameByIdLoaderInput::new(
                &store_id,
                &self.requisition_item_information.id,
            ))
            .await?;

        response_option.map(NameNode::from_domain).ok_or(
            StandardGraphqlError::InternalError(format!(
                "Cannot find name with id {}",
                self.requisition_item_information.id
            ))
            .extend(),
        )
    }
}

impl RequisitionItemInformationNode {
    pub fn from_domain(requisition_item_information: RequisitionItemInformation) -> Self {
        RequisitionItemInformationNode {
            requisition_item_information,
        }
    }

    pub fn from_vec(requisition_item_information: Vec<RequisitionItemInformation>) -> Vec<Self> {
        requisition_item_information
            .into_iter()
            .map(RequisitionItemInformationNode::from_domain)
            .collect()
    }
}

#[cfg(test)]
mod test {
    use async_graphql::{EmptyMutation, Object};

    use graphql_core::{assert_graphql_query, test_helpers::setup_graphql_test_with_data};
    use repository::{
        mock::{mock_item_a, mock_item_b, mock_item_c, mock_item_d, MockDataInserts},
        RequisitionLine,
    };
    use serde_json::json;
    use util::inline_init;

    use crate::types::RequisitionLineNode;

    #[actix_rt::test]
    async fn graphql_requisition_line_quantity_remaining_to_supply() {
        use repository::mock::test_remaining_to_supply as TestData;
        #[derive(Clone)]
        struct TestQuery;
        let (_, _, _, settings) = setup_graphql_test_with_data(
            TestQuery,
            EmptyMutation,
            "graphql_requisition_line_quantity_remaining_to_supply",
            MockDataInserts::all(),
            TestData::test_remaining_to_supply(),
        )
        .await;

        #[Object]
        impl TestQuery {
            pub async fn test_query1(&self) -> RequisitionLineNode {
                RequisitionLineNode {
                    requisition_line: inline_init(|r: &mut RequisitionLine| {
                        r.requisition_line_row = TestData::line_to_supply_q5();
                        r.requisition_row = TestData::requisition();
                        r.item_row = mock_item_a();
                    }),
                }
            }

            pub async fn test_query2(&self) -> RequisitionLineNode {
                RequisitionLineNode {
                    requisition_line: inline_init(|r: &mut RequisitionLine| {
                        r.requisition_line_row = TestData::line_to_supply_q2();
                        r.requisition_row = TestData::requisition();
                        r.item_row = mock_item_b();
                    }),
                }
            }

            pub async fn test_query3(&self) -> RequisitionLineNode {
                RequisitionLineNode {
                    requisition_line: inline_init(|r: &mut RequisitionLine| {
                        r.requisition_line_row = TestData::line_to_supply_q1();
                        r.requisition_row = TestData::requisition();
                        r.item_row = mock_item_c();
                    }),
                }
            }

            pub async fn test_query4(&self) -> RequisitionLineNode {
                RequisitionLineNode {
                    requisition_line: inline_init(|r: &mut RequisitionLine| {
                        r.requisition_line_row = TestData::line_to_supply_q0();
                        r.requisition_row = TestData::requisition();
                        r.item_row = mock_item_d();
                    }),
                }
            }
        }

        let query = r#"
        query { 
            testQuery1 {
                ...testFragment
            }
            testQuery2 {
                ...testFragment
            }
            testQuery3 {
                ...testFragment
            }
            testQuery4 {
                ...testFragment
            }
        }
        fragment testFragment on RequisitionLineNode {
            id
            remainingQuantityToSupply
        }
        "#;

        let expected = json!({
            "testQuery1": {
                "id":  TestData::line_to_supply_q5().id,
                "remainingQuantityToSupply": 5.0
            },
            "testQuery2": {
                "id":  TestData::line_to_supply_q2().id,
                "remainingQuantityToSupply": 2.0
            },
            "testQuery3": {
                "id":  TestData::line_to_supply_q1().id,
                "remainingQuantityToSupply": 1.0
            },
            "testQuery4": {
                "id":  TestData::line_to_supply_q0().id,
                "remainingQuantityToSupply": 0.0
            }
        }
        );

        assert_graphql_query!(&settings, query, &None, &expected, None);
    }
}
