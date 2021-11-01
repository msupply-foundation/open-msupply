use crate::domain::{
    name::{Name, NameFilter},
    SimpleStringFilter,
};

use async_graphql::*;

use super::{Connector, ConnectorError, SimpleStringFilterInput, SortInput};

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(remote = "crate::domain::name::NameSortField")]
pub enum NameSortFieldInput {
    Name,
    Code,
}
pub type NameSortInput = SortInput<NameSortFieldInput>;

#[derive(InputObject, Clone)]
pub struct NameFilterInput {
    /// Filter by name
    pub name: Option<SimpleStringFilterInput>,
    /// Filter by code
    pub code: Option<SimpleStringFilterInput>,
    /// Filter by customer property
    pub is_customer: Option<bool>,
    /// Filter by supplier property
    pub is_supplier: Option<bool>,
}

impl From<NameFilterInput> for NameFilter {
    fn from(f: NameFilterInput) -> Self {
        NameFilter {
            id: None,
            name: f.name.map(SimpleStringFilter::from),
            code: f.code.map(SimpleStringFilter::from),
            is_customer: f.is_customer,
            is_supplier: f.is_supplier,
        }
    }
}

#[derive(PartialEq, Debug)]
pub struct NameNode {
    pub name: Name,
}

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

type CurrentConnector = Connector<NameNode>;

#[derive(Union)]
pub enum NamesResponse {
    Error(ConnectorError),
    Response(CurrentConnector),
}

impl From<Name> for NameNode {
    fn from(name: Name) -> Self {
        NameNode { name }
    }
}
