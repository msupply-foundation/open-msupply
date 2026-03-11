use boa_engine::*;

use crate::{
    boajs::{context::BoaJsContext, utils::*},
    sync::ActiveStoresOnSite,
};

pub(crate) fn bind_method(context: &mut Context) -> Result<(), JsError> {
    context.register_global_callable(
        JsString::from("get_active_stores_on_site"),
        0,
        NativeFunction::from_copy_closure(move |_, _, ctx| {
            let result = {
                let service_provider = BoaJsContext::service_provider();
                let connection = service_provider
                    .connection()
                    .map_err(std_error_to_js_error)?;

                ActiveStoresOnSite::get(&connection, None)
            }
            .map_err(std_error_to_js_error)?;

            let value: serde_json::Value =
                serde_json::to_value(&result).map_err(std_error_to_js_error)?;
            // We return the moved variable as a `JsValue`.
            Ok(JsValue::from_json(&value, ctx)?)
        }),
    )?;
    Ok(())
}
