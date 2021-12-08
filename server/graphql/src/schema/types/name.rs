use domain::name::Name;

use async_graphql::*;

use super::NodeError;

#[Object]
impl NameNode {
    pub async fn id(&self) -> &str {
        &self.name.id
    }

    pub async fn name(&self) -> &str {
        &self.name.name
    }

    pub async fn code(&self) -> &str {
        &self.name.code
    }

    pub async fn is_customer(&self) -> bool {
        self.name.is_customer
    }

    pub async fn is_supplier(&self) -> bool {
        self.name.is_supplier
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

impl From<Name> for NameNode {
    fn from(name: Name) -> Self {
        NameNode { name }
    }
}
