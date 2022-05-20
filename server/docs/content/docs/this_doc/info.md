+++
title = "Info About These Docs"
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

These documents are generated using zola with [a fork of the Adidoks theme](https://github.com/openmsupply/adidoks). The documention content is located in the `./docs/content/docs` folder of [the Open mSupply Remote Server repository](https://github.com/openmsupply/remote-server). 

To run a local version of these docs while developing:
* [Install zola](https://www.getzola.org/documentation/getting-started/installation/)
* Pull the theme sub module by navigating to the theme folder and running (`git submodule init && git submodule update`)
* Run with `zola serve`, and open `localhost:1111` in your browser. 

Alternatively you can [use a dockerised version](https://github.com/openmsupply/remote-server/tree/main/docker/zola_docs)

# Syntax Highlight

Zola's default markdown syntax highlight parser grouped a lot of graphQL tokens, and conflicted with our theme styles so that code blocks were hard to see, so we've changed to using [prismjs](https://prismjs.com/). This required a little bit of overriding. We did the following:

* Extended the base [page.html](https://github.com/openmsupply/remote-server/blob/main/docs/templates/page.html) to include `prism.js` `prism.css` and `theme_override.css`.
* Generated `prism.js` and `prism.css` with default styles for the languages listed below, using Prism's [custom download tool](https://prismjs.com/download.html#themes=prism&languages=clike+javascript+graphql+json+rust+typescript), and added those files to the [static folder](https://github.com/openmsupply/remote-server/tree/main/docs/static)
* Added an override of some styles, as described [here](https://github.com/openmsupply/remote-server/blob/main/docs/sass/theme_override.scss)

### Adding new Languages

 In the bundles `js` and `css` there are Prism syntax highlight languages for:
* `javascript` 
* `graphql` 
* `json` 
* `rust` 
* `typescript` 

[Download link](https://prismjs.com/download.html#themes=prism&languages=clike+javascript+graphql+json+rust+typescript))

In order to add a new language:
* Go to the link above and edit it for the needed languages.
* Use it download and replace files in [static folder](https://github.com/openmsupply/remote-server/tree/main/docs/static)
* Update this doc including a link to the Prismjs download tool
