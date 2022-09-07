use async_graphql::{dataloader::DataLoader, *};
use chrono::{DateTime, Utc};
use graphql_core::{
    generic_filters::{DatetimeFilterInput, EqualFilterStringInput},
    loader::{DocumentLoader, DocumentLoaderInput},
    standard_graphql_error::StandardGraphqlError,
    ContextExt,
};
use repository::{
    DatetimeFilter, EncounterFilter, EqualFilter, ProgramEnrolmentRow, ProgramEventFilter,
    ProgramEventSortField, Sort,
};

use super::{document::DocumentNode, encounter::EncounterNode, program_event::ProgramEventNode};

#[derive(InputObject, Clone)]
pub struct ProgramEventFilterInput {
    pub datetime: Option<DatetimeFilterInput>,
    pub context: Option<EqualFilterStringInput>,
    pub group: Option<EqualFilterStringInput>,
    pub r#type: Option<EqualFilterStringInput>,
}

impl ProgramEventFilterInput {
    pub fn to_domain(self) -> ProgramEventFilter {
        ProgramEventFilter {
            datetime: self.datetime.map(DatetimeFilter::from),
            name_id: None,
            context: self.context.map(EqualFilter::from),
            group: self.group.map(EqualFilter::from),
            r#type: self.r#type.map(EqualFilter::from),
        }
    }
}

pub struct ProgramEnrolmentNode {
    pub store_id: String,
    pub program_row: ProgramEnrolmentRow,
}

#[Object]
impl ProgramEnrolmentNode {
    /// The program type
    pub async fn r#type(&self) -> &str {
        &self.program_row.r#type
    }

    /// The program document name
    pub async fn name(&self) -> &str {
        &self.program_row.name
    }

    pub async fn patient_id(&self) -> &str {
        &self.program_row.patient_id
    }

    pub async fn enrolment_datetime(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_utc(self.program_row.enrolment_datetime, Utc)
    }

    pub async fn program_patient_id(&self) -> &Option<String> {
        &self.program_row.program_patient_id
    }

    /// The encounter document
    pub async fn document(&self, ctx: &Context<'_>) -> Result<DocumentNode> {
        let loader = ctx.get_loader::<DataLoader<DocumentLoader>>();

        let result = loader
            .load_one(DocumentLoaderInput {
                store_id: self.store_id.clone(),
                document_name: self.program_row.name.clone(),
            })
            .await?
            .map(|document| DocumentNode { document })
            .ok_or(Error::new("Program without document"))?;

        Ok(result)
    }

    /// The program document
    pub async fn encounters(&self, ctx: &Context<'_>) -> Result<Vec<EncounterNode>> {
        // TODO use loader?
        let context = ctx.service_provider().basic_context()?;
        let entries = ctx
            .service_provider()
            .encounter_service
            .encounters(
                &context,
                None,
                Some(
                    EncounterFilter::new()
                        .patient_id(EqualFilter::equal_to(&self.program_row.patient_id))
                        .program(EqualFilter::equal_to(&self.program_row.r#type)),
                ),
                None,
            )
            .map_err(StandardGraphqlError::from_list_error)?;
        Ok(entries
            .rows
            .into_iter()
            .map(|row| EncounterNode {
                store_id: self.store_id.clone(),
                encounter_row: row,
            })
            .collect())
    }

    pub async fn events(
        &self,
        ctx: &Context<'_>,
        filter: Option<ProgramEventFilterInput>,
    ) -> Result<Vec<ProgramEventNode>> {
        // TODO use loader?
        let context = ctx.service_provider().basic_context()?;
        let filter = filter
            .map(|f| f.to_domain())
            .unwrap_or(ProgramEventFilter::new())
            .name_id(EqualFilter::equal_to(&self.program_row.patient_id))
            .context(EqualFilter::equal_to(&self.program_row.r#type));
        let entries = ctx
            .service_provider()
            .program_event_service
            .events(
                &context,
                None,
                Some(filter),
                Some(Sort {
                    key: ProgramEventSortField::Datetime,
                    desc: Some(true),
                }),
            )
            .map_err(StandardGraphqlError::from_list_error)?;
        Ok(entries
            .rows
            .into_iter()
            .map(|row| ProgramEventNode { row })
            .collect())
    }
}
