use async_graphql::*;
use repository::{
    asset_log_reason_row::asset_log_reason::reason,
    inventory_adjustment_reason::InventoryAdjustmentReason, InventoryAdjustmentReasonRow,
    InventoryAdjustmentType, ReasonOption, ReasonOptionType,
};
use service::ListResult;

#[derive(PartialEq, Debug)]
pub struct InventoryAdjustmentReasonNode {
    inventory_adjustment_reason: InventoryAdjustmentReason,
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

    pub async fn r#type(&self) -> InventoryAdjustmentReasonNodeType {
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
    pub fn from_domain(reason_option: ReasonOption) -> Self {
        InventoryAdjustmentReasonNode {
            inventory_adjustment_reason: InventoryAdjustmentReason {
                inventory_adjustment_reason_row: InventoryAdjustmentReasonRow {
                    id: reason_option.reason_option_row.id,
                    is_active: reason_option.reason_option_row.is_active,
                    reason: reason_option.reason_option_row.reason,
                    r#type: match reason_option.reason_option_row.r#type {
                        ReasonOptionType::PositiveInventoryAdjustment => {
                            InventoryAdjustmentType::Positive
                        }
                        ReasonOptionType::NegativeInventoryAdjustment => {
                            InventoryAdjustmentType::Negative
                        }
                        _ => panic!("Unexpected ReasonOptionType"),
                    },
                },
            },
        }
    }

    pub fn row(&self) -> &InventoryAdjustmentReasonRow {
        &self
            .inventory_adjustment_reason
            .inventory_adjustment_reason_row
    }
}

impl InventoryAdjustmentReasonNodeType {
    pub fn from_domain(from: &InventoryAdjustmentType) -> InventoryAdjustmentReasonNodeType {
        use InventoryAdjustmentReasonNodeType as to;
        use InventoryAdjustmentType as from;

        match from {
            from::Positive => to::Positive,
            from::Negative => to::Negative,
        }
    }

    pub fn to_domain(self) -> InventoryAdjustmentType {
        use InventoryAdjustmentReasonNodeType as from;
        use InventoryAdjustmentType as to;

        match self {
            from::Positive => to::Positive,
            from::Negative => to::Negative,
        }
    }
}

impl InventoryAdjustmentReasonConnector {
    pub fn from_domain(
        reason_options: ListResult<ReasonOption>,
    ) -> InventoryAdjustmentReasonConnector {
        InventoryAdjustmentReasonConnector {
            total_count: reason_options.count,
            nodes: reason_options
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
