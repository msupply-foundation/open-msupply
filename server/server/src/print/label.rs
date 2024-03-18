use super::validate_request;
use actix_web::{
    web::{self, Data},
    HttpRequest, HttpResponse,
};
use repository::RepositoryError;
use service::{
    auth_data::AuthData, print::label::print_qr_code, service_provider::ServiceProvider,
    settings::LabelPrinterSettingNode,
};

#[derive(serde::Deserialize)]
pub struct LabelData {
    code: String,
    message: Option<String>,
}

pub async fn print_label_qr(
    request: HttpRequest,
    data: web::Json<LabelData>,
    service_provider: Data<ServiceProvider>,
    auth_data: Data<AuthData>,
) -> HttpResponse {
    let auth_result = validate_request(request.clone(), &service_provider, &auth_data);
    if auth_result.is_err() {
        return HttpResponse::Unauthorized().body("Access Denied");
    }

    match validate_request(request, &service_provider, &auth_data) {
        Ok((_user, _store_id)) => {}
        Err(error) => {
            let formatted_error = format!("{:#?}", error);
            return HttpResponse::Unauthorized().body(formatted_error);
        }
    };
    let settings = match get_printer_settings(service_provider) {
        Ok(settings) => settings,
        Err(error) => {
            return HttpResponse::InternalServerError()
                .body(format!("Error getting printer settings: {}", error));
        }
    };

    if print_qr_code(settings, data.code.clone(), data.message.clone()).is_err() {
        return HttpResponse::InternalServerError().body("Error printing QR label");
    }
    HttpResponse::Ok().body("QR label printed")
}

fn get_printer_settings(
    service_provider: Data<ServiceProvider>,
) -> Result<LabelPrinterSettingNode, RepositoryError> {
    let service_context = service_provider.basic_context()?;

    match service_provider
        .label_printer_settings_service
        .label_printer_settings(&service_context)?
    {
        Some(setting) => Ok(setting),
        None => Err(RepositoryError::DBError {
            msg: "No label printer settings found".to_string(),
            extra: "".to_string(),
        }),
    }
}
