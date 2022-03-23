use async_graphql::*;
use chrono::{NaiveDate, Utc};
use dataloader::DataLoader;
use repository::{schema::NameRow, Name};

use graphql_core::{loader::StoreByIdLoader, simple_generic_errors::NodeError, ContextExt};

use super::StoreNode;

#[Object]
impl NameNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }

    pub async fn name(&self) -> &str {
        &self.row().name
    }

    pub async fn code(&self) -> &str {
        &self.row().code
    }

    pub async fn is_customer(&self) -> bool {
        self.name.is_customer()
    }

    pub async fn is_supplier(&self) -> bool {
        self.name.is_supplier()
    }

    pub async fn is_visible(&self) -> bool {
        self.name.is_visible()
    }

    pub async fn is_system_name(&self) -> bool {
        self.name.is_system_name()
    }

    pub async fn store(&self, ctx: &Context<'_>) -> Result<Option<StoreNode>> {
        let store_id = match self.name.store_id() {
            Some(store_id) => store_id,
            None => return Ok(None),
        };

        let loader = ctx.get_loader::<DataLoader<StoreByIdLoader>>();
        Ok(loader
            .load_one(store_id.to_string())
            .await?
            .map(StoreNode::from_domain))
    }

    // Mock

    pub async fn phone(&self) -> &str {
        "+64 932184910"
    }

    pub async fn charge_code(&self) -> &str {
        &self.row().code
    }

    pub async fn comment(&self) -> &str {
        "For billing contact Sam"
    }

    pub async fn country(&self) -> &str {
        "UK"
    }

    pub async fn address(&self) -> &str {
        "10 Downing Street"
    }

    pub async fn email(&self) -> &str {
        "mock@moc.ki.ng"
    }

    pub async fn website(&self) -> &str {
        "https://moc.ki.ng"
    }

    pub async fn is_manufacturer(&self) -> bool {
        true
    }

    pub async fn is_donor(&self) -> bool {
        false
    }

    pub async fn created_date(&self) -> Option<NaiveDate> {
        Some(NaiveDate::from_ymd(2010, 02, 28))
    }

    pub async fn is_on_hold(&self) -> bool {
        false
    }
}

#[derive(Union)]
pub enum NameResponse {
    Error(NodeError),
    Response(NameNode),
}

#[derive(PartialEq, Debug)]
pub struct NameNode {
    pub name: Name,
}

impl NameNode {
    pub fn from_domain(name: Name) -> NameNode {
        NameNode { name }
    }

    pub fn row(&self) -> &NameRow {
        &self.name.name_row
    }
}
