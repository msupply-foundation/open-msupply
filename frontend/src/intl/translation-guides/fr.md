# French (`fr`) translation guide

Read by the `translate` skill before drafting French.

**The French PMs' rules and glossary,
[`FR_translation_rules_and_glossary.html`](FR_translation_rules_and_glossary.html), take
precedence.** It is their Google Doc, downloaded as-is: to update it, download the doc again
(File → Download → Web page) and replace the file, and never edit it by hand. Read it first. Its
"Non utilisé" column lists words to avoid, and its ten rules cover:

- gendered forms;
- short labels;
- the spaced slash in _Unités / Cond._;
- error-message wording;
- import/export vs upload/download;
- accents;
- capitals;
- words left in English (_Legacy_, brand names);
- confirmation buttons;
- generic words such as _Quantité_.

This file only adds what the glossary doesn't cover:

- the house style taken from the catalog;
- terms settled since the glossary was written;
- the `fr-DJ` watch list;
- open questions for the PMs;
- likely errors in existing strings.

Where this file and the glossary disagree, the glossary wins. Fix this file to match it.

## House style not covered by the glossary

- **Formal _vous_** throughout (109 strings use _vous/votre/veuillez_, none use _tu_).
  Requests are phrased _Veuillez …_.
- **Buttons use the infinitive**: _Ajouter_, _Créer une livraison_, _Finaliser_.
- **Statuses and short log entries use the masculine**, like the glossary's status table
  (_Créé_, _Alloué_, _Prêt pour envoi_), even where the record is a feminine noun.
- **French punctuation**: a space before `:` (_Note : …_), `?` and `!`.
- **Shortened forms already in the catalog**, beyond the glossary's _Cond._ and _CMM_:
  - _Qté_ for quantité;
  - _Réf._ for référence;
  - _nb_ for nombre.

  Shorten only where the usage shows a column header, chip or tight label. Write the word in
  full in sentences (`messages.`, `error.`, `description.`).

- **Units go in parentheses after the noun**: _Stock (unités)_, _Utilisable (unités)_.

## Terms the glossary doesn't cover

| English                                   | French                                                  | Notes                                                                                  |
| ----------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| shipment                                  | livraison                                               |                                                                                        |
| location (storage)                        | emplacement                                             | _localisation_ only for geolocation                                                    |
| sync / synchronise                        | synchronisation / synchroniser                          |                                                                                        |
| immunisation programme                    | programme de vaccination                                |                                                                                        |
| cold chain                                | chaîne du froid                                         |                                                                                        |
| dispensing                                | délivrance                                              | see open questions                                                                     |
| dispensing record                         | prescription                                            | catalog majority; avoid _record de délivrance_                                         |
| prescription request (prescriber's order) | ordonnance                                              | James, 2026-10-29: use until the PMs decide; see open questions                        |
| dispensary                                | dispensaire                                             |                                                                                        |
| activity (formerly campaign)              | campagne                                                | James, 2026-10-29: keep the catalog's _campagne_ (not _activité_) until the PMs decide |
| barcode                                   | code-barres (pl. codes-barres)                          | the catalog is split with _code-barre_                                                 |
| discount                                  | remise                                                  | vs _réduction_ in two labels                                                           |
| wastage                                   | perte (adjustments), taux de déperdition (wastage rate) |                                                                                        |
| reason (adjustment, log)                  | motif                                                   | see open questions                                                                     |
| donor (funding)                           | donateur                                                | see open questions                                                                     |
| pair / pairing (scanner)                  | appairer / appairage                                    |                                                                                        |
| maintenance mode / processors             | mode maintenance / processeurs                          |                                                                                        |
| auto-allocate                             | allouer automatiquement                                 | vs _affecter_ in `messages.stock-expired`                                              |

## `fr-DJ` (Djibouti) watch list

`fr-DJ` is a hand-maintained overlay. The skill never writes to it. When a new French string
uses one of the words below, flag it to the developer as a possible `fr-DJ` override. Djibouti
replaces:

| `fr`                    | `fr-DJ`          |
| ----------------------- | ---------------- |
| conditionnement / cond. | boîte(s)         |
| livraison entrante      | bon de livraison |
| livraison sortante      | sortie de stock  |
| commande interne        | bon de commande  |
| consultation            | visite           |

## Open questions for the PMs

These questions aren't settled by the glossary. Each lists where the variants appear; where the
drafts had to choose, the choice is noted.

- **prescription vs ordonnance**: the prescription-request screens need two words. The drafts
  use _ordonnance_ for the prescriber's request and keep _prescription_ for the dispensing
  record, as the catalog already does. `nav.dispensary.prescription` says _Ordonnances_ but
  opens dispensing records, so it now clashes. `button.new-dispensing-record` (_Nouveau record
  de délivrance_) and `label.create-prescription` (_Créer un enregistrement de délivrance_) use
  a third and a fourth wording.
- **activity vs campagne**: the English renamed campaigns to activities. French keeps
  _campagne_ for old and new strings until the PMs decide whether to move to _activité_.
- **reason**: _raison_ (22) vs _motif_ (6). _Motif_ is the usual word for an adjustment reason.
- **donor**: _donneur_ (most labels) vs _donateur_ (`heading.donor-name`). For funding,
  _donateur_ (or _bailleur_) is usual; _donneur_ suggests a blood or organ donor.
- **facility**: _site_ vs _structure_ vs _installation_ vs _Facilité_. The glossary's _Type de
  dépôt_ for "Facility Type" suggests _dépôt_.
- **expected delivery date**: _estimée_ (`label.expected-delivery-date`) vs _prévue_
  elsewhere. The drafts use _prévue_.
- **service charges**: _Frais additionnels_ (`heading.service-charges`) vs _Frais de service_
  (the majority, used by the drafts).

## Likely errors in existing translations

Found while drafting. The skill doesn't fix these; they're for the PMs.

- `label.price-per-pack-after-discount` / `-before-discount` say _Prix par unité_ (per unit)
  for "per pack".
- `label.facility` = _Facilité_, a false friend.
- `label.expired-stock` = _Expiration des stocks_; it should be _Stock expiré_.
- `label.to-confirmed-datetime` = _Date à confirmer_, which isn't what "to confirmed date"
  means.
- `heading.enter-values-manually` = _Continuer sans variante_, which doesn't match the English.
- `label.cancel-prescription` = _Annulé prescription_; it should be _Annuler la prescription_.
- Typos: `label.ancillary-of` _Auxiilaire_, `label.ancillary-item` _auxiliare_,
  `heading.stores` / `nav.manage.stores` _Dépots_, `server-error.NotThisStoreRnRForm`
  _dépot_.
- Out of date against changed English: `messages.confirm-delete-plugin` and
  `messages.plugin-deleted-successfully` leave out "it stays active until the server
  restarts".
