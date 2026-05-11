use async_graphql::*;
use repository::{ProgramRequisitionOrderTypeRow, ProgramRow};
use service::requisition::program_settings::supplier_program_settings::ProgramAndOrderType;

#[derive(PartialEq, Debug)]
pub struct ProgramOrderTypeNode {
    pub order_type: ProgramRequisitionOrderTypeRow,
    pub program: ProgramRow,
}

#[Object]
impl ProgramOrderTypeNode {
    pub async fn id(&self) -> &str {
        &self.order_type.id
    }

    pub async fn name(&self) -> &str {
        &self.order_type.name
    }

    pub async fn threshold_mos(&self) -> f64 {
        self.order_type.threshold_mos
    }

    pub async fn max_mos(&self) -> f64 {
        self.order_type.max_mos
    }

    pub async fn max_order_per_period(&self) -> i32 {
        self.order_type.max_order_per_period
    }

    pub async fn is_emergency(&self) -> bool {
        self.order_type.is_emergency
    }

    pub async fn max_items_in_emergency_order(&self) -> i32 {
        self.order_type.max_items_in_emergency_order
    }

    pub async fn program_id(&self) -> &str {
        &self.program.id
    }
}

impl ProgramOrderTypeNode {
    pub fn from_vec(order_types: Vec<ProgramAndOrderType>) -> Vec<ProgramOrderTypeNode> {
        order_types
            .into_iter()
            .map(ProgramOrderTypeNode::from_domain)
            .collect()
    }

    pub fn from_domain(order_types: ProgramAndOrderType) -> ProgramOrderTypeNode {
        ProgramOrderTypeNode {
            order_type: order_types.order_type,
            program: order_types.program,
        }
    }
}
