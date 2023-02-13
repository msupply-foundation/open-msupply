use crate::certs::Protocol;
use async_dnssd::{RegisterData, TxtRecord};

const SERVICE_NAME: &'static str = "_omsupply._tcp";
const NAME: &'static str = "omSupplyServer";

const PROTOCOL_KEY: &'static str = "protocol";
const CLIENT_VERSION_KEY: &'static str = "client_version";
const HARDWARE_ID_KEY: &'static str = "hardware_id";

const CLIENT_VERSION: &'static str = "unspecified";

pub(crate) fn start_discovery(protocol: Protocol, port: u16, hardware_id: String) {
    tokio::task::spawn(async move {
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

        // Without this discovery stops (even if result of register_extended is kept and passed to caller)
        futures::future::pending::<()>().await;
    });
}
