+++
title = "Documentation"
weight = 30
sort_by = "weight"
template = "docs/section.html"

[extra]
source = "docs"
+++

# Documentation

## Public Documentation

**Feature documentation should be done by the team that implemented the feature. Please also update the [Introduction](https://docs.msupply.foundation/docs/introduction/introduction/) and [Permissions](https://docs.msupply.foundation/docs/administration/permissions/) pages if needed.**

Any Pull Request (PR) that has changes to the functionality or User Interface (UI) needs to be labelled with `docs: external` and the `Documentation` part of the PR needs to be filled out. You do not have to write up the whole documentation here, just a couple of bullet points or screenshots to indicate what has been changed / how it should work.

Any updates to the public docs should be done in a PR branched off the current `staging` branch in the [mSupply_docs](https://github.com/msupply-foundation/msupply_docs) repository and will be merged on release cycle's PR merged date.

Example:

```
## 📃 Documentation
<!-- Note down any areas which require documentation updates -->

- [ ] New `issued` column in `Requisitions` indicates stock quantity already in shipments
```

### Documentation Standards

1. We use New Zealand English spelling conventions
1. Only screenshot the `App Nav` section when screenshotting `gotos`
1. Use a table when listing out columns with descriptions
1. Try not to get the App Nav in screenshots or have it collapsed so that screenshots don't have to be updated when App Nav is updated
1. You can add a callout-style section by adding a `div` with a class of `note`, `tip`, `omsupdate`, `warning` ( for Spanish and French translators, yes, you can use `nota / remarque`, `conseil / consejo`, `mise-a-jour / noticia`, `aviso / avertissement` )

![Callout example](https://github.com/msupply-foundation/open-msupply/assets/9192912/ba4a3990-ef74-4e1e-87e1-af411a6db018)

![Callout example 2](https://github.com/msupply-foundation/open-msupply/assets/9192912/32d2ad80-e454-49a0-8a23-81b3cfe740b8)

5. You can also add an image title using a div with the `imagetitle` class

![Image title example](https://github.com/msupply-foundation/open-msupply/assets/9192912/25feb6d4-012a-4419-ac6b-f6e443635993)

e.g.

```
<div class="imagetitle">
In the below example, there is the picture of a cat
</div>

![Random cat picture](/docs/catalogue/images/cat.png)
```

6. When inserting images, we prefer the syntax `![Image description](/docs/catalogue/images/image_name.png)`. You may need to use the `<img/>` tag when adding images to `<div/>` elements, such as notes, don't use them elsewhere though.
7. Use simple language, and think carefully about how ambiguous the wording can be. Check your assumptions and tend toward being more descriptive than you might otherwise when explaining things.
8. When writing bullet lists, these should be terminated with full stop if the line consists of multiple sentences, and not have a full stop if consisting of a single sentence
9. Don't use gifs! The documentation is currently littered with gifs which have a huge file size, making the overall bundle of docs too big to include as offline docs. We would like to reduce the bundle size. We are also trying to produce a PDF version of the documentation and gifs are not supported.
10. Please take screenshots of a remote site, and not the Open mSupply central server - unless explicitly describing central server functionality of course! Most users are using the remote site, and it is confusing having the screen appear differently to your screen in the documentation imagery.
11. When annotating images with arrows or circle highlights, use the orange colour (#F09837) (side note: I see a lot of different variations here.. this is the most common) and a thick line (3rd from bottom in the preview markup tool)


## Internal Documentation

Any part of the code base that needs internal documentation needs to be labelled with `docs: internal`.

**Once you have done the docs whether they be external or internal, please change the label from `docs: external` or `docs: internal` to `doc: done`**
