use async_graphql::*;
use repository::MasterList;

#[derive(PartialEq, Debug)]
pub struct MasterListNode {
    masterlist: MasterList,
}

#[Object]
impl MasterListNode {
    pub async fn id(&self) -> &str {
        &self.masterlist.id
    }

    pub async fn name(&self) -> &str {
        &self.masterlist.name
    }

    pub async fn code(&self) -> &str {
        &self.masterlist.code
    }

    pub async fn description(&self) -> &str {
        &self.masterlist.description
    }
}

impl MasterListNode {
    pub fn from_domain(masterlist: MasterList) -> Self {
        MasterListNode { masterlist }
    }
}
