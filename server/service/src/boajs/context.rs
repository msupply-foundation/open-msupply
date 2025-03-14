use crate::service_provider::ServiceProvider;
use actix_web::web::Data;
use std::sync::RwLock;

pub struct BoaJsContext {
    pub service_provider: Data<ServiceProvider>,
}

// Needs to be bound on startup
static BOAJS_CONTEXT: RwLock<Option<BoaJsContext>> = RwLock::new(None);

impl BoaJsContext {
    pub fn bind(self) {
        *(BOAJS_CONTEXT
            .write()
            .expect("Failed to get write lock for boajs context")) = Some(self);
    }

    pub fn service_provider() -> Data<ServiceProvider> {
        BOAJS_CONTEXT
            .read()
            .expect("Failed to get read lock for boajs context")
            .as_ref()
            .expect("Global boajs context is not present")
            .service_provider
            .clone()
    }
}
