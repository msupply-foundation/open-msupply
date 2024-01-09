pub mod update;
use async_graphql::Object;
pub use update::*;
pub struct CommentNotProvided;

#[Object]
impl CommentNotProvided {
    pub async fn description(&self) -> &'static str {
        "No comment has been provided for this temperature breach change"
    }
}
