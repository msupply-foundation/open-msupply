use std::sync::{Arc, RwLock};

use actix_web::web::Data;

use base64::{prelude::BASE64_STANDARD, Engine};

use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::{backend_plugin::boajs, service_provider::ServiceProvider};

use super::boajs::BoaJsPluginError;

#[derive(Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum PluginVariantType {
    BoaJs,
}

#[derive(Deserialize, PartialEq)]
#[serde(rename_all = "UPPERCASE")]
pub enum PluginType {
    Amc,
    SuggestedQuantity,
}

pub struct Plugin {
    r#type: PluginType,
    code: String,
    instance: Arc<PluginInstance>,
}
pub enum PluginInstance {
    BoaJs(Vec<u8>),
}

#[derive(Debug, Error, PartialEq)]
#[error("Error in plugin {name}")]
pub struct PluginError {
    name: String,
    #[source]
    variant: PluginErrorVariant,
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

pub(crate) fn call_plugin<I, O>(input: I, name: &str, plugin: &PluginInstance) -> PluginResult<O>
where
    I: Serialize,
    O: serde::de::DeserializeOwned,
{
    let result = match plugin {
        PluginInstance::BoaJs(bundle) => {
            boajs::call_plugin(input, name, &bundle).map_err(Into::into)
        }
    };

    result.map_err(|variant| PluginError {
        name: name.to_string(),
        variant,
    })
}

// TODO temporary used to show example
pub struct BindPluginInput {
    pub bundle_base64: String,
    pub variant_type: PluginVariantType,
    pub r#type: PluginType,
    // Identifier
    pub code: String,
}

impl PluginInstance {
    pub fn get_one(r#type: PluginType) -> Option<Arc<PluginInstance>> {
        let plugin_instance = {
            let plugins = PLUGINS.read().unwrap();

            let plugin = plugins
                .iter()
                .find(|Plugin { r#type: p_type, .. }| p_type == &r#type);

            plugin.map(|p| p.instance.clone())
        };

        plugin_instance
    }

    pub fn bind(
        BindPluginInput {
            bundle_base64,
            variant_type,
            r#type,
            code,
        }: BindPluginInput,
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
            r#type,
            instance,
        });
    }
}
