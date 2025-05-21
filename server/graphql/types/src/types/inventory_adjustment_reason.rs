use async_graphql::*;
use repository::{ReasonOption, ReasonOptionRow, ReasonOptionType};
use service::ListResult;
#[derive(PartialEq, Debug)]
pub struct InventoryAdjustmentReasonNode {
    inventory_adjustment_reason: ReasonOption,
}

#[derive(SimpleObject)]
pub struct InventoryAdjustmentReasonConnector {
    total_count: u32,
    nodes: Vec<InventoryAdjustmentReasonNode>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
pub enum InventoryAdjustmentReasonNodeType {
    Positive,
    Negative,
}

#[Object]
impl InventoryAdjustmentReasonNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn r#type(&self) -> Result<InventoryAdjustmentReasonNodeType> {
        InventoryAdjustmentReasonNodeType::from_domain(&self.row().r#type)
    }

    pub async fn is_active(&self) -> &bool {
        &self.row().is_active
    }

    pub async fn reason(&self) -> &str {
        &self.row().reason
    }
}

impl InventoryAdjustmentReasonNode {
    pub fn from_domain(inventory_adjustment_reason: ReasonOption) -> Self {
        InventoryAdjustmentReasonNode {
            inventory_adjustment_reason,
        }
    }

    pub fn row(&self) -> &ReasonOptionRow {
        &self.inventory_adjustment_reason.reason_option_row
    }
}

impl InventoryAdjustmentReasonNodeType {
    pub fn from_domain(from: &ReasonOptionType) -> Result<InventoryAdjustmentReasonNodeType> {
        use InventoryAdjustmentReasonNodeType as to;
        use ReasonOptionType as from;

        match from {
            from::PositiveInventoryAdjustment => Ok(to::Positive),
            from::NegativeInventoryAdjustment => Ok(to::Negative),
            _ => Err(Error::new(format!(
                "Invalid inventory adjustment reason type: {:?}",
                from,
            ))),
        }
    }

    pub fn to_domain(self) -> ReasonOptionType {
        use InventoryAdjustmentReasonNodeType as from;
        use ReasonOptionType as to;

        match self {
            from::Positive => to::PositiveInventoryAdjustment,
            from::Negative => to::NegativeInventoryAdjustment,
        }
    }
}

impl InventoryAdjustmentReasonConnector {
    pub fn from_domain(
        inventory_adjustment_reasons: ListResult<ReasonOption>,
    ) -> InventoryAdjustmentReasonConnector {
        InventoryAdjustmentReasonConnector {
            total_count: inventory_adjustment_reasons.count,
            nodes: inventory_adjustment_reasons
                .rows
                .into_iter()
                .map(|inventory_adjustment_reason| {
                    InventoryAdjustmentReasonNode::from_domain(inventory_adjustment_reason)
                })
                .collect(),
        }
    }
}

pub struct AdjustmentReasonNotProvided;

#[Object]
impl AdjustmentReasonNotProvided {
    pub async fn description(&self) -> &str {
        "No adjustment reason provided"
    }
}
pub struct AdjustmentReasonNotValid;

#[Object]
impl AdjustmentReasonNotValid {
    pub async fn description(&self) -> &str {
        "Adjustment reason is not valid for adjustment direction"
    }
}
