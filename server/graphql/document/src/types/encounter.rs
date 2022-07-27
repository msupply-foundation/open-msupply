use async_graphql::{dataloader::DataLoader, *};
use graphql_core::{
    loader::{DocumentLoader, DocumentLoaderInput},
    ContextExt,
};
use repository::EncounterStatus;
use serde::Serialize;

use super::document::DocumentNode;

pub struct EncounterNode {
    pub store_id: String,
    pub patient_id: String,
    pub program: String,
    pub name: String,
    pub status: EncounterStatus,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")] // only needed to be comparable in tests
pub enum EncounterNodeStatus {
    Scheduled,
    Ongoing,
    Finished,
    Canceled,
    Missed,
}

impl EncounterNodeStatus {
    pub fn to_domain(self) -> EncounterStatus {
        match self {
            EncounterNodeStatus::Scheduled => EncounterStatus::Scheduled,
            EncounterNodeStatus::Ongoing => EncounterStatus::Ongoing,
            EncounterNodeStatus::Finished => EncounterStatus::Finished,
            EncounterNodeStatus::Canceled => EncounterStatus::Canceled,
            EncounterNodeStatus::Missed => EncounterStatus::Missed,
        }
    }

    pub fn from_domain(status: &EncounterStatus) -> EncounterNodeStatus {
        match status {
            EncounterStatus::Scheduled => EncounterNodeStatus::Scheduled,
            EncounterStatus::Ongoing => EncounterNodeStatus::Ongoing,
            EncounterStatus::Finished => EncounterNodeStatus::Finished,
            EncounterStatus::Canceled => EncounterNodeStatus::Canceled,
            EncounterStatus::Missed => EncounterNodeStatus::Missed,
        }
    }
}

#[Object]
impl EncounterNode {
    pub async fn patient_id(&self) -> &str {
        &self.patient_id
    }

    pub async fn program(&self) -> &str {
        &self.program
    }

    pub async fn name(&self) -> &str {
        &self.name
    }

    pub async fn status(&self) -> EncounterNodeStatus {
        EncounterNodeStatus::from_domain(&self.status)
    }

    /// The encounter document
    pub async fn document(&self, ctx: &Context<'_>) -> Result<DocumentNode> {
        let loader = ctx.get_loader::<DataLoader<DocumentLoader>>();

        let result = loader
            .load_one(DocumentLoaderInput {
                store_id: self.store_id.clone(),
                document_name: self.name.clone(),
            })
            .await?
            .map(|document| DocumentNode { document })
            .ok_or(Error::new("Program without document"))?;

        Ok(result)
    }
}
