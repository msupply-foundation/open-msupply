<!---
This is uploaded to dockerhub manually
-->

# What is Open mSupply?

Open mSupply is an open source logistic management system for medicine distribution. 

[Documentation](https://docs.msupply.foundation/)

[The mSupply Foundation](https://msupply.foundation/home/)

[Github](https://github.com/msupply-foundation/open-msupply)

# Image flavours

Image comes with two flavours base, and dev (with -dev prefix). Dev image comes with client folder ready for development, with dependencies pre-installed

# How to use this image

Basic usage

```bash
docker run -p 9000:8000 msupplyfoundation/omsupply:v2.7.3
```

`note:` if you are using m-chip mac you need to add `--platform linux/amd64` (this just needs to be run the first time you run/pull image), or use `-arm64` tags if that build is available

Remember the first argument of `-p` is the local port on which you would like to run open mSupply.

## Initialise, Load reference data or from sqlite datafile

You will need to initialise database at this point, either by syncing to mSupply server (when connecting to local server you probably need to use `host.docker.internal` rather then localhost). 

This docker image comes with reference data that can be loaded via (with credentials Admin/pass)

```bash
docker run -e LOAD_REFERENCE_FILE=reference1 -p 9000:8000 msupplyfoundation/omsupply:v2.7.3
```

If you have sqlite database, you can mount it to `/database`, database name has to be omsupply-database (although can be overwritten see other features). i.e. if you have omsupply-database.sqlite file in `mydatabase` folder:

```bash
docker run -v "$(pwd)/mydatabase":/database -p 9000:8000 msupplyfoundation/omsupply:v2.7.3
```

Try combination of load reference file and above command mounted to an empty folder, and then open sqlite databse with sqlite browser.

## Running CLI

Docker image also allows you to run cli commands via arguments, for example to export graphql schema

```bash
docker run --rm -v "$(pwd)/putschemahere":/schemafolder msupplyfoundation/omsupply:v2.7.3 export-graphql-schema -p /schemafolder/schema.graphql
```

Try `--help` instead of export-graphql-schema to see more

## Date imitation 

For tests or stable demos it's good to be able to refresh dates or imitate a particular date.

With refresh dates env variable, will look at the latest date in the database and use it as reference to push all dates forward

```bash
docker run -e LOAD_REFERENCE_FILE=reference1 -e SHOULD_REFRESH_DATES=true -p 9000:8000 msupplyfoundation/omsupply:v2.7.3
```

Or with FAKETIME, which will set server time at particular date, this does not work for dates that are created in front end, like default filters for cold chain or home page dashboard

```bash
docker run -e LOAD_REFERENCE_FILE=reference1 -e FAKETIME="@2023-05-20 11:30:00" -p 9000:8000 msupplyfoundation/omsupply:v2.7.3
```

## Dev 

You can work on front end using the 'dev' flavour of omSupply image, it comes with all dependencies pre-installed (make sure clientdev folder is empty).

First, we need to copy front end dev files, this may take a few minutes

```bash
docker run --rm -v "$(pwd)/clientdev":/usr/src/omsupply/clientcopy -ti --entrypoint="/bin/bash" -w /usr/src/omsupply/ msupplyfoundation/omsupply:v2.7.3-dev -c "rsync -av --exclude='/node_modules' client/ clientdev/"
```

When overriding entrypoint like this, you can leave out arguments after image name, which will allow you bash into the image
 
Then we can start front end (`-v /usr/src/omsupply/client/node_modules` keeps node_modules folder from volume)

```bash
docker run -p 9003:3003 -v "$(pwd)/clientdev":/usr/src/omsupply/client -v /usr/src/omsupply/client/node_modules -ti --entrypoint="/bin/bash" -w /usr/src/omsupply/client msupplyfoundation/omsupply:v2.7.3-dev -c "yarn start --env API_HOST='http://localhost:9000'"
```

And start server 

```bash
docker run -p 9000:8000 msupplyfoundation/omsupply:v2.7.3
```

Now you can open your favorite editor in clientdev/client folder make changes, they should be reflect in web app (hot reload may not work reliably in this dev setup, so you might need to refresh the page)

# Other features

All configurations from [configuration file](https://github.com/msupply-foundation/open-msupply/blob/main/server/configuration/example.yaml) can be overwritten via env variable, for example to change database name or location:

```bash
docker run -e APP_DATABASE__DATABASE_NAME="/database/database-name" -p 9000:8000 msupplyfoundation/omsupply:v2.7.3
```
