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

/// What the asking client is, and which plugin bundles it can load.
// One object rather than loose arguments, for two reasons. The three fields are
// meaningless apart — a runtime without a version says nothing, a version
// without a runtime says something ambiguous — so requiring them together
// removes a whole class of half-declared request. And it is where a fourth
// field goes if this ever needs one, rather than a fourth positional argument
// on a query that would by then have three.
#[derive(InputObject)]
pub struct HostPluginApiInput {
    /// The plugin host runtime this client is: `react` for the old
    /// module-federation UI, `solid` for the current front end. Matched for
    /// exact equality against the bundle's own, and never interpreted by the
    /// server — a new front end simply declares a new name here, and bundles
    /// built for it declare the same one.
    pub runtime: String,
    /// The plugin API this client provides (`PLUGIN_API_VERSION`). Bundles
    /// above it are not offered.
    pub version: i32,
    /// The oldest plugin API this client still accepts
    /// (`PLUGIN_API_MIN_SUPPORTED`). Bundles below it are not offered.
    pub min_supported: i32,
}

/// The frontend plugins this server will serve to the asking client.
///
/// The client has to declare itself because the server cannot work it out:
/// several hosts are served concurrently and permanently by one binary — the
/// SolidJS front end at `/`, the React UI at the never-synced `/old-ui/`
/// escape hatch — so the answer differs per request, not per server.
///
/// `host` is nullable only for backwards compatibility, and has no live caller:
/// omitting it means the React UI as it shipped before any of this existed
/// (`react`, API 0), which is what an in-flight old-UI build sends. Every
/// client in tree declares itself explicitly.
pub fn frontend_plugin_metadata(
    ctx: &Context<'_>,
    host: Option<HostPluginApiInput>,
) -> Result<Vec<FrontendPluginMetadataNode>, Error> {
    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context()?;

    let host = match host {
        Some(HostPluginApiInput {
            runtime,
            version,
            min_supported,
        }) => HostPluginApi {
            runtime,
            version,
            min_supported,
        },
        None => HostPluginApi::default(),
    };

    let plugins = service_provider
        .plugin_service
        .get_frontend_plugins_metadata(&context, &host)
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
