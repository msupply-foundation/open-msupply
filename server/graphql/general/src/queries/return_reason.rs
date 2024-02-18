use std::vec;

use async_graphql::*;

#[derive(SimpleObject, Clone)]
pub struct ReturnReasonNode {
    pub id: String,
    pub reason: String,
    pub is_active: bool,
}

pub fn return_reasons() -> Result<Vec<ReturnReasonNode>> {
    Ok(vec![
        ReturnReasonNode {
            id: "damaged_reason_id".to_string(),
            reason: "Damaged".to_string(),
            is_active: true,
        },
        ReturnReasonNode {
            id: "expired_reason_id".to_string(),
            reason: "Expired".to_string(),
            is_active: true,
        },
        ReturnReasonNode {
            id: "wrong_reason_id".to_string(),
            reason: "Wrong item".to_string(),
            is_active: true,
        },
        ReturnReasonNode {
            id: "other_reason_id".to_string(),
            reason: "Other".to_string(),
            is_active: true,
        },
    ])
}
