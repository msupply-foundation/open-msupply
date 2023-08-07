use async_graphql::{dataloader::DataLoader, *};
use chrono::{DateTime, Utc};
use graphql_core::{
    generic_filters::{DatetimeFilterInput, EqualFilterStringInput, StringFilterInput},
    loader::{
        DocumentByIdLoader, NameByIdLoader, NameByIdLoaderInput, ProgramEnrolmentLoader,
        ProgramEnrolmentLoaderInput,
    },
    map_filter,
    pagination::PaginationInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::{
    document::DocumentNode, program_enrolment::ProgramEnrolmentNode, NameNode,
};
use repository::{
    contact_trace::{ContactTrace, ContactTraceFilter, ContactTraceSort, ContactTraceSortField},
    contact_trace_row::{ContactTraceRow, ContactTraceStatus},
    DatetimeFilter, EqualFilter, PaginationOption, StringFilter,
};
use serde::Serialize;
use service::auth::{Resource, ResourceAccessRequest};

pub struct ContactTraceNode {
    pub store_id: String,
    pub contact_trace: ContactTrace,
    pub allowed_ctx: Vec<String>,
}

#[derive(SimpleObject)]
pub struct ContactTraceConnector {
    pub total_count: u32,
    pub nodes: Vec<ContactTraceNode>,
}

#[derive(InputObject, Clone)]
pub struct EqualFilterContactTraceStatusInput {
    pub equal_to: Option<ContactTraceNodeStatus>,
    pub equal_any: Option<Vec<ContactTraceNodeStatus>>,
    pub not_equal_to: Option<ContactTraceNodeStatus>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(rename_items = "camelCase")]
pub enum ContactTraceSortFieldInput {
    Datetime,
    PatientId,
    ProgramId,
    Status,
    ContactTraceId,
    FirstName,
    LastName,
}

#[derive(InputObject)]
pub struct ContactTraceSortInput {
    /// Sort query result by `key`
    key: ContactTraceSortFieldInput,
    /// Sort query result is sorted descending or ascending (if not provided the default is
    /// ascending)
    desc: Option<bool>,
}

impl ContactTraceSortInput {
    pub fn to_domain(self) -> ContactTraceSort {
        let key = match self.key {
            ContactTraceSortFieldInput::Datetime => ContactTraceSortField::Datetime,
            ContactTraceSortFieldInput::PatientId => ContactTraceSortField::PatientId,
            ContactTraceSortFieldInput::ProgramId => ContactTraceSortField::ProgramId,
            ContactTraceSortFieldInput::Status => ContactTraceSortField::Status,
            ContactTraceSortFieldInput::ContactTraceId => ContactTraceSortField::ContactTraceId,
            ContactTraceSortFieldInput::FirstName => ContactTraceSortField::FirstName,
            ContactTraceSortFieldInput::LastName => ContactTraceSortField::LastName,
        };

        ContactTraceSort {
            key,
            desc: self.desc,
        }
    }
}

#[derive(InputObject, Clone)]
pub struct ContactTraceFilterInput {
    pub id: Option<EqualFilterStringInput>,
    pub program_id: Option<EqualFilterStringInput>,
    pub document_name: Option<StringFilterInput>,
    pub datetime: Option<DatetimeFilterInput>,
    pub root_patient_id: Option<EqualFilterStringInput>,
    pub patient_id: Option<EqualFilterStringInput>,
    pub status: Option<EqualFilterContactTraceStatusInput>,
    pub contact_trace_id: Option<StringFilterInput>,
    pub first_name: Option<StringFilterInput>,
    pub last_name: Option<StringFilterInput>,
}

impl ContactTraceFilterInput {
    pub fn to_domain_filter(self) -> ContactTraceFilter {
        ContactTraceFilter {
            id: self.id.map(EqualFilter::from),
            patient_id: self.patient_id.map(EqualFilter::from),
            program_id: self.program_id.map(EqualFilter::from),
            document_name: self.document_name.map(StringFilter::from),
            datetime: self.datetime.map(DatetimeFilter::from),
            status: self
                .status
                .map(|s| map_filter!(s, ContactTraceNodeStatus::to_domain)),
            contact_trace_id: self.contact_trace_id.map(StringFilter::from),
            first_name: self.first_name.map(StringFilter::from),
            last_name: self.last_name.map(StringFilter::from),
            root_patient_id: self.root_patient_id.map(EqualFilter::from),
            program_context_id: None,
        }
    }
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")] // only needed to be comparable in tests
pub enum ContactTraceNodeStatus {
    Pending,
    Done,
}

impl ContactTraceNodeStatus {
    pub fn to_domain(self) -> ContactTraceStatus {
        match self {
            ContactTraceNodeStatus::Pending => ContactTraceStatus::Pending,
            ContactTraceNodeStatus::Done => ContactTraceStatus::Done,
        }
    }

    pub fn from_domain(status: &ContactTraceStatus) -> ContactTraceNodeStatus {
        match status {
            ContactTraceStatus::Pending => ContactTraceNodeStatus::Pending,
            ContactTraceStatus::Done => ContactTraceNodeStatus::Done,
        }
    }
}

impl ContactTraceNode {
    fn trace_row(&self) -> &ContactTraceRow {
        &self.contact_trace.0
    }
}

#[Object]
impl ContactTraceNode {
    pub async fn id(&self) -> &str {
        &self.trace_row().id
    }

    pub async fn program_id(&self) -> &str {
        &self.trace_row().program_id
    }

    pub async fn document_id(&self) -> &str {
        &self.trace_row().document_id
    }

    pub async fn contact_trace_id(&self) -> Option<String> {
        self.trace_row().contact_trace_id.clone()
    }

    pub async fn patient_id(&self) -> Option<String> {
        self.trace_row().patient_id.clone()
    }

    pub async fn patient(&self, ctx: &Context<'_>) -> Result<Option<NameNode>> {
        let Some(ref patient_id) = self.trace_row().patient_id else {
        return Ok(None)
      };
        let loader = ctx.get_loader::<DataLoader<NameByIdLoader>>();

        let result = loader
            .load_one(NameByIdLoaderInput::new(&self.store_id, patient_id))
            .await?
            .map(NameNode::from_domain)
            .ok_or(Error::new("Contact without patient"))?;

        Ok(Some(result))
    }

    /// Returns the matching program enrolment for the root patient of this contact trace
    pub async fn program_enrolment(
        &self,
        ctx: &Context<'_>,
    ) -> Result<Option<ProgramEnrolmentNode>> {
        let loader = ctx.get_loader::<DataLoader<ProgramEnrolmentLoader>>();

        let result = loader
            .load_one(ProgramEnrolmentLoaderInput::new(
                &self.trace_row().root_patient_id,
                &self.trace_row().program_id,
                self.allowed_ctx.clone(),
            ))
            .await?
            .map(|program_enrolment| ProgramEnrolmentNode {
                store_id: self.store_id.clone(),
                program_enrolment,
                allowed_ctx: self.allowed_ctx.clone(),
            })
            .ok_or(Error::new(format!(
                "Failed to load program enrolment: {}",
                self.trace_row().program_id
            )))?;

        Ok(Some(result))
    }

    pub async fn status(&self) -> ContactTraceNodeStatus {
        ContactTraceNodeStatus::from_domain(&self.trace_row().status)
    }

    pub async fn datetime(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_utc(self.trace_row().datetime, Utc)
    }

    /// The encounter document
    pub async fn document(&self, ctx: &Context<'_>) -> Result<DocumentNode> {
        let loader = ctx.get_loader::<DataLoader<DocumentByIdLoader>>();

        let result = loader
            .load_one(self.trace_row().document_id.clone())
            .await?
            .map(|document| DocumentNode {
                allowed_ctx: self.allowed_ctx.clone(),
                document,
            })
            .ok_or(Error::new("Missing contact trace document"))?;

        Ok(result)
    }

    pub async fn first_name(&self) -> Option<String> {
        self.trace_row().first_name.clone()
    }

    pub async fn last_name(&self) -> Option<String> {
        self.trace_row().last_name.clone()
    }
}

#[derive(Union)]
pub enum ContactTraceResponse {
    Response(ContactTraceConnector),
}

pub fn contact_traces(
    ctx: &Context<'_>,
    store_id: String,
    page: Option<PaginationInput>,
    filter: Option<ContactTraceFilterInput>,
    sort: Option<ContactTraceSortInput>,
) -> Result<ContactTraceResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryContactTrace,
            store_id: Some(store_id.clone()),
        },
    )?;
    let allowed_ctx = user.capabilities();

    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context()?;

    let result = service_provider
        .contact_trace_service
        .contact_traces(
            &context,
            page.map(PaginationOption::from),
            filter.map(|f| f.to_domain_filter()),
            sort.map(ContactTraceSortInput::to_domain),
            allowed_ctx.clone(),
        )
        .map_err(StandardGraphqlError::from_list_error)?;
    let nodes = result
        .rows
        .into_iter()
        .map(|encounter| ContactTraceNode {
            store_id: store_id.clone(),
            contact_trace: encounter,
            allowed_ctx: allowed_ctx.clone(),
        })
        .collect();

    Ok(ContactTraceResponse::Response(ContactTraceConnector {
        total_count: result.count,
        nodes,
    }))
}
