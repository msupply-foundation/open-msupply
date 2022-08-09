use async_graphql::{dataloader::DataLoader, *};
use chrono::{DateTime, Utc};
use graphql_core::{
    loader::{DocumentLoader, DocumentLoaderInput},
    ContextExt,
};
use repository::{EncounterRow, EncounterStatus};
use serde::Serialize;

use super::document::DocumentNode;

pub struct EncounterNode {
    pub store_id: String,
    pub encounter_row: EncounterRow,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")] // only needed to be comparable in tests
pub enum EncounterNodeStatus {
    Scheduled,
    Done,
    Canceled,
}

impl EncounterNodeStatus {
    pub fn to_domain(self) -> EncounterStatus {
        match self {
            EncounterNodeStatus::Scheduled => EncounterStatus::Scheduled,
            EncounterNodeStatus::Done => EncounterStatus::Done,
            EncounterNodeStatus::Canceled => EncounterStatus::Canceled,
        }
    }

    pub fn from_domain(status: &EncounterStatus) -> EncounterNodeStatus {
        match status {
            EncounterStatus::Scheduled => EncounterNodeStatus::Scheduled,
            EncounterStatus::Done => EncounterNodeStatus::Done,
            EncounterStatus::Canceled => EncounterNodeStatus::Canceled,
        }
    }
}

#[Object]
impl EncounterNode {
    pub async fn patient_id(&self) -> &str {
        &self.encounter_row.patient_id
    }

    pub async fn program(&self) -> &str {
        &self.encounter_row.program
    }

    pub async fn r#type(&self) -> &str {
        &self.encounter_row.r#type
    }

    pub async fn name(&self) -> &str {
        &self.encounter_row.name
    }

    pub async fn status(&self) -> Option<EncounterNodeStatus> {
        self.encounter_row
            .status
            .as_ref()
            .map(|status| EncounterNodeStatus::from_domain(status))
    }

    pub async fn start_datetime(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_utc(self.encounter_row.start_datetime, Utc)
    }

    pub async fn end_datetime(&self) -> Option<DateTime<Utc>> {
        self.encounter_row
            .end_datetime
            .map(|t| DateTime::<Utc>::from_utc(t, Utc))
    }

    /// The encounter document
    pub async fn document(&self, ctx: &Context<'_>) -> Result<DocumentNode> {
        let loader = ctx.get_loader::<DataLoader<DocumentLoader>>();

        let result = loader
            .load_one(DocumentLoaderInput {
                store_id: self.store_id.clone(),
                document_name: self.encounter_row.name.clone(),
            })
            .await?
            .map(|document| DocumentNode { document })
            .ok_or(Error::new("Program without document"))?;

        Ok(result)
    }
}
