+++
title = "Documentation Information"
description = "Information about documentation"
date = 2021-05-01T19:30:00+00:00
updated = 2021-05-01T19:30:00+00:00
draft = false
weight = 55
sort_by = "weight"
template = "docs/page.html"

[extra]
toc = true
+++

# General

This document is generated using zola with [fork of adidoks theme](https://github.com/openmsupply/adidoks). Document content is located in `./docs/content/docs` folder of [repository](https://github.com/openmsupply/remote-server). 

You can run local version while developing:
* [install zola](https://www.getzola.org/documentation/getting-started/installation/)
* pull theme sub module (`git submodule init && git submodule update`)
* run `zola serve`, and navigate to `localhost:1111`. 

Alternatively you can [dockerised version](https://github.com/openmsupply/remote-server/tree/main/docker/zola_docs)

# Syntax Highlight

Zola default markdown syntax highlight parser grouped a lot of graphQL tokens, also conflict with theme styles made code blocks hard to see. So we've changed to using [prismjs](https://prismjs.com/). This required a little bit of overriding:

Extended base [page.html](https://github.com/openmsupply/remote-server/blob/main/docs/templates/page.html) to include `prism.js` `prism.css` and `theme_override.css`.


Generated `prism.js` and `prism.css` with default style for languages listed below, using prism [custom download tool](https://prismjs.com/download.html#themes=prism&languages=clike+javascript+graphql+json+rust+typescript), added to [static folder](https://github.com/openmsupply/remote-server/tree/main/docs/static)

Added override of some styles, described [here](https://github.com/openmsupply/remote-server/blob/main/docs/sass/theme_override.scss)

<ins>Adding new Languages</ins>

Prism syntax highlight languages in bundles `js` and `css`:

`javascript` `graphql` `json` `rust` `typescript` (as per this [link](https://prismjs.com/download.html#themes=prism&languages=clike+javascript+graphql+json+rust+typescript))

In order to add a new language:
* go to the link above
* download and replace files in [static folder](https://github.com/openmsupply/remote-server/tree/main/docs/static)
* update this doc including link to prismjs download tool
