use async_graphql::*;
use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use repository::email_queue_row::EmailQueueRow;
use service::{
    auth::{Resource, ResourceAccessRequest},
    bug_report::{BugReportError as ServiceError, InsertBugReport as ServiceInput},
};

#[derive(InputObject)]
pub struct InsertBugReportInput {
    pub description: String,
    /// Client app version
    pub app_version: Option<String>,
    /// Client platform/type, e.g. WEB, DESKTOP, ANDROID
    pub platform: Option<String>,
    /// Attach a gzipped sqlite database snapshot (sqlite servers only)
    pub include_database: bool,
    /// Attach server log files (defaults to true)
    pub include_logs: Option<bool>,
    /// PNG screenshot, base64 encoded (no data: prefix needed)
    pub screenshot_base64: Option<String>,
}

pub struct InsertBugReportNode {
    email: EmailQueueRow,
}

#[Object]
impl InsertBugReportNode {
    /// Id of the queued email (email_queue row)
    pub async fn id(&self) -> &str {
        &self.email.id
    }

    /// Recipient the report will be emailed to
    pub async fn to_address(&self) -> &str {
        &self.email.to_address
    }

    pub async fn attachment_count(&self) -> i32 {
        self.email
            .attachment_paths
            .as_deref()
            .and_then(|paths| serde_json::from_str::<Vec<String>>(paths).ok())
            .map(|paths| paths.len() as i32)
            .unwrap_or(0)
    }
}

#[derive(Union)]
#[graphql(name = "InsertBugReportResponse")]
pub enum InsertBugReportResponse {
    Response(InsertBugReportNode),
}

impl InsertBugReportInput {
    fn to_domain(self) -> ServiceInput {
        let InsertBugReportInput {
            description,
            app_version,
            platform,
            include_database,
            include_logs,
            screenshot_base64,
        } = self;

        ServiceInput {
            description,
            app_version,
            platform,
            include_database,
            include_logs: include_logs.unwrap_or(true),
            screenshot_base64,
        }
    }
}

pub fn insert_bug_report(
    ctx: &Context<'_>,
    store_id: &str,
    input: InsertBugReportInput,
) -> Result<InsertBugReportResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateContactForm,
            store_id: Some(store_id.to_string()),
            require_central_standalone: false,
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;
    let client_ip = ctx.get_client_ip();

    let result = service_provider.bug_report_service.insert_bug_report(
        &service_context,
        service_provider,
        client_ip,
        input.to_domain(),
    );

    match result {
        Ok(email) => Ok(InsertBugReportResponse::Response(InsertBugReportNode {
            email,
        })),
        Err(error) => map_error(error),
    }
}

fn map_error(error: ServiceError) -> Result<InsertBugReportResponse> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{error:#?}");

    let graphql_error = match error {
        ServiceError::DescriptionNotProvided
        | ServiceError::InvalidScreenshot(_)
        | ServiceError::DatabaseSnapshotNotSupported => BadUserInput(formatted_error),

        ServiceError::AttachmentError(_)
        | ServiceError::EmailServiceError(_)
        | ServiceError::DatabaseError(_)
        | ServiceError::InternalError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
