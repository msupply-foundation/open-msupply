use async_graphql::*;

#[derive(PartialEq, Debug, SimpleObject)]
pub struct PluginNode {
    pub config: String,
    pub name: String,
    pub path: String,
}
