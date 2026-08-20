use std::{
    io::{Read, Write},
    net::TcpListener,
    thread,
};

/// One scripted reply, consumed by one incoming connection in order.
pub(crate) enum ScriptedResponse {
    /// Promise `content_length` bytes, send `body` (shorter), then drop the socket - the
    /// client sees the connection die part-way through reading the response body.
    TruncatedBody {
        content_length: usize,
        body: &'static str,
    },
    /// A complete `200` with this body.
    Complete(String),
}

/// A minimal HTTP server that replies to each connection with the next scripted response.
///
/// `httpmock` can't truncate a response mid-body, which is the failure we need to
/// reproduce: central answers `200 OK`, then the connection dies while the body streams.
/// Requests are answered in order, so `[TruncatedBody, Complete]` reproduces
/// "fails once, then succeeds on retry".
///
/// Only request headers are read, so scripted endpoints should be GETs (or POSTs whose
/// body is small enough to fit the socket buffer).
pub(crate) struct ScriptedServer {
    url: String,
}

impl ScriptedServer {
    pub(crate) fn start(responses: Vec<ScriptedResponse>) -> Self {
        let listener = TcpListener::bind("127.0.0.1:0").expect("Cannot bind test listener");
        let url = format!(
            "http://{}",
            listener
                .local_addr()
                .expect("Cannot read test listener addr")
        );

        thread::spawn(move || {
            for response in responses {
                let Ok((mut stream, _)) = listener.accept() else {
                    return;
                };
                read_request_headers(&mut stream);

                match response {
                    ScriptedResponse::TruncatedBody {
                        content_length,
                        body,
                    } => {
                        let _ = write!(
                            stream,
                            "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\n\r\n{}",
                            content_length, body
                        );
                        let _ = stream.flush();
                        // Dropping mid-body is the whole point: the client is left waiting
                        // for bytes that never arrive.
                        drop(stream);
                    }
                    ScriptedResponse::Complete(body) => {
                        let _ = write!(
                            stream,
                            "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                            body.len(),
                            body
                        );
                        let _ = stream.flush();
                    }
                }
            }
        });

        ScriptedServer { url }
    }

    pub(crate) fn url(&self) -> &str {
        &self.url
    }
}

/// Read up to the end of the request headers, so the client's write completes before we reply.
fn read_request_headers(stream: &mut std::net::TcpStream) {
    let mut request = Vec::new();
    let mut buffer = [0u8; 1024];
    while !request.windows(4).any(|window| window == b"\r\n\r\n") {
        match stream.read(&mut buffer) {
            Ok(0) | Err(_) => return,
            Ok(read) => request.extend_from_slice(&buffer[..read]),
        }
    }
}
