use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use repository::FrontendBundleRow;
use service::{
    auth::{Resource, ResourceAccessRequest},
    frontend_bundle::{self, PublishOutcome},
    UploadedFile,
};
use util::format_error;

/// A published front-end bundle, as the central admin surface sees it.
#[derive(SimpleObject)]
pub struct FrontendBundleNode {
    pub id: String,
    /// The front end's own version — identity and ordering.
    pub version: String,
    /// The server version this bundle was built against. Sites compare this against
    /// their own app version to decide whether they can run the bundle.
    pub server_version: String,
    pub sha256: String,
    /// Cleared to withdraw a bundle from circulation.
    pub is_active: bool,
    pub description: Option<String>,
    pub created_datetime: chrono::NaiveDateTime,
}

impl FrontendBundleNode {
    fn from_domain(row: FrontendBundleRow) -> Self {
        let FrontendBundleRow {
            id,
            version,
            server_version,
            sha256,
            is_active,
            description,
            created_datetime,
        } = row;
        Self {
            id,
            version,
            server_version,
            sha256,
            is_active,
            description,
            created_datetime,
        }
    }
}

/// Result of publishing, so the caller can tell a fresh publish from a no-op
/// (re-uploading an already-published version).
#[derive(SimpleObject)]
pub struct PublishFrontendBundleNode {
    pub bundle: FrontendBundleNode,
    /// False when this version was already published and nothing changed.
    pub published: bool,
}

/// Installing a front-end bundle means shipping executable code to every compatible
/// site, so it is gated on the same server-admin permission as installing a plugin.
fn validate_configure_auth(ctx: &Context<'_>) -> Result<()> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::ConfigurePlugin,
            store_id: None,
            require_central_standalone: false,
        },
    )?;
    Ok(())
}

pub fn frontend_bundles(ctx: &Context<'_>) -> Result<Vec<FrontendBundleNode>> {
    validate_configure_auth(ctx)?;

    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context()?;

    Ok(frontend_bundle::all_bundles(&context)?
        .into_iter()
        .map(FrontendBundleNode::from_domain)
        .collect())
}

pub fn install_uploaded_frontend_bundle(
    ctx: &Context<'_>,
    file_id: String,
    server_version: Option<String>,
) -> Result<PublishFrontendBundleNode> {
    validate_configure_auth(ctx)?;

    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context()?;
    let settings = ctx.get_settings();

    let outcome = frontend_bundle::install_uploaded_bundle(
        &context,
        settings,
        UploadedFile { file_id },
        server_version,
    )
    .map_err(|e| StandardGraphqlError::InternalError(format_error(&e)).extend())?;

    let published = matches!(outcome, PublishOutcome::Published(_));
    Ok(PublishFrontendBundleNode {
        bundle: FrontendBundleNode::from_domain(outcome.row().clone()),
        published,
    })
}

pub fn set_frontend_bundle_active(
    ctx: &Context<'_>,
    id: String,
    is_active: bool,
) -> Result<FrontendBundleNode> {
    validate_configure_auth(ctx)?;

    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context()?;

    frontend_bundle::set_active(&context, &id, is_active)
        .map_err(|e| StandardGraphqlError::InternalError(format_error(&e)).extend())
        .map(FrontendBundleNode::from_domain)
}
