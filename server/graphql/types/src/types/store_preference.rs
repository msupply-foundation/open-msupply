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
    pub async fn requisitions_require_supplier_authorisation(&self) -> &bool {
        &self
            .store_preference
            .requisitions_require_supplier_authorisation
    }
}

impl From<StorePreferenceRow> for StorePreferenceNode {
    fn from(row: StorePreferenceRow) -> Self {
        StorePreferenceNode {
            store_preference: row,
        }
    }
}
