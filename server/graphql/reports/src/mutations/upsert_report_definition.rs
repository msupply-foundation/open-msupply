use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use repository::{ContextType, ReportRow, ReportRowRepository};
use service::auth::{Resource, ResourceAccessRequest};
use util::uuid::uuid;

use crate::reports::ReportContext;

#[derive(InputObject)]
pub struct UpsertReportDefinitionInput {
    /// Optional id — if provided, updates the existing report; otherwise creates a new one
    pub id: Option<String>,
    /// Human-readable name for the report
    pub name: String,
    /// The report definition JSON (the same structure used by generateReportDefinition)
    pub template: serde_json::Value,
    /// The report context
    pub context: ReportContext,
    /// Optional comment / description
    pub comment: Option<String>,
    /// A short code to identify the report (used for version grouping).
    /// If not provided, a unique code is generated.
    pub code: Option<String>,
}

#[derive(SimpleObject)]
pub struct UpsertReportDefinitionResponse {
    pub id: String,
}

pub fn upsert_report_definition(
    ctx: &Context<'_>,
    store_id: String,
    input: UpsertReportDefinitionInput,
) -> Result<UpsertReportDefinitionResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::ReportDev,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id, user.user_id)?;

    // Validate that the template is valid JSON (the server will parse it later when resolving)
    let template_string = serde_json::to_string_pretty(&input.template)
        .map_err(|err| StandardGraphqlError::BadUserInput(format!("Invalid template: {err}")).extend())?;

    let id = input.id.unwrap_or_else(uuid);
    let code = input.code.unwrap_or_else(|| format!("custom_report_{}", &id[..8]));

    let context_type: ContextType = ContextType::from(input.context);

    let row = ReportRow {
        id: id.clone(),
        name: input.name,
        template: template_string,
        context: context_type,
        comment: input.comment,
        sub_context: None,
        argument_schema_id: None,
        is_custom: true,
        version: String::from("1.0.0"),
        code,
        is_active: true,
        excel_template_buffer: None,
    };

    ReportRowRepository::new(&service_context.connection)
        .upsert_one(&row)
        .map_err(|err| StandardGraphqlError::InternalError(format!("{err:?}")).extend())?;

    Ok(UpsertReportDefinitionResponse { id: row.id })
}
