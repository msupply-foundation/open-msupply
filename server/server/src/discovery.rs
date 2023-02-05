use crate::certs::Protocol;
#[cfg(target_os = "macos")]
use async_dnssd::{RegisterData, TxtRecord};
#[cfg(target_os = "windows")]
use {astro_dnssd::DNSServiceBuilder, std::collections::HashMap};

const SERVICE_NAME: &'static str = "_omsupply._tcp";
#[cfg(target_os = "macos")]
const NAME: &'static str = "omSupplyServer";
const PROTOCOL_KEY: &'static str = "protocol";
const CLIENT_VERSION_KEY: &'static str = "client_version";
const HARDWARE_ID_KEY: &'static str = "hardware_id";
const CLIENT_VERSION: &'static str = "unspecified";

pub(crate) fn start_discovery(protocol: Protocol, port: u16, hardware_id: String) {
    tokio::task::spawn(async move {
        #[cfg(target_os = "macos")]
        {
            let mut txt: TxtRecord = TxtRecord::new();
            txt.set_value(HARDWARE_ID_KEY.as_bytes(), hardware_id.as_bytes())
                .unwrap();
            txt.set_value(CLIENT_VERSION_KEY.as_bytes(), CLIENT_VERSION.as_bytes())
                .unwrap();
            txt.set_value(PROTOCOL_KEY.as_bytes(), protocol.to_string().as_bytes())
                .unwrap();
            let (_registration, _) = async_dnssd::register_extended(
                SERVICE_NAME,
                port,
                RegisterData {
                    txt: txt.rdata(),
                    name: Some(NAME),
                    ..Default::default()
                },
            )
            .unwrap()
            .await
            .unwrap();
        }

        #[cfg(target_os = "windows")]
        {
            let mut text_record = HashMap::<String, String>::new();
            text_record.insert(HARDWARE_ID_KEY.to_string(), hardware_id.to_string());
            text_record.insert(CLIENT_VERSION_KEY.to_string(), CLIENT_VERSION.to_string());
            text_record.insert(PROTOCOL_KEY.to_string(), protocol.to_string());
            let service = DNSServiceBuilder::new(SERVICE_NAME, port)
                .with_txt_record(text_record)
                .register();
            {
                match service {
                    Ok(_service) => {
                        println!("Discovery registered");
                    }
                    Err(e) => {
                        println!("Error registering: {:?}", e);
                    }
                }
            }
        }
        // Without this discovery stops (even if result of register_extended is kept and passed to caller)
        futures::future::pending::<()>().await;
    });
}
