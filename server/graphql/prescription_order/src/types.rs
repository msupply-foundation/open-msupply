use async_graphql::dataloader::DataLoader;
use async_graphql::*;
use chrono::{DateTime, Utc};
use graphql_core::loader::{
    AllowedCustomFieldKeysByScopeLoader, ClinicianLoader, ClinicianLoaderInput, DiagnosisLoader,
    ItemLoader, PatientLoader, PrescriptionOrderLinesByOrderIdLoader, ProgramByIdLoader,
    UserLoader,
};
use graphql_core::ContextExt;
use graphql_types::types::program::{patient::PatientNode, program_node::ProgramNode};
use graphql_types::types::{
    filter_custom_fields, ClinicianNode, DiagnosisNode, ItemNode, UserNode,
};
use repository::{PrescriptionOrder, PrescriptionOrderLineRow, PrescriptionOrderRow};
use service::prescription_order::update::PRESCRIPTION_ORDER_CUSTOM_FIELD_SCOPE;
use service::ListResult;

pub struct PrescriptionOrderNode {
    pub prescription_order: PrescriptionOrder,
}

#[derive(SimpleObject)]
pub struct PrescriptionOrderConnector {
    pub total_count: u32,
    pub nodes: Vec<PrescriptionOrderNode>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
#[graphql(remote = "repository::db_diesel::prescription_order_row::PrescriptionOrderStatus")]
pub enum PrescriptionOrderNodeStatus {
    New,
    ReadyToDispense,
    Dispensed,
}

#[Object]
impl PrescriptionOrderNode {
    pub async fn id(&self) -> &str {
        &self.row().id
    }
    pub async fn store_id(&self) -> &str {
        &self.row().store_id
    }
    pub async fn prescription_order_number(&self) -> i64 {
        self.row().prescription_order_number
    }
    pub async fn status(&self) -> PrescriptionOrderNodeStatus {
        PrescriptionOrderNodeStatus::from(self.row().status.clone())
    }
    pub async fn created_datetime(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_naive_utc_and_offset(self.row().created_datetime, Utc)
    }
    pub async fn prescription_datetime(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_naive_utc_and_offset(self.row().prescription_datetime, Utc)
    }
    pub async fn ready_datetime(&self) -> Option<DateTime<Utc>> {
        self.row()
            .ready_datetime
            .map(|v| DateTime::<Utc>::from_naive_utc_and_offset(v, Utc))
    }
    pub async fn dispensed_datetime(&self) -> Option<DateTime<Utc>> {
        self.row()
            .dispensed_datetime
            .map(|v| DateTime::<Utc>::from_naive_utc_and_offset(v, Utc))
    }
    pub async fn comment(&self) -> &Option<String> {
        &self.row().comment
    }

    pub async fn patient_id(&self) -> &str {
        &self.row().patient_id
    }
    pub async fn patient(&self, ctx: &Context<'_>) -> Result<Option<PatientNode>> {
        let loader = ctx.get_loader::<DataLoader<PatientLoader>>();
        let result = loader
            .load_one(self.row().patient_id.clone())
            .await?
            .map(|patient| PatientNode {
                store_id: self.row().store_id.clone(),
                allowed_ctx: vec![],
                patient,
            })
            .ok_or(Error::new(format!(
                "Failed to load patient: {}",
                self.row().patient_id
            )))?;
        Ok(Some(result))
    }

    pub async fn clinician_id(&self) -> &Option<String> {
        &self.row().clinician_link_id
    }
    pub async fn clinician(&self, ctx: &Context<'_>) -> Result<Option<ClinicianNode>> {
        let Some(clinician_id) = &self.row().clinician_link_id else {
            return Ok(None);
        };
        let loader = ctx.get_loader::<DataLoader<ClinicianLoader>>();
        Ok(loader
            .load_one(ClinicianLoaderInput::new(
                &self.row().store_id,
                clinician_id,
            ))
            .await?
            .map(ClinicianNode::from_domain))
    }

    pub async fn diagnosis_id(&self) -> &Option<String> {
        &self.row().diagnosis_id
    }
    pub async fn diagnosis(&self, ctx: &Context<'_>) -> Result<Option<DiagnosisNode>> {
        let Some(diagnosis_id) = &self.row().diagnosis_id else {
            return Ok(None);
        };
        let loader = ctx.get_loader::<DataLoader<DiagnosisLoader>>();
        Ok(loader
            .load_one(diagnosis_id.to_string())
            .await?
            .map(DiagnosisNode::from_domain))
    }

    pub async fn program_id(&self) -> &Option<String> {
        &self.row().program_id
    }
    pub async fn program(&self, ctx: &Context<'_>) -> Result<Option<ProgramNode>> {
        let Some(program_id) = self.row().program_id.clone() else {
            return Ok(None);
        };
        let loader = ctx.get_loader::<DataLoader<ProgramByIdLoader>>();
        Ok(loader
            .load_one(program_id)
            .await?
            .map(|program| ProgramNode {
                program_row: program,
            }))
    }

    pub async fn user(&self, ctx: &Context<'_>) -> Result<Option<UserNode>> {
        let loader = ctx.get_loader::<DataLoader<UserLoader>>();
        Ok(loader
            .load_one(self.row().created_by.clone())
            .await?
            .map(UserNode::from_domain))
    }

    /// Properties-v2 values, filtered to the keys visible for the
    /// "prescription_order" scope
    pub async fn custom_fields(&self, ctx: &Context<'_>) -> Result<Option<serde_json::Value>> {
        let Some(raw) = self.row().custom_fields.clone() else {
            return Ok(None);
        };
        let loader = ctx.get_loader::<DataLoader<AllowedCustomFieldKeysByScopeLoader>>();
        let allowed_keys = loader
            .load_one(PRESCRIPTION_ORDER_CUSTOM_FIELD_SCOPE.to_string())
            .await?
            .unwrap_or_default();
        Ok(Some(filter_custom_fields(raw, &allowed_keys)))
    }

    pub async fn lines(&self, ctx: &Context<'_>) -> Result<PrescriptionOrderLineConnector> {
        let loader = ctx.get_loader::<DataLoader<PrescriptionOrderLinesByOrderIdLoader>>();
        let lines = loader
            .load_one(self.row().id.clone())
            .await?
            .unwrap_or_default();
        Ok(PrescriptionOrderLineConnector::from_vec(lines))
    }
}

impl PrescriptionOrderNode {
    pub fn from_domain(prescription_order: PrescriptionOrder) -> PrescriptionOrderNode {
        PrescriptionOrderNode { prescription_order }
    }

    pub fn row(&self) -> &PrescriptionOrderRow {
        &self.prescription_order.prescription_order_row
    }
}

impl PrescriptionOrderConnector {
    pub fn from_domain(orders: ListResult<PrescriptionOrder>) -> PrescriptionOrderConnector {
        PrescriptionOrderConnector {
            total_count: orders.count,
            nodes: orders
                .rows
                .into_iter()
                .map(PrescriptionOrderNode::from_domain)
                .collect(),
        }
    }
}

pub struct PrescriptionOrderLineNode {
    pub line: PrescriptionOrderLineRow,
}

#[derive(SimpleObject)]
pub struct PrescriptionOrderLineConnector {
    pub total_count: u32,
    pub nodes: Vec<PrescriptionOrderLineNode>,
}

#[Object]
impl PrescriptionOrderLineNode {
    pub async fn id(&self) -> &str {
        &self.line.id
    }
    pub async fn prescription_order_id(&self) -> &str {
        &self.line.prescription_order_id
    }
    pub async fn item_id(&self) -> &str {
        &self.line.item_id
    }
    pub async fn item(&self, ctx: &Context<'_>) -> Result<Option<ItemNode>> {
        let loader = ctx.get_loader::<DataLoader<ItemLoader>>();
        Ok(loader
            .load_one(self.line.item_id.clone())
            .await?
            .map(ItemNode::from_domain))
    }
    /// Prescribed quantity in units
    pub async fn quantity(&self) -> f64 {
        self.line.quantity
    }
    /// Directions
    pub async fn note(&self) -> &Option<String> {
        &self.line.note
    }
}

impl PrescriptionOrderLineNode {
    pub fn from_domain(line: PrescriptionOrderLineRow) -> PrescriptionOrderLineNode {
        PrescriptionOrderLineNode { line }
    }
}

impl PrescriptionOrderLineConnector {
    pub fn from_vec(lines: Vec<PrescriptionOrderLineRow>) -> PrescriptionOrderLineConnector {
        PrescriptionOrderLineConnector {
            total_count: lines.len() as u32,
            nodes: lines
                .into_iter()
                .map(PrescriptionOrderLineNode::from_domain)
                .collect(),
        }
    }
}
