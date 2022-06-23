use async_graphql::*;

use super::document::DocumentNode;

pub struct EncounterNode {
    pub patient_id: String,
    pub program: String,
    pub document_node: DocumentNode,
}

#[Object]
impl EncounterNode {
    /// The encounter document
    pub async fn document(&self) -> &DocumentNode {
        &self.document_node
    }
}
