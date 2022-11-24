# Open mSupply

This is the home of an open source version of the popular [mSupply](https://msupply.org.nz/) - providing pharmaceutical supply chain management and dispensing, all the way from national warehouses to remote clinics, on servers, laptops and mobile.
Used in over 30 countries and for over 20 years and now becoming open source.

The code is separated into two main areas, the client and server:

### Client
Built on [React](https://reactjs.org/) - a responsive, multi-lingual, web based client, also packaged as both a desktop and android app.

For more information, [read the client developer docs](client/README.md)


### Server
Built to be fast and reliable using [Rust](https://www.rust-lang.org/) and supporting either [PostgreSQL](https://www.postgresql.org/) or [SQLite](https://www.sqlite.org/index.html) databases.

For more information, [read the server developer docs](server/README.md)

### Architecture
The client application is a web app, which is compiled and then hosted by the server. This can also be hosted externally by any web server, though this is no longer the recommended approach. The server connects to the database and provides a graphQL API which is consumed by the client app.

Users browse to the client app on the configured server port from a web browser, or the various wrappers which provide platform specific capabilities. This web app then connects to the server using graphQL in order to fetch data, and to the web server for app resources.

In diagrammatic form this looks like the image below:

![omSupply Architecture drawio](./architecture.svg)

There are also several ancilliary applications as noted, which are available to be run (cli applications) or hosted (storybook) separately.
