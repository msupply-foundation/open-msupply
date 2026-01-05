use std::sync::{Arc, RwLock};

use base64::{prelude::BASE64_STANDARD, Engine};

use repository::{
    migrations::Version, BackendPluginRow, FrontendPluginRow, PluginType, PluginTypes,
    PluginVariantType,
};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use thiserror::Error;

use crate::boajs::{self, BoaJsError};

#[derive(Debug, Error, PartialEq)]
#[error("Error in plugin {code}")]
pub struct PluginError {
    code: String,
    #[source]
    variant: PluginErrorVariant,
}

#[derive(Clone)]
pub struct Plugin {
    types: PluginTypes,
    version: Version,
    instance: Arc<PluginInstance>,
}

impl Plugin {
    fn has_type(&self, r#type: &PluginType) -> bool {
        self.types.0.contains(r#type)
    }
}
pub enum PluginInstanceVariant {
    BoaJs(Vec<u8>),
}
pub struct PluginInstance {
    pub code: String,
    variant: PluginInstanceVariant,
    pub version: Version,
}

pub type PluginResult<T> = Result<T, PluginError>;

#[derive(Debug, Error, PartialEq)]
pub enum PluginErrorVariant {
    #[error(transparent)]
    BoaJs(#[from] BoaJsError),
}

static PLUGINS: RwLock<Vec<Plugin>> = RwLock::new(Vec::new());

fn plugin_type_to_string(r#type: PluginType) -> String {
    serde_json::to_string(&r#type).unwrap().replace("\"", "")
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
    let result = match &plugin.variant {
        PluginInstanceVariant::BoaJs(bundle) => boajs::call_method(
            input,
            vec!["plugins", &plugin_type_to_string(r#type)],
            &bundle,
        )
        .map_err(Into::into),
    };

    result.map_err(|variant| PluginError {
        code: plugin.code.clone(),
        variant,
    })
}

fn compatible_plugins_with_current_app_version() -> Vec<Plugin> {
    let plugins = PLUGINS.read().unwrap();
    let app_version: Version = Version::from_package_json();

    let mut filtered_plugins: Vec<Plugin> = plugins
        .iter()
        .filter(|p| p.version.is_compatible_by_major_and_minor(&app_version))
        .map(|p| p.clone())
        .collect();

    // to get the latest compatable versions listed first
    filtered_plugins.sort_by(|a, b| b.version.cmp(&a.version));
    filtered_plugins
}

#[derive(Serialize, Deserialize, Default)]
pub struct PluginBundle {
    pub backend_plugins: Vec<BackendPluginRow>,
    pub frontend_plugins: Vec<FrontendPluginRow>,
}

impl PluginInstance {
    pub fn get_one(r#type: PluginType) -> Option<Arc<PluginInstance>> {
        compatible_plugins_with_current_app_version()
            .into_iter()
            .find(|p| p.has_type(&r#type))
            .map(|p| p.instance)
    }

    pub fn get_all(r#type: PluginType) -> Vec<Arc<PluginInstance>> {
        compatible_plugins_with_current_app_version()
            .into_iter()
            .filter(|p| p.has_type(&r#type))
            .map(|p| p.instance)
            .collect()
    }

    // Sort by version filter by is_compatible_by_major_and_minor
    pub fn get_one_with_code(code: &str, r#type: PluginType) -> Option<Arc<PluginInstance>> {
        compatible_plugins_with_current_app_version()
            .into_iter()
            .find(|p| p.has_type(&r#type) && p.instance.code == code)
            .map(|p| p.instance)
    }

    pub fn bind(
        BackendPluginRow {
            bundle_base64,
            variant_type,
            types,
            code,
            version,
            ..
        }: BackendPluginRow,
    ) {
        let plugin_bundle = BASE64_STANDARD.decode(bundle_base64).unwrap();

        let plugin = match variant_type {
            PluginVariantType::BoaJs => PluginInstance {
                code: code.clone(),
                variant: PluginInstanceVariant::BoaJs(plugin_bundle),
                version: Version::from_str(&version),
            },
        };

        let instance = Arc::new(plugin);
        let version = Version::from_str(&version);

        let mut plugins = PLUGINS.write().unwrap();
        (*plugins).push(Plugin {
            types,
            instance,
            version,
        });
    }
}
