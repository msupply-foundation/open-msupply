mod commands;

use commands::keychain::TokenStore;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(TokenStore::new())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_barcode_scanner::init())
        .invoke_handler(tauri::generate_handler![
            commands::keychain::store_token,
            commands::keychain::get_token,
            commands::keychain::clear_token,
            commands::connection::test_connection,
            commands::connection::graphql_proxy,
            commands::mdns::browse_mdns,
            commands::mdns::stop_mdns_browse,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
