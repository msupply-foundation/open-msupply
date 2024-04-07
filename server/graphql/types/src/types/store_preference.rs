use async_graphql::*;
use repository::StorePreferenceRow;

// #[derive(Clone)]
#[derive(PartialEq, Debug)]
pub struct StorePreferenceNode {
    store_preference: StorePreferenceRow,
}

#[Object]
impl StorePreferenceNode {
    pub async fn id(&self) -> &str {
        &self.store_preference.id
    }

    pub async fn pack_to_one(&self) -> &bool {
        &self.store_preference.pack_to_one
    }
    pub async fn response_requisition_requires_authorisation(&self) -> &bool {
        &self
            .store_preference
            .response_requisition_requires_authorisation
    }
    pub async fn request_requisition_requires_authorisation(&self) -> &bool {
        &self
            .store_preference
            .request_requisition_requires_authorisation
    }

    pub async fn om_program_module(&self) -> &bool {
        &self.store_preference.om_program_module
    }

    pub async fn vaccine_module(&self) -> &bool {
        &self.store_preference.vaccine_module
    }

    pub async fn issue_in_foreign_currency(&self) -> &bool {
        &self.store_preference.issue_in_foreign_currency
    }
}

impl StorePreferenceNode {
    pub fn from_domain(store_preference: StorePreferenceRow) -> StorePreferenceNode {
        StorePreferenceNode { store_preference }
    }
}
