use std::{path::Path, rc::Rc};

use boa_engine::{
    builtins::promise::PromiseState, js_string, module::SimpleModuleLoader, Context, JsError,
    JsValue, Module, Source,
};

use serde::{de::DeserializeOwned, Serialize};
use thiserror::Error;

use super::methods;

#[derive(Error, Debug)]
pub enum BoaJsPluginError {
    #[error(transparent)]
    JsError(#[from] JsError),
    #[error("Failed to load JS module for plugin {0}")]
    LoadingModule(String),
    #[error(transparent)]
    SerdeError(#[from] serde_json::Error),
}

impl PartialEq for BoaJsPluginError {
    fn eq(&self, _: &Self) -> bool {
        unimplemented!()
    }
}

pub(crate) fn call_plugin<I, O>(
    input: I,
    name: &str,
    bundle: &Vec<u8>,
) -> Result<O, BoaJsPluginError>
where
    I: Serialize,
    O: DeserializeOwned,
{
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
        _ => return Err(BoaJsPluginError::LoadingModule(name.to_string())),
    }

    // TODO should these be bound as camel case ? Also for inputs and outputs ?
    methods::log::bind_method(context)?;
    methods::sql::bind_method(context)?;
    methods::sql_type::bind_method(context)?;

    let namespace = module.namespace(context);
    let plugins = namespace
        .get(js_string!("plugins"), context)
        .unwrap()
        .as_object()
        .cloned()
        .unwrap();

    let key = js_string!(name);
    let plugin = plugins
        .get(key, context)
        .unwrap()
        .as_callable()
        .cloned()
        .unwrap();

    let input: serde_json::Value = serde_json::to_value(&input)?;
    let js_input = JsValue::from_json(&input, &mut context)?;

    let js_output = plugin.call(&JsValue::undefined(), &[js_input], context)?;
    let output = JsValue::to_json(&js_output, &mut context)?;

    Ok(serde_json::from_value(output)?)
}
