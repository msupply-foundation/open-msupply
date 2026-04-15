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

#[cfg(test)]
mod test {
    use async_graphql::EmptyMutation;
    use graphql_core::{assert_graphql_query, test_helpers::setup_graphql_test};
    use repository::{
        mock::{MockDataInserts, mock_store_a},
        ReportRowRepository,
    };
    use serde_json::json;

    use crate::ReportMutations;

    #[actix_rt::test]
    async fn test_upsert_report_definition_create() {
        let (_, connection, _connection_manager, settings) = setup_graphql_test(
            EmptyMutation,
            ReportMutations,
            "test_upsert_report_definition_create",
            MockDataInserts::none().stores(),
        )
        .await;

        let mutation = r#"mutation UpsertReportDefinition($storeId: String!, $input: UpsertReportDefinitionInput!) {
            upsertReportDefinition(storeId: $storeId, input: $input) {
                id
            }
        }"#;

        let template_json = json!({ "index": { "template": "template.html", "query": [] }, "entries": {} });
        let variables = Some(json!({
            "storeId": mock_store_a().id,
            "input": {
                "name": "My Custom Report",
                "template": template_json,
                "context": "REQUISITION"
            }
        }));

        // Run the mutation - we check the response contains a non-empty id
        let actual = graphql_core::test_helpers::run_test_gql_query(
            &settings,
            mutation,
            &variables,
            None,
        )
        .await;

        let id = actual["data"]["upsertReportDefinition"]["id"]
            .as_str()
            .expect("expected id in response");
        assert!(!id.is_empty(), "id should be non-empty");

        // Verify the row written to the DB has the correct fields
        let repo = ReportRowRepository::new(&connection);
        let row = repo
            .find_one_by_id(id)
            .expect("db error")
            .expect("row should exist");

        assert_eq!(row.name, "My Custom Report");
        assert!(row.is_custom);
        assert!(row.is_active);
        assert_eq!(row.version, "1.0.0");
        assert_eq!(row.code, format!("custom_report_{}", &id[..8]));

        // Template should be the pretty-printed JSON of the input
        let reparsed: serde_json::Value =
            serde_json::from_str(&row.template).expect("template should be valid JSON");
        assert_eq!(reparsed, template_json);
    }

    #[actix_rt::test]
    async fn test_upsert_report_definition_update() {
        let (_, connection, _, settings) = setup_graphql_test(
            EmptyMutation,
            ReportMutations,
            "test_upsert_report_definition_update",
            MockDataInserts::none().stores(),
        )
        .await;

        let mutation = r#"mutation UpsertReportDefinition($storeId: String!, $input: UpsertReportDefinitionInput!) {
            upsertReportDefinition(storeId: $storeId, input: $input) {
                id
            }
        }"#;

        let fixed_id = "fixed-report-id-0001".to_string();
        let template_v1 = json!({ "index": { "template": "t.html", "query": [] }, "entries": {} });
        let template_v2 = json!({ "index": { "template": "t2.html", "query": [] }, "entries": {} });

        // First upsert — create with a fixed id
        let variables = Some(json!({
            "storeId": mock_store_a().id,
            "input": {
                "id": fixed_id,
                "name": "Report V1",
                "template": template_v1,
                "context": "STOCKTAKE",
                "code": "my_report_code"
            }
        }));
        let expected = json!({ "upsertReportDefinition": { "id": fixed_id } });
        assert_graphql_query!(&settings, mutation, &variables, &expected, None);

        // Second upsert — update the same id with a new name/template
        let variables = Some(json!({
            "storeId": mock_store_a().id,
            "input": {
                "id": fixed_id,
                "name": "Report V2",
                "template": template_v2,
                "context": "STOCKTAKE",
                "code": "my_report_code"
            }
        }));
        assert_graphql_query!(&settings, mutation, &variables, &expected, None);

        // Confirm only one row exists and it reflects the latest values
        let repo = ReportRowRepository::new(&connection);
        let row = repo
            .find_one_by_id(&fixed_id)
            .expect("db error")
            .expect("row should exist");

        assert_eq!(row.name, "Report V2");
        let reparsed: serde_json::Value =
            serde_json::from_str(&row.template).expect("template should be valid JSON");
        assert_eq!(reparsed, template_v2);
    }
}
