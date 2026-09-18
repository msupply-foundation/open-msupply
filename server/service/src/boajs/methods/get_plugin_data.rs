use boa_engine::*;
use repository::{PluginDataFilter, PluginDataRepository, PluginDataRow};

use crate::{boajs::context::use_boajs_connection, boajs::utils::*};

pub(crate) fn bind_method(context: &mut Context) -> Result<(), JsError> {
    context.register_global_callable(
        JsString::from("get_plugin_data"),
        0,
        NativeFunction::from_copy_closure(move |_, args, ctx| {
            let filter: PluginDataFilter = get_serde_argument(ctx, args, 0)?;

            // When using BoaJsContext, it's best to use 'scope' see PluginContext for a link to testing repo
            let plugin_data: Vec<PluginDataRow> = use_boajs_connection(|connection| {
                // TODO pagination or restrictions ?
                PluginDataRepository::new(connection)
                    .query_by_filter(filter)
                    .map_err(std_error_to_js_error)
            })
            .map_err(std_error_to_js_error)??
            .into_iter()
            .map(|r| r.plugin_data)
            .collect();

            let value: serde_json::Value =
                serde_json::to_value(&plugin_data).map_err(std_error_to_js_error)?;
            // We return the moved variable as a `JsValue`.
            JsValue::from_json(&value, ctx)
        }),
    )?;
    Ok(())
}
