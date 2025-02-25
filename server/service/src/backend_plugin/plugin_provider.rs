use std::sync::{Arc, RwLock};

use actix_web::web::Data;

use base64::{prelude::BASE64_STANDARD, Engine};

use repository::{BackendPluginRow, FrontendPluginRow, PluginType, PluginTypes, PluginVariantType};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use thiserror::Error;

use crate::{backend_plugin::boajs, service_provider::ServiceProvider};

use super::boajs::BoaJsPluginError;

#[derive(Debug, Error, PartialEq)]
#[error("Error in plugin {r#type:?}")]
pub struct PluginError {
    r#type: PluginType,
    #[source]
    variant: PluginErrorVariant,
}

pub struct Plugin {
    types: PluginTypes,
    code: String,
    instance: Arc<PluginInstance>,
}

impl Plugin {
    fn has_type(&self, r#type: &PluginType) -> bool {
        self.types.0.contains(r#type)
    }
}
pub enum PluginInstance {
    BoaJs(Vec<u8>),
}

pub type PluginResult<T> = Result<T, PluginError>;

#[derive(Debug, Error, PartialEq)]
pub enum PluginErrorVariant {
    #[error(transparent)]
    BoaJs(#[from] BoaJsPluginError),
}

pub static PLUGINS: RwLock<Vec<Plugin>> = RwLock::new(Vec::new());

pub struct PluginContext {
    pub service_provider: Data<ServiceProvider>,
}

// Needs to be bound on startup
static PLUGINS_CONTEXT: RwLock<Option<PluginContext>> = RwLock::new(None);
impl PluginContext {
    pub fn bind(self) {
        *(PLUGINS_CONTEXT
            .write()
            .expect("Failed to get write lock for plugin context")) = Some(self);
    }

    pub fn service_provider() -> Data<ServiceProvider> {
        PLUGINS_CONTEXT
            .read()
            .expect("Failed to get read lock for plugin context")
            .as_ref()
            .expect("Global plugin context is not present")
            .service_provider
            .clone()
    }
}

pub(crate) fn call_plugin<I, O>(
    input: I,
    r#type: PluginType,
    plugin: &PluginInstance,
) -> PluginResult<O>
where
    I: Serialize,
    O: DeserializeOwned,
{
    let result = match plugin {
        PluginInstance::BoaJs(bundle) => {
            boajs::call_plugin(input, &r#type, &bundle).map_err(Into::into)
        }
    };

    result.map_err(|variant| PluginError { r#type, variant })
}

#[derive(Serialize, Deserialize, Default)]
pub struct PluginBundle {
    pub backend_plugins: Vec<BackendPluginRow>,
    pub frontend_plugins: Vec<FrontendPluginRow>,
}

impl PluginInstance {
    pub fn get_one(r#type: PluginType) -> Option<Arc<PluginInstance>> {
        let plugin_instance = {
            let plugins = PLUGINS.read().unwrap();

            let plugin = plugins.iter().find(|p| p.has_type(&r#type));

            plugin.map(|p| p.instance.clone())
        };

        plugin_instance
    }

    pub fn bind(
        BackendPluginRow {
            bundle_base64,
            variant_type,
            types,
            code,
            ..
        }: BackendPluginRow,
    ) {
        let plugin_bundle = BASE64_STANDARD.decode(bundle_base64).unwrap();

        let plugin = match variant_type {
            PluginVariantType::BoaJs => PluginInstance::BoaJs(plugin_bundle),
        };

        let instance = Arc::new(plugin);

        let mut plugins = PLUGINS.write().unwrap();

        // Remove all plugins with this code
        (*plugins).retain(|Plugin { code: p_code, .. }| p_code != &code);

        // Add plugin with this code
        (*plugins).push(Plugin {
            code,
            types,
            instance,
        });
    }
}
