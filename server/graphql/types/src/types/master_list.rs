use async_graphql::Object;
use repository::MasterList;

#[derive(PartialEq, Debug)]
pub struct MasterListNode {
    master_list: MasterList,
}

#[Object]
impl MasterListNode {
    pub async fn id(&self) -> &str {
        &self.master_list.id
    }

    pub async fn name(&self) -> &str {
        &self.master_list.name
    }

    pub async fn code(&self) -> &str {
        &self.master_list.code
    }

    pub async fn description(&self) -> &str {
        &self.master_list.description
    }
}

impl MasterListNode {
    pub fn from_domain(master_list: MasterList) -> Self {
        MasterListNode { master_list }
    }
}
