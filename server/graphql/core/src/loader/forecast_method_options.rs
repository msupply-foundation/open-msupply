use actix_web::web::Data;
use async_graphql::dataloader::*;
use repository::RepositoryError;
use service::{
    requisition::request_requisition::{ForecastMethodOption, get_forecast_method_options},
    service_provider::ServiceProvider,
};
use std::collections::HashMap;

/// A request line's forecast method options, keyed by line id. Batched so a line table
/// reads each requisition's lines and forecast inputs once.
pub struct ForecastMethodOptionsLoader {
    pub service_provider: Data<ServiceProvider>,
}

impl Loader<String> for ForecastMethodOptionsLoader {
    type Value = Vec<ForecastMethodOption>;
    type Error = RepositoryError;

    async fn load(&self, line_ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let service_context = self.service_provider.basic_context()?;
        get_forecast_method_options(&service_context.connection, line_ids)
    }
}
