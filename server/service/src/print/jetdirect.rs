use anyhow::Result;
use std::net::IpAddr;
use std::str::FromStr;
use std::time::Duration;
use std::{io::Write, net::SocketAddr};
use telnet::{Event, Telnet};

const PRINTER_COMMAND_TIMEOUT: Duration = Duration::new(0, 500);
const PRINTER_CONNECTION_TIMEOUT: Duration = Duration::new(5, 0);

// Note: this file is mostly taken from https://github.com/fearful-symmetry/zebrasend/blob/main/src/cmd/jetdirect.rs

pub struct Jetdirect {
    addr: String,
    port: u16,
}

#[derive(PartialEq, Debug)]
pub enum Mode {
    Sgd,
    Print,
}

impl Jetdirect {
    pub fn new(addr: String, port: u16) -> Jetdirect {
        Jetdirect { addr, port }
    }
}

impl Jetdirect {
    fn send_command(
        &self,
        payload: String,
        handle: &mut telnet::Telnet,
        mode: Mode,
        timeout: Duration,
    ) -> Result<String> {
        handle.write(payload.as_bytes())?;
        // As far as I can tell, there's no way to detect the end of an SGD command response.
        // There can be any number of double-quotes; there's no terminating control character, newline, etc.
        // Only thing we can really do is print lines as we get them, and wait for a timeout.
        let mut response = String::new();
        loop {
            let event = handle.read_timeout(timeout)?;
            match event {
                Event::Data(data) => {
                    if mode == Mode::Sgd {
                        let resp_part = String::from_utf8_lossy(&data);
                        response.push_str(&resp_part);
                        std::io::stdout().flush()?;
                        if return_early(&data) {
                            break;
                        }
                    }
                }
                Event::TimedOut => {
                    // We don't get the line break at the end of a response, usually
                    break;
                }
                _ => {
                    println!("Got other jetdirect event: {:?}", event)
                }
            }
        }

        Ok(response)
    }

    pub fn send_string(&self, data: String, mode: Mode) -> Result<String> {
        let ip_addr = IpAddr::from_str(&self.addr).expect("Invalid IP address");

        println!("Parsed IP address: {:?}", ip_addr);

        let socket = SocketAddr::new(ip_addr, self.port);
        let mut telnet = Telnet::connect_timeout(&socket, 512, PRINTER_CONNECTION_TIMEOUT)?;
        self.send_command(data, &mut telnet, mode, PRINTER_COMMAND_TIMEOUT)
    }
}

// some heuristics to guess if we can return early from listening on the socket
fn return_early(payload: &[u8]) -> bool {
    let err = r#""?""#.as_bytes();
    if payload == err {
        return true;
    };
    let quote: u8 = 34;
    let nl: u8 = 10;
    let tab: u8 = 9;
    // if only have two quotes, but no whitespace formatting, we probably got back a basic response, can return
    let quote_count = payload.iter().filter(|x| *x == &quote).count();
    let ws_count = payload.iter().filter(|x| *x == &nl || *x == &tab).count();

    if ws_count == 0 && quote_count == 2 {
        return true;
    }

    false
}
