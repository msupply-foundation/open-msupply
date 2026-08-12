use std::{
    collections::HashMap,
    sync::{Arc, RwLock},
    time::Instant,
};

use base64::{prelude::BASE64_STANDARD, Engine};
use log::{error, info};
use repository::{
    migrations::Version, BackendPluginRowRepository, FrontendPluginFile, FrontendPluginRow,
    FrontendPluginRowRepository, HostRuntime, PluginType, RepositoryError,
    LEGACY_HOST_RUNTIME, LEGACY_PLUGIN_API_VERSION,
};
use serde::Deserialize;
use sha2::{Digest, Sha256};
use thiserror::Error;

use crate::{
    backend_plugin::{
        plugin_provider::{PluginBundle, PluginError, PluginInstance},
        types::graphql_query,
    },
    processors::ProcessorType,
    service_provider::ServiceContext,
    settings::Settings,
    UploadedFile, UploadedFileJsonError,
};

pub(crate) const SIGNATURE_TAG: &str = "SIGNATURE";
pub(crate) const CERTIFICATE_TAG: &str = "CERTIFICATE";
pub(crate) const PRIVATE_KEY_TAG: &str = "PRIVATE KEY";

pub(crate) const SHA256_NAME: &str = "sha-256";
pub(crate) const VERIFICATION_ALGO_PSS: &str = "pss";

pub(crate) const PLUGIN_FILE_DIR: &str = "plugins";
pub(crate) const PLUGIN_CERT_DIR: &str = "plugin_certs";
pub(crate) const MANIFEST_FILE: &str = "manifest.json";
pub(crate) const MANIFEST_SIGNATURE_FILE: &str = "manifest.signature";
pub(crate) const PLUGIN_FILE: &str = "plugin.json";

pub mod manifest;
pub mod plugin_files;
pub mod validation;

#[derive(Error, Debug)]
pub enum InstallUploadedPluginError {
    #[error(transparent)]
    UploadedFileJsonError(#[from] UploadedFileJsonError),
    #[error(transparent)]
    DatabaseError(#[from] RepositoryError),
}

#[derive(Error, Debug)]
pub enum UninstallPluginError {
    #[error("Plugin not found")]
    PluginNotFound,
    #[error(transparent)]
    DatabaseError(#[from] RepositoryError),
}

#[derive(Clone, Debug)]
pub struct UninstallPluginResult {
    pub id: String,
    pub code: String,
    pub kind: InstalledPluginKind,
}
#[derive(Error, Debug)]
pub enum PluginGraphqlQueryError {
    #[error(transparent)]
    PluginError(#[from] PluginError),
    #[error("Graphql query plugin with specified code not found")]
    NotFound,
}

#[derive(Clone, Debug)]
pub struct FrontendPluginMetadata {
    pub id: String,
    pub code: String,
    pub version: Version,
    pub entry_point: String,
    /// Which front end can load this bundle, and where on that front end's
    /// plugin-API number line it sits. Matched against the pair the asking
    /// client declares — see [`HostPluginApi::accepts`].
    pub host_runtime: String,
    pub plugin_api_version: i32,
    /// Hex-encoded SHA-256 of the concatenated file contents — used as a
    /// cache-busting URL token so the browser only refetches when the bundle
    /// actually changes.
    pub hash: String,
}

#[derive(Debug)]
pub struct FrontendPlugin {
    metadata: FrontendPluginMetadata,
    /// In FrontendPluginRow.files file content is stored as base64_string
    /// This structure will help cache and server file content as a string
    files_content: HashMap<String /* file name */, Vec<u8>>,
}

/// Every server-compatible frontend plugin currently installed, keyed by ROW
/// ID rather than by code.
///
/// One code can be present several times over: while the new front end is
/// rolling out, a site holds two bundles of the same plugin — a React one for
/// the old UI and an ESM one for the new — and has to hand each host the one
/// it can load. Keying by code would mean choosing between them at bind time,
/// before anyone has asked, which is exactly the choice that cannot be made
/// then. Narrowing to one bundle per code is discovery's job instead, once the
/// asking client has declared what it can load
/// (`get_frontend_plugins_metadata`).
#[derive(Clone)]
pub struct FrontendPluginCache(Arc<RwLock<HashMap<String /* plugin row id */, FrontendPlugin>>>);

impl FrontendPluginCache {
    pub(crate) fn new() -> Self {
        Self(Arc::new(RwLock::new(HashMap::new())))
    }
}

/// What a client declares about itself when it asks for the installed set: the
/// plugin host runtime it is, and the two integers its own loader gates on.
///
/// The server cannot infer any of it. Several front ends are served
/// concurrently and permanently by one binary — the SolidJS one at `/`, the
/// React one at the never-synced `/old-ui/` escape hatch — so "which host is
/// asking?" is a property of the request, not of the server. Adding a third is
/// a client-side change plus bundles that name it; nothing here needs to learn
/// its name.
#[derive(Clone, Debug)]
pub struct HostPluginApi {
    /// The plugin host runtime this client is (`react`, `solid`, ...), matched
    /// for exact equality against the bundle's own.
    pub runtime: String,
    /// The plugin API this host provides. A bundle above it is refused: the
    /// host cannot provide a surface it does not have.
    pub version: i32,
    /// The oldest plugin API this host still accepts. A bundle below it is
    /// refused: the surface it was built against is gone.
    pub min_supported: i32,
}

impl Default for HostPluginApi {
    /// A caller that declares nothing at all is the React UI as it shipped
    /// before any of this existed — the only client that was ever allowed not
    /// to declare. Kept purely so an in-flight old-UI build keeps working; the
    /// old UI in this repo now sends the triple explicitly.
    fn default() -> Self {
        Self {
            runtime: LEGACY_HOST_RUNTIME.to_string(),
            version: LEGACY_PLUGIN_API_VERSION,
            min_supported: LEGACY_PLUGIN_API_VERSION,
        }
    }
}

impl HostPluginApi {
    /// Whether this host can load `bundle`.
    ///
    /// Runtime first, because the integer is only comparable within a runtime —
    /// API `1` on the SolidJS number line and API `1` on some future
    /// plain-JavaScript one are unrelated facts, and comparing them would hand
    /// a host a bundle whose components it cannot render.
    ///
    /// The two integer comparisons then mirror the client-side gate
    /// (`src/plugins/validate.ts` in open-msupply-frontend) exactly. Applying
    /// it here as well is not redundant: client-side the bundle has already
    /// been fetched and evaluated by the time it is refused, and the server
    /// goes on advertising a plugin nothing can use.
    fn accepts(&self, bundle: &FrontendPluginMetadata) -> bool {
        self.runtime == bundle.host_runtime
            && bundle.plugin_api_version <= self.version
            && bundle.plugin_api_version >= self.min_supported
    }
}

#[derive(Deserialize, Debug)]
pub struct FrontendPluginFileRequest {
    /// The plugin ROW id, not its code — two bundles of one code are live at
    /// once and their entry files share a name, so the code alone no longer
    /// addresses a bundle. Clients never build this themselves: they use the
    /// `path` discovery handed them.
    plugin_id: String,
    filename: String,
}

#[derive(Debug, Error)]
pub enum FrontendPluginFileRequestError {
    #[error("Plugin id can't be found")]
    CannotFindPluginId,
    #[error("Plugin file can't be found")]
    CannotFindFile,
}

/// A unified view of an installed plugin (backend or frontend)
#[derive(Clone, Debug)]
pub struct InstalledPlugin {
    pub id: String,
    pub code: String,
    pub version: String,
    pub kind: InstalledPluginKind,
    pub types: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum InstalledPluginKind {
    Backend,
    Frontend,
}

/// Decode a stored row into a servable plugin, or `None` if this server cannot
/// serve it — either because the compatibility gate rejects it or because the
/// row does not decode.
///
/// The one *gate* here is the server axis — the plugin's `version` against the
/// binary's own, by (major, minor). It is deliberately the ONLY compatibility
/// question settled at load time: it depends on nothing but the server, so it
/// can be answered once, whereas which host the bundle suits cannot be known
/// until a host asks (`get_frontend_plugins_metadata`).
///
/// A row whose file contents are not valid base64 is dropped with an error
/// rather than panicking. Its bundle is unservable either way, but the caller
/// rebuilds the WHOLE cache from the table, so a panic here would take every
/// other installed plugin down with it — and would do so again on every
/// subsequent change to the table, since the bad row is still there.
fn prepare_frontend_plugin(
    FrontendPluginRow {
        id,
        code,
        entry_point,
        files,
        version,
        host_runtime: HostRuntime(host_runtime),
        plugin_api_version,
        ..
    }: FrontendPluginRow,
) -> Option<FrontendPlugin> {
    let version = Version::from_str(&version);
    if !version.is_compatible_by_major_and_minor(&Version::from_package_json()) {
        return None;
    }

    let mut files_content = HashMap::new();
    for FrontendPluginFile {
        file_name,
        file_content_base64,
    } in files.0.into_iter()
    {
        let content = match BASE64_STANDARD.decode(file_content_base64) {
            Ok(content) => content,
            Err(error) => {
                error!(
                    "Frontend plugin {id} ({code}@{version}) not loaded: file {file_name} is not valid base64: {error}"
                );
                return None;
            }
        };

        files_content.insert(file_name, content);
    }

    // Hash all files (sorted by name for stability) so the URL token only
    // changes when the bundle's bytes change.
    let mut hasher = Sha256::new();
    let mut file_names: Vec<&String> = files_content.keys().collect();
    file_names.sort();
    for name in file_names {
        hasher.update(name.as_bytes());
        hasher.update(&files_content[name]);
    }
    let hash = hex::encode(hasher.finalize());

    Some(FrontendPlugin {
        metadata: FrontendPluginMetadata {
            id,
            code,
            version,
            entry_point,
            host_runtime,
            plugin_api_version,
            hash,
        },
        files_content,
    })
}

// TODO should really pass through StaticFileService
pub trait PluginServiceTrait: Sync + Send {
    fn installed_plugins(
        &self,
        ctx: &ServiceContext,
    ) -> Result<Vec<InstalledPlugin>, RepositoryError> {
        let mut plugins = Vec::new();

        let backend_repo = BackendPluginRowRepository::new(&ctx.connection);
        for row in backend_repo.all()? {
            plugins.push(InstalledPlugin {
                id: row.id,
                code: row.code,
                version: row.version,
                kind: InstalledPluginKind::Backend,
                types: row.types.0.iter().filter_map(|t| {
                    serde_json::to_value(t).ok().and_then(|v| v.as_str().map(ToString::to_string))
                }).collect(),
            });
        }

        let frontend_repo = FrontendPluginRowRepository::new(&ctx.connection);
        for row in frontend_repo.all()? {
            plugins.push(InstalledPlugin {
                id: row.id,
                code: row.code,
                version: row.version,
                kind: InstalledPluginKind::Frontend,
                types: row.types.0,
            });
        }

        Ok(plugins)
    }

    fn get_uploaded_plugin_info(
        &self,
        settings: &Settings,
        uploaded_file: UploadedFile,
    ) -> Result<PluginBundle, UploadedFileJsonError> {
        uploaded_file.as_json_file(settings)
    }

    fn reload_all_plugins(&self, ctx: &ServiceContext) -> Result<(), RepositoryError> {
        let repo = BackendPluginRowRepository::new(&ctx.connection);
        for row in repo.all()? {
            PluginInstance::bind(row);
        }

        self.reload_frontend_plugins(ctx)
    }

    /// Rebuild the whole frontend serving cache from the DB and swap it in.
    ///
    /// A rebuild rather than an incremental bind, because the cache now holds
    /// every compatible version of every code and so has no way to reconcile
    /// itself against a delete: nothing in a single changed row says which of
    /// the entries already cached should go. Rebuilding also settles the
    /// question the old incremental path left open (#12169) — an uninstall now
    /// stops the bundle being served at the next processor run, rather than at
    /// the next server restart. The cost is re-decoding and re-hashing every
    /// installed bundle whenever any one of them changes, which is a rare
    /// event over a small number of small files.
    fn reload_frontend_plugins(&self, ctx: &ServiceContext) -> Result<(), RepositoryError> {
        let started = Instant::now();
        let rows = FrontendPluginRowRepository::new(&ctx.connection).all()?;
        let row_count = rows.len();

        let mut rebuilt = HashMap::new();
        for row in rows {
            let Some(plugin) = prepare_frontend_plugin(row) else {
                continue;
            };
            rebuilt.insert(plugin.metadata.id.clone(), plugin);
        }

        let served: Vec<String> = {
            let mut served: Vec<String> = rebuilt
                .values()
                .map(|p| {
                    format!(
                        "{}@{} ({} api {})",
                        p.metadata.code,
                        p.metadata.version,
                        p.metadata.host_runtime,
                        p.metadata.plugin_api_version,
                    )
                })
                .collect();
            served.sort();
            served
        };

        // Swap under the write lock, so a request either sees the whole old
        // set or the whole new one.
        *ctx.frontend_plugins_cache.0.write().unwrap() = rebuilt;

        info!(
            "Loaded {} of {} installed frontend plugins in {:?}: [{}]",
            served.len(),
            row_count,
            started.elapsed(),
            served.join(", "),
        );

        Ok(())
    }

    fn get_frontend_plugin_file(
        &self,
        ctx: &ServiceContext,
        FrontendPluginFileRequest {
            plugin_id,
            filename,
        }: &FrontendPluginFileRequest,
    ) -> Result<Vec<u8>, FrontendPluginFileRequestError> {
        use FrontendPluginFileRequestError as Error;
        let plugins = ctx.frontend_plugins_cache.0.read().unwrap();

        let plugin = plugins.get(plugin_id).ok_or(Error::CannotFindPluginId)?;

        let file_content = plugin
            .files_content
            .get(filename)
            .ok_or(Error::CannotFindFile)?;

        Ok(file_content.clone())
    }

    /// The installed set as seen by ONE asking host.
    ///
    /// Two narrowings, in this order, and the order is the point:
    ///
    /// 1. Drop the bundles this host cannot load ([`HostPluginApi::accepts`]).
    /// 2. Of what is left, keep the highest version per code.
    ///
    /// Doing (2) first — which is what binding used to do — is what made a
    /// second bundle of the same code unservable: the loser was gone before
    /// anyone asked, so no filter here could hand it back. Ties on version are
    /// broken by id purely so the answer is stable.
    ///
    /// One consequence worth knowing when a host raises its API but keeps its
    /// floor, so that it accepts two of its own generations at once: (2) ranks
    /// by the plugin's `version` alone, never by the API integer. A plugin that
    /// ships `4.0.1` against API 1 and `4.0.0` against API 2 will therefore be
    /// served its API-1 bundle, which loads with a downlevel warning and is
    /// almost certainly not what was intended. The rule that avoids it is on
    /// the publishing side: a plugin's own version line and its API line must
    /// move forward together.
    fn get_frontend_plugins_metadata(
        &self,
        ctx: &ServiceContext,
        host: &HostPluginApi,
    ) -> Vec<FrontendPluginMetadata> {
        let plugins = ctx.frontend_plugins_cache.0.read().unwrap();

        let mut highest_per_code: HashMap<String, FrontendPluginMetadata> = HashMap::new();
        for metadata in plugins.values().map(|p| &p.metadata) {
            if !host.accepts(metadata) {
                continue;
            }

            match highest_per_code.get(&metadata.code) {
                Some(best) if (&best.version, &best.id) >= (&metadata.version, &metadata.id) => {}
                _ => {
                    highest_per_code.insert(metadata.code.clone(), metadata.clone());
                }
            }
        }

        highest_per_code.into_values().collect()
    }

    fn install_uploaded_plugin(
        &self,
        ctx: &ServiceContext,
        settings: &Settings,
        uploaded_file: UploadedFile,
    ) -> Result<PluginBundle, InstallUploadedPluginError> {
        let plugin_bundle: PluginBundle = uploaded_file.as_json_file(settings)?;
        let result_bundle = ctx
            .connection
            .transaction_sync::<_, RepositoryError, _>(|connection| {
                let backend_repo = BackendPluginRowRepository::new(connection);
                let frontend_repo = FrontendPluginRowRepository::new(connection);

                for row in plugin_bundle.backend_plugins.clone() {
                    backend_repo.upsert_one(row.clone())?;
                }

                for row in plugin_bundle.frontend_plugins.clone() {
                    frontend_repo.upsert_one(row.clone())?;
                }

                Ok(plugin_bundle)
            })
            .map_err(|error| error.to_inner_error())?;

        ctx.processors_trigger
            .trigger_processor(ProcessorType::LoadPlugin);
        Ok(result_bundle)
    }

    fn uninstall_plugin(
        &self,
        ctx: &ServiceContext,
        id: &str,
    ) -> Result<UninstallPluginResult, UninstallPluginError> {
        let result = ctx
            .connection
            .transaction_sync::<_, UninstallPluginError, _>(|connection| {
                // Look up in both tables so callers don't need to know the kind.
                let backend_repo = BackendPluginRowRepository::new(connection);
                if let Some(row) = backend_repo.find_one_by_id(id)? {
                    backend_repo.delete(id)?;
                    return Ok(UninstallPluginResult {
                        id: row.id,
                        code: row.code,
                        kind: InstalledPluginKind::Backend,
                    });
                }

                let frontend_repo = FrontendPluginRowRepository::new(connection);
                if let Some(row) = frontend_repo.find_one_by_id(id)? {
                    frontend_repo.delete(id)?;
                    return Ok(UninstallPluginResult {
                        id: row.id,
                        code: row.code,
                        kind: InstalledPluginKind::Frontend,
                    });
                }

                Err(UninstallPluginError::PluginNotFound)
            })
            .map_err(|error| error.to_inner_error())?;

        ctx.processors_trigger
            .trigger_processor(ProcessorType::LoadPlugin);
        Ok(result)
    }

    fn plugin_graphql_query(
        &self,
        store_id: String,
        plugin_code: &str,
        input: serde_json::Value,
    ) -> Result<serde_json::Value, PluginGraphqlQueryError> {
        use PluginGraphqlQueryError as Error;
        let plugin = PluginInstance::get_one_with_code(plugin_code, PluginType::GraphqlQuery)
            .ok_or(Error::NotFound)?;

        Ok(graphql_query::Trait::call(
            &(*plugin),
            graphql_query::Input { store_id, input },
        )?)
    }
}

pub struct PluginService;
impl PluginServiceTrait for PluginService {}

#[cfg(test)]
mod test {
    use crate::{
        backend_plugin::plugin_provider::PluginBundle,
        static_files::{StaticFileCategory, StaticFileService},
        test_helpers::{setup_all_with_data_and_service_provider, ServiceTestContext},
        UploadedFile,
    };
    use repository::{
        mock::{MockData, MockDataInserts},
        BackendPluginRow, BackendPluginRowRepository, ChangelogCondition, ChangelogRepository,
        ChangelogTableName, CursorAndLimit, FilterBuilder, FrontendPluginFile, FrontendPluginFiles,
        FrontendPluginRow, FrontendPluginRowRepository, FrontendPluginTypes, HostRuntime,
        PluginType,
        PluginTypes, RowActionType,
    };

    use super::{
        FrontendPluginFileRequest, FrontendPluginFileRequestError, HostPluginApi,
        InstalledPluginKind, UninstallPluginError,
    };

    #[actix_rt::test]
    async fn installed_plugins() {
        let backend_row = BackendPluginRow {
            id: "backend-1".to_string(),
            code: "my_backend_plugin".to_string(),
            version: "1.2.3".to_string(),
            types: PluginTypes(vec![
                PluginType::AverageMonthlyConsumption,
                PluginType::GetConsumption,
            ]),
            ..Default::default()
        };

        let ServiceTestContext {
            service_provider,
            service_context,
            connection,
            ..
        } = setup_all_with_data_and_service_provider(
            "installed_plugins",
            MockDataInserts::none(),
            MockData {
                backend_plugin: vec![backend_row.clone()],
                ..Default::default()
            },
        )
        .await;

        // Insert a frontend plugin directly (no MockData field for frontend plugins)
        let frontend_row = FrontendPluginRow {
            id: "frontend-1".to_string(),
            code: "my_frontend_plugin".to_string(),
            version: "2.0.0".to_string(),
            types: FrontendPluginTypes(vec!["report".to_string(), "dashboard".to_string()]),
            ..Default::default()
        };
        FrontendPluginRowRepository::new(&connection)
            .upsert_one(frontend_row.clone())
            .unwrap();

        let mut plugins = service_provider
            .plugin_service
            .installed_plugins(&service_context)
            .unwrap();

        // Sort for deterministic ordering
        plugins.sort_by(|a, b| a.id.cmp(&b.id));

        assert_eq!(plugins.len(), 2);

        let backend = &plugins[0];
        assert_eq!(backend.id, "backend-1");
        assert_eq!(backend.code, "my_backend_plugin");
        assert_eq!(backend.version, "1.2.3");
        assert_eq!(backend.kind, InstalledPluginKind::Backend);
        // Verify serde snake_case formatting, not Rust Debug (e.g. not "AverageMonthlyConsumption")
        assert_eq!(
            backend.types,
            vec!["average_monthly_consumption", "get_consumption"]
        );

        let frontend = &plugins[1];
        assert_eq!(frontend.id, "frontend-1");
        assert_eq!(frontend.code, "my_frontend_plugin");
        assert_eq!(frontend.version, "2.0.0");
        assert_eq!(frontend.kind, InstalledPluginKind::Frontend);
        assert_eq!(frontend.types, vec!["report", "dashboard"]);
    }

    #[actix_rt::test]
    async fn install_uploaded_plugin() {
        let first = BackendPluginRow {
            id: "first".to_string(),
            ..Default::default()
        };

        let ServiceTestContext {
            service_provider,
            service_context,
            settings,
            connection,
            ..
        } = setup_all_with_data_and_service_provider(
            "install_uploaded_plugin",
            MockDataInserts::none(),
            MockData {
                backend_plugin: vec![
                    first.clone(),
                    BackendPluginRow {
                        id: "second".to_string(),
                        ..Default::default()
                    },
                ],
                ..Default::default()
            },
        )
        .await;
        // Encoded "nothing here"
        let nothing_here = "bm90aGluZyBoZXJl".to_string();

        // TODO static files service should really be in service provider or somewhere it can be reached without going through settings

        // Save bundle file
        let file_service = StaticFileService::new(&settings.server.base_dir).unwrap();
        let test_bundle = PluginBundle {
            backend_plugins: vec![BackendPluginRow {
                // Encoded "nothing here"
                bundle_base64: nothing_here.clone(),
                id: "second".to_string(),
                ..Default::default()
            }],
            ..Default::default()
        };
        let bundle_stringified = serde_json::to_string(&test_bundle).unwrap();

        let file = file_service
            .store_file(
                "test_install_uploaded_plugin",
                StaticFileCategory::Temporary,
                bundle_stringified.as_bytes(),
            )
            .unwrap();

        service_provider
            .plugin_service
            .install_uploaded_plugin(
                &service_context,
                &settings,
                UploadedFile { file_id: file.id },
            )
            .unwrap();

        // Make sure only "second" was replaced with new bundle_base64
        let result = BackendPluginRowRepository::new(&connection).all().unwrap();
        assert_eq!(
            result,
            vec![
                first,
                BackendPluginRow {
                    bundle_base64: nothing_here.clone(),
                    ..result[1].clone()
                }
            ]
        )
    }

    #[actix_rt::test]
    async fn uninstall_plugin() {
        let backend_row = BackendPluginRow {
            id: "backend-to-delete".to_string(),
            code: "doomed_backend".to_string(),
            version: "1.0.0".to_string(),
            ..Default::default()
        };
        let frontend_row = FrontendPluginRow {
            id: "frontend-to-delete".to_string(),
            code: "doomed_frontend".to_string(),
            version: "1.0.0".to_string(),
            types: FrontendPluginTypes(vec!["report".to_string()]),
            ..Default::default()
        };

        let ServiceTestContext {
            service_provider,
            service_context,
            connection,
            ..
        } = setup_all_with_data_and_service_provider(
            "uninstall_plugin",
            MockDataInserts::none(),
            MockData {
                backend_plugin: vec![backend_row.clone()],
                ..Default::default()
            },
        )
        .await;
        FrontendPluginRowRepository::new(&connection)
            .upsert_one(frontend_row.clone())
            .unwrap();

        let changelog_repo = ChangelogRepository::new(&connection);
        // Cursor after the upserts so we only inspect changelog rows produced
        // by the uninstall_plugin calls below.
        let cursor_before_uninstall = changelog_repo
            .query(
                ChangelogCondition::True(),
                CursorAndLimit {
                    cursor: 0,
                    limit: i64::MAX,
                },
            )
            .unwrap()
            .rows
            .last()
            .map(|r| r.cursor)
            .unwrap_or(0);

        // Backend
        let backend_result = service_provider
            .plugin_service
            .uninstall_plugin(&service_context, &backend_row.id)
            .unwrap();
        assert_eq!(backend_result.id, backend_row.id);
        assert_eq!(backend_result.code, backend_row.code);
        assert_eq!(backend_result.kind, InstalledPluginKind::Backend);
        assert_eq!(
            BackendPluginRowRepository::new(&connection)
                .find_one_by_id(&backend_row.id)
                .unwrap(),
            None
        );

        // Frontend
        let frontend_result = service_provider
            .plugin_service
            .uninstall_plugin(&service_context, &frontend_row.id)
            .unwrap();
        assert_eq!(frontend_result.id, frontend_row.id);
        assert_eq!(frontend_result.code, frontend_row.code);
        assert_eq!(frontend_result.kind, InstalledPluginKind::Frontend);
        assert_eq!(
            FrontendPluginRowRepository::new(&connection)
                .find_one_by_id(&frontend_row.id)
                .unwrap(),
            None
        );

        // Each uninstall must have produced exactly one Delete-action changelog
        // row (and no Upsert rows) for its table.
        let backend_changelogs = changelog_repo
            .query(
                ChangelogCondition::table_name::equal(ChangelogTableName::BackendPlugin),
                CursorAndLimit {
                    cursor: cursor_before_uninstall,
                    limit: i64::MAX,
                },
            )
            .unwrap()
            .rows;
        let backend_new: Vec<_> = backend_changelogs
            .into_iter()
            .filter(|c| c.cursor > cursor_before_uninstall && c.record_id == backend_row.id)
            .collect();
        assert_eq!(backend_new.len(), 1);
        assert_eq!(backend_new[0].row_action, RowActionType::Delete);

        let frontend_changelogs = changelog_repo
            .query(
                ChangelogCondition::table_name::equal(ChangelogTableName::FrontendPlugin),
                CursorAndLimit {
                    cursor: cursor_before_uninstall,
                    limit: i64::MAX,
                },
            )
            .unwrap()
            .rows;
        let frontend_new: Vec<_> = frontend_changelogs
            .into_iter()
            .filter(|c| c.cursor > cursor_before_uninstall && c.record_id == frontend_row.id)
            .collect();
        assert_eq!(frontend_new.len(), 1);
        assert_eq!(frontend_new[0].row_action, RowActionType::Delete);

        // Unknown id surfaces as PluginNotFound, not as a silent no-op.
        let err = service_provider
            .plugin_service
            .uninstall_plugin(&service_context, "no-such-plugin")
            .unwrap_err();
        assert!(matches!(err, UninstallPluginError::PluginNotFound));
    }

    /// One bundle of `civ_plugins`, as installed. `(host_runtime,
    /// plugin_api_version)` is the axis under test — which front end the bundle
    /// is for, and where on that front end's number line it sits.
    fn civ_bundle(
        id: &str,
        version: &str,
        host_runtime: &str,
        plugin_api_version: i32,
    ) -> FrontendPluginRow {
        FrontendPluginRow {
            id: id.to_string(),
            code: "civ_plugins".to_string(),
            version: version.to_string(),
            // Both bundles' entry file is named after the code — which is why
            // the file route cannot be keyed on the code.
            entry_point: "civ_plugins.js".to_string(),
            types: FrontendPluginTypes(vec!["prescriptionPaymentForm".to_string()]),
            files: FrontendPluginFiles(vec![FrontendPluginFile {
                file_name: "civ_plugins.js".to_string(),
                // Encoded "nothing here"
                file_content_base64: "bm90aGluZyBoZXJl".to_string(),
            }]),
            host_runtime: HostRuntime(host_runtime.to_string()),
            plugin_api_version,
        }
    }

    /// The two hosts in the field today, and a third that does not exist —
    /// present to pin down that a runtime the server has never heard of is
    /// served correctly, and is never crossed with the others.
    fn react_ui() -> HostPluginApi {
        HostPluginApi::default()
    }

    fn solid_ui(version: i32, min_supported: i32) -> HostPluginApi {
        HostPluginApi {
            runtime: "solid".to_string(),
            version,
            min_supported,
        }
    }

    fn discovered_ids(
        service_provider: &crate::service_provider::ServiceProvider,
        ctx: &crate::service_provider::ServiceContext,
        host: &HostPluginApi,
    ) -> Vec<String> {
        let mut ids: Vec<String> = service_provider
            .plugin_service
            .get_frontend_plugins_metadata(ctx, host)
            .into_iter()
            .map(|m| m.id)
            .collect();
        ids.sort();
        ids
    }

    /// The whole point of the issue: one server, one `frontend_plugin` set,
    /// two hosts live at once, and each is handed the bundle it can load.
    #[actix_rt::test]
    async fn frontend_plugins_are_served_per_asking_host() {
        let ServiceTestContext {
            service_provider,
            service_context,
            connection,
            ..
        } = setup_all_with_data_and_service_provider(
            "frontend_plugins_are_served_per_asking_host",
            MockDataInserts::none(),
            MockData::default(),
        )
        .await;

        let repo = FrontendPluginRowRepository::new(&connection);
        // The React bundle in the field, from before the plugin-API contract.
        repo.upsert_one(civ_bundle("react", "1.0.1", "react", 0))
            .unwrap();
        // The SolidJS bundle, numbered on the server's current major so a 2.x
        // server would refuse it outright.
        repo.upsert_one(civ_bundle("solid", "3.0.0", "solid", 1))
            .unwrap();
        // Built against a plugin API no host here provides.
        repo.upsert_one(civ_bundle("solid_future_api", "3.0.1", "solid", 99))
            .unwrap();
        // A runtime this server has never heard of, at the same API integer as
        // the SolidJS bundle — the integer alone must not be enough to match.
        repo.upsert_one(civ_bundle("vanilla", "3.0.0", "vanilla", 1))
            .unwrap();
        // Built for a server this binary is older than — never servable at all.
        repo.upsert_one(civ_bundle("too_new_for_server", "99.0.0", "solid", 1))
            .unwrap();

        service_provider
            .plugin_service
            .reload_frontend_plugins(&service_context)
            .unwrap();

        // The React UI is answered with the React bundle only — never the ESM
        // ones it cannot evaluate, even though they are the higher version.
        assert_eq!(
            discovered_ids(&service_provider, &service_context, &react_ui()),
            vec!["react".to_string()]
        );

        // The SolidJS front end declares its runtime and pair and is answered
        // with the bundle in range: not the React one, not the one built
        // against a newer API than it provides, and — the point of the
        // runtime field — not the `vanilla` bundle whose API integer would
        // otherwise have satisfied the very same comparisons.
        assert_eq!(
            discovered_ids(&service_provider, &service_context, &solid_ui(1, 1)),
            vec!["solid".to_string()]
        );

        // And the reverse: a host the server knows nothing about is served its
        // own bundles, with no server change required to teach it the name.
        assert_eq!(
            discovered_ids(
                &service_provider,
                &service_context,
                &HostPluginApi {
                    runtime: "vanilla".to_string(),
                    version: 1,
                    min_supported: 1,
                }
            ),
            vec!["vanilla".to_string()]
        );

        // A host whose floor has risen above a bundle's declared API gets
        // nothing, rather than a bundle it would fetch, evaluate and refuse.
        assert_eq!(
            discovered_ids(&service_provider, &service_context, &solid_ui(1, 2)),
            Vec::<String>::new()
        );

        // Every live bundle is addressable, despite sharing an entry filename.
        for id in ["react", "solid", "vanilla"] {
            assert_eq!(
                service_provider
                    .plugin_service
                    .get_frontend_plugin_file(
                        &service_context,
                        &FrontendPluginFileRequest {
                            plugin_id: id.to_string(),
                            filename: "civ_plugins.js".to_string(),
                        }
                    )
                    .unwrap(),
                b"nothing here".to_vec()
            );
        }

        // The server-axis gate is still applied at load time, so a bundle for
        // a newer server is not merely hidden — it was never cached.
        assert!(matches!(
            service_provider.plugin_service.get_frontend_plugin_file(
                &service_context,
                &FrontendPluginFileRequest {
                    plugin_id: "too_new_for_server".to_string(),
                    filename: "civ_plugins.js".to_string(),
                }
            ),
            Err(FrontendPluginFileRequestError::CannotFindPluginId)
        ));
    }

    /// Among the bundles a host CAN load, the highest version still wins —
    /// keeping every version in the cache widened what discovery may choose
    /// from, it did not stop it choosing.
    #[actix_rt::test]
    async fn highest_version_wins_within_one_host() {
        let ServiceTestContext {
            service_provider,
            service_context,
            connection,
            ..
        } = setup_all_with_data_and_service_provider(
            "highest_version_wins_within_one_host",
            MockDataInserts::none(),
            MockData::default(),
        )
        .await;

        let repo = FrontendPluginRowRepository::new(&connection);
        repo.upsert_one(civ_bundle("solid_older", "3.0.0", "solid", 1))
            .unwrap();
        repo.upsert_one(civ_bundle("solid_newer", "3.0.2", "solid", 1))
            .unwrap();
        repo.upsert_one(civ_bundle("react_older", "1.0.0", "react", 0))
            .unwrap();
        repo.upsert_one(civ_bundle("react_newer", "1.0.1", "react", 0))
            .unwrap();

        service_provider
            .plugin_service
            .reload_frontend_plugins(&service_context)
            .unwrap();

        assert_eq!(
            discovered_ids(&service_provider, &service_context, &react_ui()),
            vec!["react_newer".to_string()]
        );
        assert_eq!(
            discovered_ids(&service_provider, &service_context, &solid_ui(1, 1)),
            vec!["solid_newer".to_string()]
        );
    }

    /// Uninstalling a bundle stops it being served without a restart — the
    /// cache is rebuilt from the DB rather than added to.
    #[actix_rt::test]
    async fn uninstall_stops_serving_without_a_restart() {
        let ServiceTestContext {
            service_provider,
            service_context,
            connection,
            ..
        } = setup_all_with_data_and_service_provider(
            "uninstall_stops_serving_without_a_restart",
            MockDataInserts::none(),
            MockData::default(),
        )
        .await;

        let repo = FrontendPluginRowRepository::new(&connection);
        repo.upsert_one(civ_bundle("react", "1.0.1", "react", 0))
            .unwrap();
        repo.upsert_one(civ_bundle("solid", "3.0.0", "solid", 1))
            .unwrap();

        service_provider
            .plugin_service
            .reload_frontend_plugins(&service_context)
            .unwrap();

        service_provider
            .plugin_service
            .uninstall_plugin(&service_context, "solid")
            .unwrap();
        service_provider
            .plugin_service
            .reload_frontend_plugins(&service_context)
            .unwrap();

        assert_eq!(
            discovered_ids(&service_provider, &service_context, &solid_ui(1, 1)),
            Vec::<String>::new()
        );
        // The sibling bundle for the other host is untouched.
        assert_eq!(
            discovered_ids(&service_provider, &service_context, &react_ui()),
            vec!["react".to_string()]
        );
        assert!(matches!(
            service_provider.plugin_service.get_frontend_plugin_file(
                &service_context,
                &FrontendPluginFileRequest {
                    plugin_id: "solid".to_string(),
                    filename: "civ_plugins.js".to_string(),
                }
            ),
            Err(FrontendPluginFileRequestError::CannotFindPluginId)
        ));
    }

    /// A row whose file content will not decode costs its own plugin and
    /// nothing else. Because the cache is rebuilt whole from the table, the
    /// alternative is that one unreadable row ends frontend plugin serving
    /// altogether — and does so again on every later change to the table.
    #[actix_rt::test]
    async fn a_corrupt_bundle_does_not_take_the_cache_down() {
        let ServiceTestContext {
            service_provider,
            service_context,
            connection,
            ..
        } = setup_all_with_data_and_service_provider(
            "a_corrupt_bundle_does_not_take_the_cache_down",
            MockDataInserts::none(),
            MockData::default(),
        )
        .await;

        let mut corrupt = civ_bundle("corrupt", "3.0.1", "solid", 1);
        corrupt.files = FrontendPluginFiles(vec![FrontendPluginFile {
            file_name: "civ_plugins.js".to_string(),
            file_content_base64: "not base64 at all!".to_string(),
        }]);

        let repo = FrontendPluginRowRepository::new(&connection);
        repo.upsert_one(corrupt).unwrap();
        // Lower version than the corrupt row, so it can only be discovered if
        // the corrupt one was dropped rather than merely outranked.
        repo.upsert_one(civ_bundle("solid", "3.0.0", "solid", 1))
            .unwrap();

        service_provider
            .plugin_service
            .reload_frontend_plugins(&service_context)
            .unwrap();

        assert_eq!(
            discovered_ids(&service_provider, &service_context, &solid_ui(1, 1)),
            vec!["solid".to_string()]
        );
        assert_eq!(
            service_provider
                .plugin_service
                .get_frontend_plugin_file(
                    &service_context,
                    &FrontendPluginFileRequest {
                        plugin_id: "solid".to_string(),
                        filename: "civ_plugins.js".to_string(),
                    }
                )
                .unwrap(),
            b"nothing here".to_vec()
        );
        assert!(matches!(
            service_provider.plugin_service.get_frontend_plugin_file(
                &service_context,
                &FrontendPluginFileRequest {
                    plugin_id: "corrupt".to_string(),
                    filename: "civ_plugins.js".to_string(),
                }
            ),
            Err(FrontendPluginFileRequestError::CannotFindPluginId)
        ));
    }
}
