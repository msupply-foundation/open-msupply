use async_graphql::*;

use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::auth::{Resource, ResourceAccessRequest};

use crate::queries::LabelPrinterSettingNode;

#[derive(InputObject)]
pub struct LabelPrinterSettingsInput {
    pub address: String,
    pub label_height: i32,
    pub label_width: i32,
    pub port: u16,
}

#[derive(SimpleObject)]
pub struct LabelPrinterUpdateResult {
    pub success: bool,
}

#[derive(Union)]
pub enum UpdateLabelPrinterSettingsResponse {
    Response(LabelPrinterUpdateResult),
    Error(UpdateLabelPrinterSettingsError),
}

impl UpdateLabelPrinterSettingsResponse {
    fn new() -> UpdateLabelPrinterSettingsResponse {
        UpdateLabelPrinterSettingsResponse::Response(LabelPrinterUpdateResult { success: true })
    }
}

#[derive(SimpleObject)]
pub struct UpdateLabelPrinterSettingsError {
    pub error: String,
}

impl LabelPrinterSettingNode {
    pub fn to_domain(&self) -> service::settings::LabelPrinterSettingNode {
        service::settings::LabelPrinterSettingNode {
            address: self.address.clone(),
            label_height: self.label_height,
            label_width: self.label_width,
            port: self.port,
        }
    }
}

impl LabelPrinterSettingsInput {
    pub fn to_domain(&self) -> service::settings::LabelPrinterSettingNode {
        service::settings::LabelPrinterSettingNode {
            address: self.address.clone(),
            label_height: self.label_height,
            label_width: self.label_width,
            port: self.port,
        }
    }
}

pub async fn update_label_printer_settings(
    ctx: &Context<'_>,
    input: LabelPrinterSettingsInput,
) -> Result<UpdateLabelPrinterSettingsResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::NoPermissionRequired,
            store_id: None,
        },
    )?;

    let service_provider = ctx.service_provider_data();
    let input = input.to_domain();

    tokio::task::spawn_blocking(move || -> Result<_> {
        let service_context = service_provider
            .basic_context()
            .map_err(StandardGraphqlError::from_repository_error)?;
        service_provider
            .label_printer_settings_service
            .update_label_printer_settings(&service_context, &input)
            .map_err(async_graphql::Error::from)
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)??;

    Ok(UpdateLabelPrinterSettingsResponse::new())
}
