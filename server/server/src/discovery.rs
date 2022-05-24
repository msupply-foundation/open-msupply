use std::{
    fmt::Display,
    net::{IpAddr, Ipv4Addr},
};

use local_ip_address::list_afinet_netifas;
use service::settings::ServerSettings;

#[derive(Clone)]
pub enum Protocol {
    Http,
    Https,
}

impl Display for Protocol {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "{}",
            match self {
                Protocol::Http => "http",
                Protocol::Https => "https",
            }
        )
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

    pub fn as_url(&self) -> String {
        format!("{}://{}:{}", self.protocol, self.ip, self.port)
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
