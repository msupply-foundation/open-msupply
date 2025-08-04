use std::{path::Path, rc::Rc};

use boa_engine::{
    builtins::promise::PromiseState, js_string, module::SimpleModuleLoader, Context, JsError,
    JsObject, JsValue, Module, Source,
};

use serde::{de::DeserializeOwned, Serialize};
use thiserror::Error;

use crate::boajs::utils::NullError;

use super::methods;

#[derive(Error, Debug)]
pub enum BoaJsError {
    #[error(transparent)]
    JsError(#[from] JsError),
    #[error("Failed to load JS module")]
    LoadingModule,
    #[error("Failed to locate export {0}")]
    ExportMissing(String),
    #[error(transparent)]
    SerdeError(#[from] serde_json::Error),
    #[error("As string {0}")]
    String(String),
}

impl PartialEq for BoaJsError {
    fn eq(&self, _: &Self) -> bool {
        unimplemented!()
    }
}

pub(crate) fn call_method<I, O>(
    input: I,
    // A path to exported method, plugins export { plugins: { plugin_name }}, thus we look for vec!["plugins", "plugin_name"]
    // reports export { convert_data } thus we look for vec!["convert_data"]
    export_location: Vec<&str>,
    bundle: &Vec<u8>,
) -> Result<O, BoaJsError>
where
    I: Serialize + Send + Sync + 'static,
    O: DeserializeOwned + Send + Sync + 'static,
{
    let export_location: Vec<String> = export_location.iter().map(|s| s.to_string()).collect();
    let bundle = bundle.to_owned();
    std::thread::spawn(move || {
        let export_location = export_location.iter().map(|s| s.as_str()).collect();

        call_method_inner::<I, O>(input, export_location, &bundle).map_err(|e| format!("{:?}", e))
    })
    .join()
    .unwrap()
    .map_err(|e| BoaJsError::String(e))
}
fn call_method_inner<I, O>(
    input: I,
    // A path to exported method, plugins export { plugins: { plugin_name }}, thus we look for vec!["plugins", "plugin_name"]
    // reports export { convert_data } thus we look for vec!["convert_data"]
    export_location: Vec<&str>,
    bundle: &Vec<u8>,
) -> Result<O, BoaJsError>
where
    I: Serialize + Send + Sync + 'static,
    O: DeserializeOwned + Send + Sync + 'static,
{
    use BoaJsError as Error;
    // Initialise context with loader
    let loader = Rc::new(SimpleModuleLoader::new(Path::new("."))?);
    let mut context = &mut Context::builder().module_loader(loader.clone()).build()?;

    // Add plugin code as module
    let module = Module::parse(Source::from_bytes(bundle), None, context)?;
    loader.insert(Path::new("module.mjs").to_path_buf(), module.clone());

    // Wait for module to load
    let promise = module.load_link_evaluate(context);
    context.run_jobs()?;
    match promise.state() {
        PromiseState::Fulfilled(v) if v == JsValue::undefined() => {}
        _ => return Err(Error::LoadingModule),
    }

    // TODO should these be bound as camel case ? Also for inputs and outputs ?
    methods::log::bind_method(context)?;
    methods::sql::bind_method(context)?;
    methods::sql_type::bind_method(context)?;
    methods::get_plugin_data::bind_method(context)?;
    methods::get_store_preferences::bind_method(context)?;
    methods::use_repository::bind_method(context)?;
    methods::use_graphql::bind_method(context)?;
    methods::get_active_stores_on_site::bind_method(context)?;

    let callable = find_callable_in_exports(context, module, export_location)?;

    let input: serde_json::Value = serde_json::to_value(&input)?;
    let js_input = JsValue::from_json(&input, &mut context)?;

    let js_output = callable.call(&JsValue::undefined(), &[js_input], context)?;
    let option_output = JsValue::to_json(&js_output, &mut context)?;
    let output = option_output.ok_or(JsError::from(NullError))?;

    Ok(serde_json::from_value(output)?)
}

fn find_callable_in_exports(
    context: &mut Context,
    module: Module,
    export_location: Vec<&str>,
) -> Result<JsObject, BoaJsError> {
    let mut path = module.namespace(context);

    for name in export_location.iter() {
        path = path
            .get(js_string!(*name), context)?
            .as_object()
            .cloned()
            .ok_or(BoaJsError::ExportMissing(name.to_string()))?;
    }

    Ok(path)
}
