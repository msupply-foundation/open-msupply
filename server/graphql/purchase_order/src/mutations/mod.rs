pub mod add_from_master_list;
pub mod insert;

use service::purchase_order::add_to_purchase_order_from_master_list::AddToPurchaseOrderFromMasterListInput as ServiceInput;

#[derive(async_graphql::InputObject)]
pub struct AddToPurchaseOrderFromMasterListInput {
    pub purchase_order_id: String,
    pub master_list_id: String,
}

impl AddToPurchaseOrderFromMasterListInput {
    pub fn to_domain(self) -> ServiceInput {
        let AddToPurchaseOrderFromMasterListInput {
            purchase_order_id,
            master_list_id,
        } = self;
        ServiceInput {
            purchase_order_id,
            master_list_id,
        }
    }
}
