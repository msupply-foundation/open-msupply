use async_graphql::*;
use graphql_core::ContextExt;
use service::plugin::{asking_host_or_legacy, FrontendPluginMetadata};

#[derive(PartialEq, Debug, SimpleObject)]
pub struct FrontendPluginMetadataNode {
    pub code: String,
    pub path: String,
    /// Hash of the plugin's bundled file contents — clients append this as a
    /// cache-busting URL token (?v=...) so the browser only refetches when the
    /// bundle's bytes change.
    pub hash: String,
}

/// The frontend plugins this server will serve to the asking client.
///
/// The client has to say which front end it is, because the server cannot work
/// it out: several hosts are served concurrently and permanently by one binary
/// — the SolidJS front end at `/`, the React UI at the never-synced `/old-ui/`
/// escape hatch — so the answer differs per request, not per server. Whether a
/// bundle is new enough is a different question and is not asked here: that is
/// the plugin's `version` against the server's, settled when the bundle is
/// loaded.
///
/// `host_runtime` is nullable only for backwards compatibility, and has no live
/// caller: omitting it means the React UI as it shipped before any of this
/// existed, which is what an in-flight old-UI build sends. Every client in tree
/// declares itself explicitly.
pub fn frontend_plugin_metadata(
    ctx: &Context<'_>,
    host_runtime: Option<String>,
) -> Result<Vec<FrontendPluginMetadataNode>, Error> {
    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context()?;

    let plugins = service_provider
        .plugin_service
        .get_frontend_plugins_metadata(&context, &asking_host_or_legacy(host_runtime))
        .into_iter()
        .map(FrontendPluginMetadataNode::from_domain)
        .collect();

    Ok(plugins)
}

impl FrontendPluginMetadataNode {
    fn from_domain(
        FrontendPluginMetadata {
            id,
            code,
            entry_point,
            hash,
            ..
        }: FrontendPluginMetadata,
    ) -> Self {
        Self {
            // Addressed by row id, not by code: two bundles of one code can be
            // installed at once and their entry files commonly share a name
            // (`civ_plugins.js` in both), so the code alone no longer picks out
            // a bundle. Clients use this path verbatim.
            path: format!("{id}/{entry_point}"),
            code,
            hash,
        }
    }
}
