use async_graphql::*;
use graphql_core::{standard_graphql_error::StandardGraphqlError, ContextExt};

#[derive(InputObject, SimpleObject)]
pub struct LabelPrinterSettingNode {
    pub address: String,
    pub label_height: i32,
    pub label_width: i32,
    pub port: u16,
}

impl LabelPrinterSettingNode {
    fn from_domain(from: service::settings::LabelPrinterSettingNode) -> LabelPrinterSettingNode {
        LabelPrinterSettingNode {
            address: from.address,
            label_height: from.label_height,
            label_width: from.label_width,
            port: from.port,
        }
    }
}

pub(crate) async fn label_printer_settings(
    ctx: &Context<'_>,
) -> Result<Option<LabelPrinterSettingNode>> {
    let service_provider = ctx.service_provider_data();

    let settings = tokio::task::spawn_blocking(move || -> Result<_, repository::RepositoryError> {
        let service_context = service_provider.basic_context()?;
        service_provider
            .label_printer_settings_service
            .label_printer_settings(&service_context)
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)?
    .map_err(StandardGraphqlError::from_repository_error)?;

    let label_printer_settings = settings.map(LabelPrinterSettingNode::from_domain);

    Ok(label_printer_settings)
}
