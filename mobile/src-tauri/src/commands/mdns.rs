use mdns_sd::{ServiceDaemon, ServiceEvent};
use serde::Serialize;
use tauri::{AppHandle, Emitter};

const SERVICE_TYPE: &str = "_msupply._tcp.local.";

#[derive(Clone, Serialize)]
pub struct DiscoveredServer {
    pub name: String,
    pub host: String,
    pub port: u16,
    pub url: String,
}

#[tauri::command]
pub async fn browse_mdns(app: AppHandle) -> Result<(), String> {
    let mdns = ServiceDaemon::new().map_err(|e| e.to_string())?;
    let receiver = mdns.browse(SERVICE_TYPE).map_err(|e| e.to_string())?;

    // Spawn a task to listen for events and emit them to the frontend
    let app_handle = app.clone();
    tokio::spawn(async move {
        while let Ok(event) = receiver.recv() {
            match event {
                ServiceEvent::ServiceResolved(info) => {
                    let addresses: Vec<&std::net::IpAddr> = info.get_addresses().iter().collect();
                    if let Some(addr) = addresses.first() {
                        let port = info.get_port();
                        let server = DiscoveredServer {
                            name: info.get_fullname().to_string(),
                            host: addr.to_string(),
                            port,
                            url: format!("https://{}:{}", addr, port),
                        };
                        let _ = app_handle.emit("mdns-discovered", server);
                    }
                }
                ServiceEvent::SearchStopped(_) => break,
                _ => {}
            }
        }
    });

    // Stop browsing after 10 seconds
    let mdns_clone = mdns.clone();
    tokio::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_secs(10)).await;
        let _ = mdns_clone.stop_browse(SERVICE_TYPE);
    });

    Ok(())
}

#[tauri::command]
pub fn stop_mdns_browse() -> Result<(), String> {
    // The browse auto-stops after 10s; this is a no-op fallback.
    // A more robust implementation would store the daemon handle in State.
    Ok(())
}
