use std::{
    collections::HashMap,
    sync::{Arc, RwLock},
};

use base64::{prelude::BASE64_STANDARD, Engine};
use repository::{
    migrations::Version, BackendPluginRowRepository, FrontendPluginFile, FrontendPluginRow,
    FrontendPluginRowRepository, PluginType, RepositoryError,
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

#[derive(Clone)]
pub struct FrontendPluginCache(Arc<RwLock<HashMap<String /* plugin code */, FrontendPlugin>>>);

impl FrontendPluginCache {
    pub(crate) fn new() -> Self {
        Self(Arc::new(RwLock::new(HashMap::new())))
    }
}

#[derive(Deserialize, Debug)]
pub struct FrontendPluginFileRequest {
    plugin_code: String,
    filename: String,
}

#[derive(Debug, Error)]
pub enum FrontendPluginFileRequestError {
    #[error("Plugin code can't be found")]
    CannotFindPluginCode,
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

/// Decode a frontend plugin row into its cached form (base64 → bytes + content
/// hash). Used by `reload_frontend_plugins` to build each cache entry.
fn build_frontend_plugin(
    FrontendPluginRow {
        id,
        code,
        entry_point,
        files,
        version,
        ..
    }: FrontendPluginRow,
) -> FrontendPlugin {
    let version = Version::from_str(&version);

    let mut files_content = HashMap::new();
    for FrontendPluginFile {
        file_name,
        file_content_base64,
    } in files.0.into_iter()
    {
        files_content.insert(
            file_name,
            BASE64_STANDARD.decode(file_content_base64).unwrap(),
        );
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

    FrontendPlugin {
        metadata: FrontendPluginMetadata {
            id,
            code,
            version,
            entry_point,
            hash,
        },
        files_content,
    }
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

    /// Atomically rebuild both caches from the DB (build-then-swap). Runs at
    /// startup and on plugin deletes, so downgrades/removals take effect. #12169
    fn reload_all_plugins(&self, ctx: &ServiceContext) -> Result<(), RepositoryError> {
        let backend_rows = BackendPluginRowRepository::new(&ctx.connection).all()?;
        PluginInstance::reload(backend_rows);

        let frontend_rows = FrontendPluginRowRepository::new(&ctx.connection).all()?;
        self.reload_frontend_plugins(ctx, frontend_rows);

        Ok(())
    }

    /// Frontend equivalent of [`PluginInstance::reload`]: build-then-swap
    /// rebuild of the frontend cache from `rows`.
    fn reload_frontend_plugins(&self, ctx: &ServiceContext, rows: Vec<FrontendPluginRow>) {
        let app_version = Version::from_package_json();

        // Highest compatible version per code wins.
        let mut chosen: HashMap<String, FrontendPluginRow> = HashMap::new();
        for row in rows {
            let version = Version::from_str(&row.version);
            if !version.is_compatible_by_major_and_minor(&app_version) {
                continue;
            }
            match chosen.get(&row.code) {
                Some(existing) if Version::from_str(&existing.version) >= version => {}
                _ => {
                    chosen.insert(row.code.clone(), row);
                }
            }
        }

        // Build off to the side, then swap under one write lock.
        let new_cache: HashMap<String, FrontendPlugin> = chosen
            .into_iter()
            .map(|(code, row)| (code, build_frontend_plugin(row)))
            .collect();

        let mut plugins = ctx.frontend_plugins_cache.0.write().unwrap();
        *plugins = new_cache;
    }

    fn get_frontend_plugin_file(
        &self,
        ctx: &ServiceContext,
        FrontendPluginFileRequest {
            plugin_code,
            filename,
        }: &FrontendPluginFileRequest,
    ) -> Result<Vec<u8>, FrontendPluginFileRequestError> {
        use FrontendPluginFileRequestError as Error;
        let plugins = ctx.frontend_plugins_cache.0.read().unwrap();

        let plugin = plugins
            .get(plugin_code)
            .ok_or(Error::CannotFindPluginCode)?;

        let file_content = plugin
            .files_content
            .get(filename)
            .ok_or(Error::CannotFindFile)?;

        Ok(file_content.clone())
    }

    fn get_frontend_plugins_metadata(&self, ctx: &ServiceContext) -> Vec<FrontendPluginMetadata> {
        let plugins = ctx.frontend_plugins_cache.0.read().unwrap();

        plugins.values().map(|p| p.metadata.clone()).collect()
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
        BackendPluginRow, BackendPluginRowRepository, ChangelogFilter, ChangelogRepository,
        ChangelogTableName, FrontendPluginRow, FrontendPluginRowRepository, FrontendPluginTypes,
        PluginType, PluginTypes, RowActionType,
    };

    use super::{InstalledPluginKind, UninstallPluginError};

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
            .changelogs(0, u32::MAX, None)
            .unwrap()
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
            .changelogs(
                cursor_before_uninstall as u64,
                u32::MAX,
                Some(
                    ChangelogFilter::new().table_name(ChangelogTableName::BackendPlugin.equal_to()),
                ),
            )
            .unwrap();
        let backend_new: Vec<_> = backend_changelogs
            .into_iter()
            .filter(|c| c.cursor > cursor_before_uninstall && c.record_id == backend_row.id)
            .collect();
        assert_eq!(backend_new.len(), 1);
        assert_eq!(backend_new[0].row_action, RowActionType::Delete);

        let frontend_changelogs = changelog_repo
            .changelogs(
                cursor_before_uninstall as u64,
                u32::MAX,
                Some(
                    ChangelogFilter::new()
                        .table_name(ChangelogTableName::FrontendPlugin.equal_to()),
                ),
            )
            .unwrap();
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

}
