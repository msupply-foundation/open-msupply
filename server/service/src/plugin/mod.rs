use repository::{BackendPluginRowRepository, RepositoryError};
use thiserror::Error;

use crate::{
    backend_plugin::plugin_provider::{PluginBundle, PluginInstance},
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

// TODO should really pass through StaticFileService
pub trait PluginServiceTrait: Sync + Send {
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

        Ok(())
    }

    fn install_uploaded_plugin(
        &self,
        ctx: &ServiceContext,
        settings: &Settings,
        uploaded_file: UploadedFile,
    ) -> Result<PluginBundle, InstallUploadedPluginError> {
        let plugin_bundle: PluginBundle = uploaded_file.as_json_file(settings)?;
        ctx.connection
            .transaction_sync(|connection| {
                let backend_repo = BackendPluginRowRepository::new(connection);

                for row in plugin_bundle.backend_plugins.clone() {
                    backend_repo.upsert_one(row.clone())?;
                }

                ctx.processors_trigger
                    .trigger_processor(ProcessorType::LoadPlugin);

                Ok(plugin_bundle)
            })
            .map_err(|error| error.to_inner_error())
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
        BackendPluginRow, BackendPluginRowRepository,
    };

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
}
