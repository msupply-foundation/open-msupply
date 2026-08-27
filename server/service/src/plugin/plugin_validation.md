# Plugin Validation

Plugins can modify the behaviour of mSupply and can potentially leak confidential information.
For this reason its important that plugins come from a trusted party.
For example, a malicious user could trick an mSupply user to install a modified plugin.
To avoid this, plugins are signed and only plugins that can be verified to come from a trusted party are loaded.

To sign a plugin, a trusted party needs a private key for signing a plugin and a matching public certificate which is later used for verifying that the plugin hasn't been modified.
The public certificate can either be self-signed or signed by another trusted party.
Using this key pair, a plugin can be signed using the mSupply cli.
A signed plugin contains a `manifest.json` and `manifest.signature` file.
The `manifest.json` file contains a list of plugin files along with their hashes, along with the public certificate.

To validate a plugin, the mSupply remote server needs to validate that it trusts the certificate that comes with the plugin (which is stored in the `manifest.json`).
This is done by verifying the certificate against a list of trusted certificates which are stored in the `app_data/plugin_certs` directory.
If the plugin certificate is trusted, it is then validated that the `manifest.json` file matches the `manifest.signature`.
The `manifest.json` file is then used to only serve plugin files that are listed in the manifest.

# Generating Keys

There are two types of public validation certificates.

1. Self-signed certificates: These self-signed certificates need to be copied to the `app_data/plugin_certs`
2. Certificates that are signed by a trusted party: These certificated must be signed by a certificate already in the `app_data/plugin_certs` server directory

## Self-signed Certificates

A self-signed certificate can, for example, be generated using:

```bash
openssl req -x509 -newkey rsa:2048 -keyout private.pem -out public.pem -nodes
```

In this example, the `public.pem` file needs to be copied to the `app_data/plugin_certs` server directory.

## Certificates that are signed by a trusted party

A 3rd party plugin developer can generate their own private key & signing request and then let mSupply generate a public certificate.
This 3rd party certificate can be used to sign the 3rd party plugin but doesn't need to be added to the remote server.
However, the remote server needs to have the mSupply certificate installed (the one used to sign the 3rd party certificate).
I.e., the mSupply "root" certificate is used to validates the 3rd party certificate shipped with the plugin which in turn is used to validate that the plugin hasn't been modified.

1. A private signing key and public certificate signing request (CSR) needs to be generated:

```bash
openssl req -newkey rsa:2048 -keyout private_3rd.pem -out public_3rd.csr -nodes
```

The signing request (e.g. `public_3rd.csr`) needs to be sent to mSupply.

2. mSupply signs the request using their own key-pair like:

```bash
openssl x509 -req -in public_3rd.csr -CA public.pem -CAkey private.pem -out public_3rd.pem -sha256
```

The `public_3rd.pem` file is sent back to the 3rd plugin developer.

3. The 3rd developer can now sign their plugin using `private_3rd.pem` and `public_3rd.pem`.

# Plugin Signing

The CLI interface can then be used sign a plugin.
This will place the `manifest.json` and the `manifest.signature` file into the plugin directory.
For example:

```bash
cargo run --bin remote_server_cli -- sign-plugin -p ./app_data/plugins/StockDonor/ -k pathtokeys/private.pem -c pathtokeyskey/public.pem
```

# Development

In development mode the plugin validation is disabled.
However, validation errors are still shown in the remote server logs.
