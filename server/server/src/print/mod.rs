use actix_web::web;

mod label;
use label::{get_label_asset, print_label_asset, print_label_prescription};

use crate::print::label::get_label_prescription;

use self::label::test_printer;

const URL_PATH: &str = "/print";

pub fn config_print(cfg: &mut web::ServiceConfig) {
    cfg.route(
        &format!("{URL_PATH}/label-qr"),
        web::post().to(print_label_asset),
    );
    cfg.route(
        &format!("{URL_PATH}/label-qr"),
        web::get().to(get_label_asset),
    );
    cfg.route(
        &format!("{URL_PATH}/label-prescription"),
        web::post().to(print_label_prescription),
    );
    cfg.route(
        &format!("{URL_PATH}/label-prescription"),
        web::get().to(get_label_prescription),
    );
    cfg.route(
        &format!("{URL_PATH}/label-test"),
        web::post().to(test_printer),
    );
}
