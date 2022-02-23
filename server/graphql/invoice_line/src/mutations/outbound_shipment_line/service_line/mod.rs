use async_graphql::*;

pub mod delete;
pub use self::delete::*;

pub mod insert;
pub use self::insert::*;

pub mod update;
pub use self::update::*;

pub struct NotAServiceItem;
#[Object]
impl NotAServiceItem {
    pub async fn description(&self) -> &'static str {
        "Not a service item"
    }
}
