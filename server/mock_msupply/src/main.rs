//! Tiny standalone "fake legacy mSupply" that answers the V5 endpoints
//! needed by the open-mSupply central and remote sync paths. See
//! [README](./README.md) for the workflow it slots into and the list of
//! routes implemented.

use actix_web::{web, App, HttpServer};
use clap::Parser;
use std::sync::Arc;

mod handlers;
mod state;

use state::{MockConfig, MockState};

/// Mock legacy mSupply for OMS integration tests. Flags below take
/// precedence over their env-var counterparts so Windows users can pass
/// values without `SET FOO=bar` gymnastics. Env vars are still honoured
/// when flags are omitted, so existing setups keep working.
#[derive(Parser)]
#[command(version, about, long_about = None)]
struct Args {
    /// TCP port to bind on 127.0.0.1. Env: MOCK_MSUPPLY_PORT.
    #[arg(long, env = "MOCK_MSUPPLY_PORT", default_value_t = 2048)]
    port: u16,

    /// URL the mock reports as `omSupplyCentralServerUrl` to non-central
    /// callers — i.e. where the remote should reach the OMS central server.
    /// Env: OMS_CENTRAL_URL.
    #[arg(long, env = "OMS_CENTRAL_URL", default_value = "http://localhost:2055")]
    oms_central_url: String,

    /// Basic-auth username the central OMS uses for its own self-auth.
    /// Requests with this name get `isOmSupplyCentralServer: true`.
    /// Env: OMS_CENTRAL_USERNAME.
    #[arg(long, env = "OMS_CENTRAL_USERNAME", default_value = "test")]
    oms_central_username: String,

    /// Returned as `mSupplyCentralSiteId` on every site_info response.
    /// Env: OMS_MSUPPLY_CENTRAL_SITE_ID.
    #[arg(long, env = "OMS_MSUPPLY_CENTRAL_SITE_ID", default_value_t = 1)]
    msupply_central_site_id: i32,
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    simple_log::quick!("info");

    let args = Args::parse();
    let port = args.port;

    let state = Arc::new(MockState::new(MockConfig {
        oms_central_url: args.oms_central_url,
        oms_central_username: args.oms_central_username,
        msupply_central_site_id: args.msupply_central_site_id,
    }));

    log::info!(
        "mock_msupply: listening on http://127.0.0.1:{} \
         (oms_central_url={}, oms_central_username={})",
        port,
        state.config.oms_central_url,
        state.config.oms_central_username,
    );

    HttpServer::new(move || {
        let state = state.clone();
        App::new()
            .app_data(web::Data::from(state))
            .service(
                web::scope("/sync/v5")
                    .route("/site", web::get().to(handlers::get_site))
                    .route("/site_status", web::get().to(handlers::get_site_status))
                    .route("/initialise", web::post().to(handlers::post_initialise))
                    .route(
                        "/queued_records",
                        web::get().to(handlers::get_queued_records),
                    )
                    .route(
                        "/queued_records",
                        web::post().to(handlers::post_queued_records),
                    )
                    .route(
                        "/acknowledged_records",
                        web::post().to(handlers::post_acknowledged_records),
                    )
                    .route(
                        "/central_records",
                        web::get().to(handlers::get_central_records),
                    )
                    .route("/test/create_site", web::post().to(handlers::create_site))
                    .route("/test/upsert", web::post().to(handlers::post_test_upsert))
                    .route("/test/delete", web::post().to(handlers::post_test_delete)),
            )
    })
    .bind(("127.0.0.1", port))?
    .run()
    .await
}
