//! src/main.rs

use rust_server::run;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    run()?.await
}
