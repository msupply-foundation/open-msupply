use async_graphql::{dataloader::DataLoader, *};
use chrono::{DateTime, Utc};

use graphql_core::{
    loader::{DocumentLoader, PatientLoader},
    ContextExt,
};
use repository::{NameRow, ProgramEvent, ProgramEventRow, ProgramEventSort, ProgramEventSortField};

use super::{document::DocumentNode, patient::PatientNode};

#[derive(SimpleObject)]
pub struct ProgramEventConnector {
    pub total_count: u32,
    pub nodes: Vec<ProgramEventNode>,
}

#[derive(Union)]
pub enum ProgramEventResponse {
    Response(ProgramEventConnector),
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum ProgramEventSortFieldInput {
    Datetime,
    ActiveStartDatetime,
    ActiveEndDatetime,
    DocumentType,
    DocumentName,
    Type,
}

#[derive(InputObject)]
pub struct ProgramEventSortInput {
    /// Sort query result by `key`
    key: ProgramEventSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

impl ProgramEventSortInput {
    pub fn to_domain(self) -> ProgramEventSort {
        let key = match self.key {
            ProgramEventSortFieldInput::Datetime => ProgramEventSortField::Datetime,
            ProgramEventSortFieldInput::ActiveStartDatetime => {
                ProgramEventSortField::ActiveStartDatetime
            }
            ProgramEventSortFieldInput::ActiveEndDatetime => {
                ProgramEventSortField::ActiveEndDatetime
            }
            ProgramEventSortFieldInput::DocumentType => ProgramEventSortField::DocumentType,
            ProgramEventSortFieldInput::DocumentName => ProgramEventSortField::DocumentName,
            ProgramEventSortFieldInput::Type => ProgramEventSortField::Type,
        };

        ProgramEventSort {
            key,
            desc: self.desc,
        }
    }
}

pub struct ProgramEventNode {
    pub store_id: String,
    pub program_event: ProgramEvent,
    pub allowed_ctx: Vec<String>,
}

impl ProgramEventNode {
    fn row(&self) -> &ProgramEventRow {
        &self.program_event.program_event_row
    }

    fn name_row(&self) -> &Option<NameRow> {
        &self.program_event.name_row
    }
}

#[Object]
impl ProgramEventNode {
    pub async fn patient_id(&self) -> Option<String> {
        self.name_row().as_ref().map(|it| it.id.clone())
    }

    pub async fn patient(&self, ctx: &Context<'_>) -> Result<Option<PatientNode>> {
        let Some(patient_id) = self.name_row().as_ref().map(|it| &it.id) else {
            return Ok(None);
        };
        let loader = ctx.get_loader::<DataLoader<PatientLoader>>();

        let result = loader
            .load_one(patient_id.clone())
            .await?
            .map(|patient| PatientNode {
                store_id: self.store_id.clone(),
                allowed_ctx: self.allowed_ctx.clone(),
                patient,
            })
            .ok_or(Error::new(format!(
                "Failed to load patient: {}",
                patient_id
            )))?;

        Ok(Some(result))
    }

    pub async fn datetime(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_naive_utc_and_offset(self.row().datetime, Utc)
    }

    pub async fn active_start_datetime(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_naive_utc_and_offset(self.row().active_start_datetime, Utc)
    }

    pub async fn active_end_datetime(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_naive_utc_and_offset(self.row().active_end_datetime, Utc)
    }

    pub async fn document_type(&self) -> &str {
        &&self.row().document_type
    }

    pub async fn document_name(&self) -> &Option<String> {
        &self.row().document_name
    }

    pub async fn data(&self) -> &Option<String> {
        &self.row().data
    }

    pub async fn r#type(&self) -> &str {
        &self.row().r#type
    }

    /// The document associated with the document_name
    pub async fn document(&self, ctx: &Context<'_>) -> Result<Option<DocumentNode>> {
        let Some(document_name) = self.row().document_name.clone() else {
            return Ok(None);
        };
        let loader = ctx.get_loader::<DataLoader<DocumentLoader>>();

        let result = loader
            .load_one(document_name.clone())
            .await?
            .map(|document| DocumentNode {
                allowed_ctx: self.allowed_ctx.clone(),
                document,
            })
            .ok_or(Error::new(format!(
                "Failed to load document: {}",
                document_name
            )))?;

        Ok(Some(result))
    }
}
