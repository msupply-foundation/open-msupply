use async_graphql::*;
use graphql_core::ContextExt;
use service::plugin::{FrontendPluginMetadata, HostPluginApi};

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
/// The arguments are how a client says which plugin bundles it can load, and
/// both are optional so the wire stays backwards compatible: the old
/// React/module-federation UI sends neither and is answered with the bundles
/// that declare no plugin API either — the only ones it can load. The new
/// front end sends its own `PLUGIN_API_VERSION` / `PLUGIN_API_MIN_SUPPORTED`
/// and is answered with the bundles whose declared integer is in that range.
///
/// The client has to declare it because the server cannot work it out: both
/// hosts are served concurrently and permanently by one binary — the new front
/// end at `/`, the old UI at the never-synced `/old-ui/` escape hatch — so the
/// answer differs per request, not per server.
pub fn frontend_plugin_metadata(
    ctx: &Context<'_>,
    plugin_api_version: Option<i32>,
    plugin_api_min_supported: Option<i32>,
) -> Result<Vec<FrontendPluginMetadataNode>, Error> {
    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context()?;

    let plugins = service_provider
        .plugin_service
        .get_frontend_plugins_metadata(
            &context,
            &HostPluginApi {
                version: plugin_api_version,
                min_supported: plugin_api_min_supported,
            },
        )
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
