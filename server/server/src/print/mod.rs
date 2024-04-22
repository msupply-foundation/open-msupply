use actix_web::web;

mod label;
use label::print_label_qr;

use self::label::test_printer;

const URL_PATH: &str = "/print";

pub fn config_print(cfg: &mut web::ServiceConfig) {
    cfg.route(
        &format!("{}/label-qr", URL_PATH),
        web::post().to(print_label_qr),
    );
    cfg.route(
        &format!("{}/label-test", URL_PATH),
        web::post().to(test_printer),
    );
}
