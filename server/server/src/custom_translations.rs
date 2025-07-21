use actix_web::{
    error::InternalError,
    http::StatusCode,
    web::{self, Data},
    Error, HttpResponse,
};

use service::{
    preference::{CustomTranslations, Preference},
    service_provider::ServiceProvider,
};

pub fn config_custom_translations(cfg: &mut web::ServiceConfig) {
    cfg.route("/custom-translations", web::get().to(custom_translations));
}

async fn custom_translations(
    service_provider: Data<ServiceProvider>,
) -> Result<HttpResponse, Error> {
    let connection = service_provider.connection().map_err(|err| {
        log::error!("Couldn't get database connection: {}", err);
        InternalError::new(
            "Could not connect to database",
            StatusCode::INTERNAL_SERVER_ERROR,
        )
    })?;

    let translations = CustomTranslations.load(&connection, None).map_err(|err| {
        log::error!("Failed to load custom preferences: {}", err);
        InternalError::new(
            "Could not load preference",
            StatusCode::INTERNAL_SERVER_ERROR,
        )
    })?;

    Ok(HttpResponse::Ok().json(translations))
}
