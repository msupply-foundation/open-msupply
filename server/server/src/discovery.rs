use crate::certs::Protocol;
use {astro_dnssd::DNSServiceBuilder, std::collections::HashMap};

const SERVICE_NAME: &str = "_omsupply._tcp";
const NAME: &str = "omSupplyServer";
const PROTOCOL_KEY: &str = "protocol";
const CLIENT_VERSION_KEY: &str = "client_version";
const HARDWARE_ID_KEY: &str = "hardware_id";
const CLIENT_VERSION: &str = "unspecified";

pub(crate) fn start_discovery(protocol: Protocol, port: u16, hardware_id: String) {
    tokio::task::spawn(async move {
        let mut text_record = HashMap::<String, String>::new();
        text_record.insert(HARDWARE_ID_KEY.to_string(), hardware_id.to_string());
        text_record.insert(CLIENT_VERSION_KEY.to_string(), CLIENT_VERSION.to_string());
        text_record.insert(PROTOCOL_KEY.to_string(), protocol.to_string());

        let registration_result = DNSServiceBuilder::new(SERVICE_NAME, port)
            .with_txt_record(text_record.clone())
            .with_name(NAME)
            .register();

        match registration_result {
            Ok(_service_handle) => futures::future::pending::<()>().await,
            Err(e) => log::error!("Error registering discovery: {:?}", e),
        }
    });
}
