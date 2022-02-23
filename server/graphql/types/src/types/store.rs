use async_graphql::*;
use repository::schema::StoreRow;

#[derive(PartialEq, Debug)]
pub struct StoreNode {
    store: StoreRow,
}

#[Object]
impl StoreNode {
    pub async fn id(&self) -> &str {
        &self.store.id
    }

    pub async fn code(&self) -> &str {
        &self.store.code
    }
}

impl From<StoreRow> for StoreNode {
    fn from(store: StoreRow) -> Self {
        StoreNode { store }
    }
}
