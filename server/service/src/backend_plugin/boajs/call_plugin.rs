use std::{path::Path, rc::Rc};

use boa_engine::{
    builtins::promise::PromiseState, js_string, module::SimpleModuleLoader, Context, JsError,
    JsValue, Module, Source,
};

use repository::PluginType;
use serde::{de::DeserializeOwned, Serialize};
use thiserror::Error;

use super::methods;

#[derive(Error, Debug)]
pub enum BoaJsPluginError {
    #[error(transparent)]
    JsError(#[from] JsError),
    #[error("Failed to load JS module for plugin {0}")]
    LoadingModule(String),
    #[error("Failed to locate plugins namespace for plugin {0}")]
    PluginNamespaceMissing(String),
    #[error("Failed to locate plugin {0}")]
    PluginMissing(String),
    #[error(transparent)]
    SerdeError(#[from] serde_json::Error),
}

impl PartialEq for BoaJsPluginError {
    fn eq(&self, _: &Self) -> bool {
        unimplemented!()
    }
}

fn plugin_type_to_string(r#type: &PluginType) -> String {
    serde_json::to_string(r#type).unwrap().replace("\"", "")
}

pub(crate) fn call_plugin<I, O>(
    input: I,
    r#type: &PluginType,
    bundle: &Vec<u8>,
) -> Result<O, BoaJsPluginError>
where
    I: Serialize,
    O: DeserializeOwned,
{
    use BoaJsPluginError as Error;
    let type_string = plugin_type_to_string(r#type);

    // Initialise context with loader
    let loader = Rc::new(SimpleModuleLoader::new(Path::new("."))?);
    let mut context = &mut Context::builder().module_loader(loader.clone()).build()?;

    // Add plugin code as module
    let module = Module::parse(Source::from_bytes(bundle), None, context)?;
    loader.insert(Path::new("plugin.mjs").to_path_buf(), module.clone());

    // Wait for module to load
    let promise = module.load_link_evaluate(context);
    context.run_jobs();
    match promise.state() {
        PromiseState::Fulfilled(JsValue::Undefined) => {}
        _ => return Err(Error::LoadingModule(type_string.clone())),
    }

    // TODO should these be bound as camel case ? Also for inputs and outputs ?
    methods::log::bind_method(context)?;
    methods::sql::bind_method(context)?;
    methods::sql_type::bind_method(context)?;
    methods::get_store_preferences::bind_method(context)?;
    methods::get_plugin_data::bind_method(context)?;

    let namespace = module.namespace(context);
    let plugins = namespace
        .get(js_string!("plugins"), context)?
        .as_object()
        .cloned()
        .ok_or_else(|| Error::PluginNamespaceMissing(type_string.clone()))?;

    let key = js_string!(type_string.as_str());
    let plugin = plugins
        .get(key, context)?
        .as_callable()
        .cloned()
        .ok_or_else(|| Error::PluginMissing(type_string.clone()))?;

    let input: serde_json::Value = serde_json::to_value(&input)?;
    let js_input = JsValue::from_json(&input, &mut context)?;

    let js_output = plugin.call(&JsValue::undefined(), &[js_input], context)?;
    let output = JsValue::to_json(&js_output, &mut context)?;

    Ok(serde_json::from_value(output)?)
}
