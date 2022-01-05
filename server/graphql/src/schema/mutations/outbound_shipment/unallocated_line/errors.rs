use async_graphql::*;
pub struct UnallocatedLinesOnlyEditableInNewInvoice;
#[Object]
impl UnallocatedLinesOnlyEditableInNewInvoice {
    pub async fn description(&self) -> &'static str {
        "Can only insert or edit unallocated lines in new invoice"
    }
}

pub struct UnallocatedLineForItemAlreadyExists;
#[Object]
impl UnallocatedLineForItemAlreadyExists {
    pub async fn description(&self) -> &'static str {
        "Unallocated line already exists for this item"
    }
}
