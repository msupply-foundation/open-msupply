+++
title = "Requisition Transfer Processor"
weight = 10
template = "docs/page.html"

[extra]
source = "code"
+++

# Requisition Transfer Processor

As per general description in [transfer processors](../README.md) and these diagrams:

From [TMF internal google doc](https://docs.google.com/presentation/d/1eEe0uBGvkXbYnKc2oLO2U0qRwFv4l0ws4QwFZa6e74s/edit#slide=id.p):

<p><img src="./images/omSupply_requisition_transfer_workflow.png" title="omSupply requisition transfer processors" style="width: 100%"/></p>

From [TMF internal docs](https://app.diagrams.net/#G1o_xRQAhjVsnqhxhJEu9dY6AZ_lJfG9co)

<p><img src="./images/omSupply_requisition_transfer_processors.png" title="omSupply requisition transfer processors" style="width: 100%"/></p>

## Same site transfer (both stores on same site)

This shows how one instance of triggered processor can itself upsert records and process them in the next iteration

<p><img src="./images/omSupply_requisition_transfer_same_site.png" title="omSupply requisition transfer same site" style="width: 100%"/></p>
