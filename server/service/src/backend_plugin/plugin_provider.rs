use std::sync::{Arc, RwLock};

use base64::{prelude::BASE64_STANDARD, Engine};

use repository::{
    migrations::Version, BackendPluginRow, FrontendPluginRow, PluginType, PluginTypes,
    PluginVariantType,
};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use thiserror::Error;

use crate::boajs::{self, BoaJsError};

use super::plugin_executor;

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
    pub id: String,
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

fn boajs_plugin_error(code: &str, variant: BoaJsError) -> PluginError {
    PluginError {
        code: code.to_string(),
        variant: PluginErrorVariant::BoaJs(variant),
    }
}

/// Serialize the input and gather the owned, `Send` data the boajs work needs, so
/// it can be dispatched to the plugin runtime. boa's `Context` is `!Send`, so the
/// engine itself must be built and run on the pool thread, not moved there.
fn prepare_call<I: Serialize>(
    input: I,
    r#type: PluginType,
    plugin: &PluginInstance,
) -> Result<(serde_json::Value, Vec<String>, Vec<u8>), BoaJsError> {
    let input = serde_json::to_value(&input)?;
    let export_location = vec!["plugins".to_string(), plugin_type_to_string(r#type)];
    let bundle = match &plugin.variant {
        PluginInstanceVariant::BoaJs(bundle) => bundle.clone(),
    };
    Ok((input, export_location, bundle))
}

/// Build/run the plugin engine. Runs on a plugin-runtime thread (where the
/// thread-local engine cache lives and teardown is managed). Works in
/// `serde_json::Value` so the generic input/output don't cross the thread boundary.
fn run_engine(
    input: serde_json::Value,
    export_location: Vec<String>,
    bundle: Vec<u8>,
) -> Result<serde_json::Value, BoaJsError> {
    let export_location: Vec<&str> = export_location.iter().map(String::as_str).collect();
    boajs::call_method(input, export_location, &bundle)
}

/// Run a backend plugin. The synchronous boajs interpreter is dispatched to the
/// dedicated plugin runtime (boundary dispatch) so the engine cache lives on
/// threads whose teardown we manage (#11943) and CPU stays off the async runtime
/// (#11949). Callers don't need to wrap this in `spawn_blocking` themselves.
///
/// Sync callers must already be on a blocking thread (e.g. inside a
/// `spawn_blocking` requisition mutation or the item_stats loader), since this
/// blocks until the plugin returns.
pub(crate) fn call_plugin<I, O>(
    input: I,
    r#type: PluginType,
    plugin: &PluginInstance,
) -> PluginResult<O>
where
    I: Serialize,
    O: DeserializeOwned,
{
    let code = plugin.code.clone();

    let (input, export_location, bundle) =
        prepare_call(input, r#type, plugin).map_err(|e| boajs_plugin_error(&code, e))?;

    let output = plugin_executor::run_blocking(move || run_engine(input, export_location, bundle))
        .map_err(|e| boajs_plugin_error(&code, e))?;

    serde_json::from_value(output).map_err(|e| boajs_plugin_error(&code, BoaJsError::SerdeError(e)))
}

/// Async sibling of [`call_plugin`] for callers running on the async runtime
/// (processor / schedule). Awaits the plugin runtime so the boajs interpreter
/// never runs on a runtime worker thread (#11949).
pub(crate) async fn call_plugin_async<I, O>(
    input: I,
    r#type: PluginType,
    plugin: Arc<PluginInstance>,
) -> PluginResult<O>
where
    I: Serialize + Send + 'static,
    O: DeserializeOwned + Send + 'static,
{
    let code = plugin.code.clone();

    let (input, export_location, bundle) =
        prepare_call(input, r#type, &plugin).map_err(|e| boajs_plugin_error(&code, e))?;

    let output = plugin_executor::run_async(move || run_engine(input, export_location, bundle))
        .await
        .map_err(|e| boajs_plugin_error(&code, e))?;

    serde_json::from_value(output).map_err(|e| boajs_plugin_error(&code, BoaJsError::SerdeError(e)))
}

#[derive(Serialize, Deserialize, Default)]
pub struct PluginBundle {
    pub backend_plugins: Vec<BackendPluginRow>,
    pub frontend_plugins: Vec<FrontendPluginRow>,
}

impl PluginInstance {
    pub fn get_one(r#type: PluginType) -> Option<Arc<PluginInstance>> {
        let plugins = PLUGINS.read().unwrap();

        plugins
            .iter()
            .find(|p| p.has_type(&r#type))
            .map(|p| p.instance.clone())
    }

    pub fn get_all(r#type: PluginType) -> Vec<Arc<PluginInstance>> {
        let plugins = PLUGINS.read().unwrap();

        for plugin in plugins.iter() {
            log::info!(
                "Plugin loaded: {} (version {})",
                plugin.instance.code,
                plugin.instance.version
            );
        }

        plugins
            .iter()
            .filter(|p| p.has_type(&r#type))
            .map(|p| p.instance.clone())
            .collect()
    }

    pub fn get_one_with_code(code: &str, r#type: PluginType) -> Option<Arc<PluginInstance>> {
        let plugins = PLUGINS.read().unwrap();

        plugins
            .iter()
            .find(|p| p.has_type(&r#type) && p.instance.code == code)
            .map(|p| p.instance.clone())
    }

    pub fn bind(
        BackendPluginRow {
            id,
            bundle_base64,
            variant_type,
            types,
            code,
            version,
            ..
        }: BackendPluginRow,
    ) {
        let version = Version::from_str(&version);
        let app_version = Version::from_package_json();

        // Skip if not compatible
        if !version.is_compatible_by_major_and_minor(&app_version) {
            return;
        }

        // Get existing plugin with same code in the plugin provider
        {
            let plugins = PLUGINS.read().unwrap();
            if let Some(existing_plugin) = (*plugins).iter().find(|p| p.instance.code == code) {
                if existing_plugin.instance.version > version {
                    // Existing plugin is higher version, skip (still install if same version)
                    return;
                }
            }
        } // Drop read lock

        // Prepare plugin bundle
        let plugin_bundle = BASE64_STANDARD.decode(bundle_base64).unwrap();
        let plugin = match variant_type {
            PluginVariantType::BoaJs => PluginInstance {
                id,
                code: code.clone(),
                variant: PluginInstanceVariant::BoaJs(plugin_bundle),
                version,
            },
        };

        let instance = Arc::new(plugin);

        let mut plugins = PLUGINS.write().unwrap();

        // Remove existing plugins of older versions with same code
        (*plugins).retain(|p| p.instance.code != code);

        (*plugins).push(Plugin { types, instance });
    }

    /// Drop any cached backend plugin whose row id matches. Used when a plugin
    /// row is deleted (via the uninstall mutation or a sync delete record) so
    /// the in-memory cache doesn't outlive the database row.
    pub fn unbind_by_id(id: &str) {
        let mut plugins = PLUGINS.write().unwrap();
        plugins.retain(|p| p.instance.id != id);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::{migrations::Version, PluginType};

    // Bundle exporting `plugins.average_monthly_consumption` so call_plugin's
    // export path (`["plugins", "average_monthly_consumption"]`) resolves. It
    // calls no native methods, so it runs without a bound BoaJsContext.
    fn test_instance() -> PluginInstance {
        PluginInstance {
            id: "test".to_string(),
            code: "test_plugin".to_string(),
            variant: PluginInstanceVariant::BoaJs(
                b"export const plugins = { average_monthly_consumption: (x) => x * 2 };".to_vec(),
            ),
            version: Version::from_str("1.0.0"),
        }
    }

    // call_plugin dispatches the boajs work to the dedicated plugin runtime and
    // round-trips input -> serialize -> engine -> deserialize -> output.
    #[test]
    fn call_plugin_round_trips_through_plugin_runtime() {
        let plugin = test_instance();
        let out: f64 =
            call_plugin(21.0_f64, PluginType::AverageMonthlyConsumption, &plugin).unwrap();
        assert_eq!(out, 42.0);
    }

    // Same for the async sibling.
    #[tokio::test]
    async fn call_plugin_async_round_trips_through_plugin_runtime() {
        let plugin = Arc::new(test_instance());
        let out: f64 = call_plugin_async(5.0_f64, PluginType::AverageMonthlyConsumption, plugin)
            .await
            .unwrap();
        assert_eq!(out, 10.0);
    }
}
