use crate::certs::Protocol;
use local_ip_address::list_afinet_netifas;
use serde::Serialize;
use service::settings::ServerSettings;
use simple_dns::{
    rdata::{RData, TXT},
    Name, ResourceRecord, CLASS,
};
use simple_mdns::SimpleMdnsResponder;
use std::net::{IpAddr, Ipv4Addr};

const SERVICE_NAME: &'static str = "_omsupply._tcp.local";

pub(crate) struct Discovery {
    #[allow(dead_code)]
    // Need to hold instance of responder after start
    responder: SimpleMdnsResponder,
}

impl Discovery {
    pub fn start(server_info: ServerInfo) -> Self {
        let response = FrontEndHost::new(server_info);

        let mut responder = SimpleMdnsResponder::new(10);
        let srv_name = Name::new_unchecked(SERVICE_NAME);

        responder.add_resource(ResourceRecord::new(
            srv_name.clone(),
            CLASS::IN,
            10,
            RData::TXT(TXT::new().with_string(&response.as_json_string()).unwrap()).into_owned(),
        ));

        Discovery { responder }
    }
}

#[derive(Clone)]
pub struct ServerInfo {
    protocol: Protocol,
    port: u16,
    ip: Ipv4Addr,
}

impl ServerInfo {
    pub fn new(protocol: Protocol, settings: &ServerSettings) -> Self {
        ServerInfo {
            protocol,
            port: settings.port,
            ip: get_local_ip(),
        }
    }
}

fn get_local_ip() -> Ipv4Addr {
    let network_interfaces = list_afinet_netifas().unwrap();

    let v4_ips: Vec<Ipv4Addr> = network_interfaces
        .into_iter()
        .filter_map(|(_, ip)| match ip {
            IpAddr::V4(ip) => Some(ip),
            _ => None,
        })
        .collect();

    let local_network_ip = v4_ips.iter().find(|ip| ip.is_private());
    let loopback_ip = v4_ips.iter().find(|ip| ip.is_loopback());

    local_network_ip
        .unwrap_or(loopback_ip.expect("Cannot find local network or lookback address"))
        .to_owned()
}

// Should match client/packages/common/src/hooks/useElectronClient/index.ts (FrontEndHost)
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FrontEndHost {
    port: u16,
    ip: String,
    // Could be organisation name (from data synced)
    name: String,
    // To tell client to update (this is just if 'base' client has changed, don't need to update every time f/e changes)
    client_version: String,
    protocol: String,
}

impl FrontEndHost {
    fn new(server_info: ServerInfo) -> Self {
        FrontEndHost {
            port: server_info.port,
            ip: server_info.ip.to_string(),
            protocol: server_info.protocol.to_string(),
            name: "Demo".to_string(),
            client_version: "".to_string(),
        }
    }

    fn as_json_string(&self) -> String {
        serde_json::to_string(&self).unwrap()
    }
}
