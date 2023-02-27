use crate::certs::Protocol;
use {astro_dnssd::DNSServiceBuilder, std::collections::HashMap};

const SERVICE_NAME: &'static str = "_omsupply._tcp";
const NAME: &'static str = "omSupplyServer";
const PROTOCOL_KEY: &'static str = "protocol";
const CLIENT_VERSION_KEY: &'static str = "client_version";
const HARDWARE_ID_KEY: &'static str = "hardware_id";
const CLIENT_VERSION: &'static str = "unspecified";

pub(crate) fn start_discovery(protocol: Protocol, port: u16, hardware_id: String) {
    tokio::task::spawn(async move {
        let mut text_record = HashMap::<String, String>::new();
        text_record.insert(HARDWARE_ID_KEY.to_string(), hardware_id.to_string());
        text_record.insert(CLIENT_VERSION_KEY.to_string(), CLIENT_VERSION.to_string());
        text_record.insert(PROTOCOL_KEY.to_string(), protocol.to_string());
        // need to keep the thread running
        // found that the discovery client in electron did not pick up the server at times
        // and running register again was necessary for the server to be found
        loop {
            let service = DNSServiceBuilder::new(SERVICE_NAME, port)
                .with_txt_record(text_record.clone())
                .with_name(NAME)
                .register();
            {
                match service {
                    Ok(_service) => {
                        tokio::time::sleep(std::time::Duration::from_secs(60)).await;
                    }
                    Err(e) => {
                        log::error!("Error registering discovery: {:?}", e);
                        break;
                    }
                }
            }
        }
    });
}
