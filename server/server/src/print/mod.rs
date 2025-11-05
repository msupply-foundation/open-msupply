use actix_web::web;

mod label;
use label::{get_label_asset, print_label_asset, print_label_prescription};

use self::label::test_printer;

const URL_PATH: &str = "/print";

pub fn config_print(cfg: &mut web::ServiceConfig) {
    cfg.route(
        &format!("{}/label-qr", URL_PATH),
        web::post().to(print_label_asset),
    );
    cfg.route(
        &format!("{}/label-qr", URL_PATH),
        web::get().to(get_label_asset),
    );
    cfg.route(
        &format!("{}/label-prescription", URL_PATH),
        web::post().to(print_label_prescription),
    );
    cfg.route(
        &format!("{}/label-test", URL_PATH),
        web::post().to(test_printer),
    );
}
