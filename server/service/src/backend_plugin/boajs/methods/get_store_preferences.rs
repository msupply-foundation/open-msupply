use boa_engine::*;

use crate::{
    backend_plugin::{boajs::utils::*, plugin_provider::PluginContext},
    store_preference::get_store_preferences,
};

pub(crate) fn bind_method(context: &mut Context) -> Result<(), JsError> {
    context.register_global_callable(
        JsString::from("get_store_preferences"),
        0,
        NativeFunction::from_copy_closure(move |_, args, ctx| {
            let store_id = get_string_argument(args, 0)?;

            // When using PluginContext, it's best to use 'scope' see PluginContext for a link to testing repo
            let preferences = {
                let service_provider = PluginContext::service_provider();
                let connection = service_provider
                    .connection()
                    .map_err(std_error_to_js_error)?;

                get_store_preferences(&connection, &store_id).map_err(std_error_to_js_error)
            }?;

            let value: serde_json::Value =
                serde_json::to_value(&preferences).map_err(std_error_to_js_error)?;
            // We return the moved variable as a `JsValue`.
            Ok(JsValue::from_json(&value, ctx)?)
        }),
    )?;
    Ok(())
}
