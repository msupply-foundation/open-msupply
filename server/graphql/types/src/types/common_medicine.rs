use async_graphql::*;
use service::common_medicine::CommonMedicine;

/// One medicine card on the Simple dispensing screen (#2188).
pub struct CommonMedicineNode {
    pub data: CommonMedicine,
}

#[Object]
impl CommonMedicineNode {
    pub async fn item_id(&self) -> &str {
        &self.data.item_id
    }
    /// The one-press amounts, in the item's own unit. Empty when the card asks
    /// for the amount instead.
    pub async fn amounts(&self) -> &[f64] {
        &self.data.amounts
    }
}

impl CommonMedicineNode {
    pub fn from_domain(data: CommonMedicine) -> CommonMedicineNode {
        CommonMedicineNode { data }
    }
}
