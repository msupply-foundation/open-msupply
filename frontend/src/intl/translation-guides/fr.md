# French (`fr`) translation guide

Read by the `translate` skill before drafting French, and the place native speakers record
decisions. Every entry below was taken from how the existing `fr` catalog already renders the
term (majority usage, with counts at the time of seeding, 2026-10-29). It was not invented. A
native-speaker ruling overrides anything here: edit the entry and note who decided it.

## Register and style

- **Formal _vous_** throughout (109 strings use _vous/votre/veuillez_, none use _tu_).
  Requests are phrased _Veuillez …_.
- **Buttons use the infinitive**: _Ajouter_, _Créer une livraison_, _Finaliser_ (128 of 188
  buttons; the imperative _-ez_ form appears only 3 times).
- **Labels and headings use sentence case**: _Date d'expiration_, not _Date d'Expiration_. A few
  older title-cased labels exist; don't copy them.
- **French punctuation**: a space before `:` (_Note : …_), `?` and `!`. Use typographic
  apostrophes or straight `'` consistently with the surrounding string. Straight `'` is the
  catalog majority.
- Column headers and short labels may abbreviate. Abbreviations already established in the
  catalog:
  - _Cond._ for conditionnement(s), e.g. _Cond. comptés_, _Coût / Cond._, _Unités / Cond._
  - _Qté_ for quantité
  - _Réf._ for référence (sometimes _Ref._ without the accent; prefer _Réf._)
  - _nb_ for nombre, e.g. _Nouveau nb d'unités par cond._

  Abbreviate only where the usage shows a column header, chip or tight label. Write the term in
  full in sentences (`messages.`, `error.`, `description.`).

- Units go in parentheses after the noun: _Stock (unités)_, _Utilisable (unités)_.

## Glossary

| English                                   | French                                                  | Notes                                                                                            |
| ----------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| stocktake                                 | inventaire                                              | 100/105                                                                                          |
| store (an mSupply store)                  | dépôt                                                   | 38 vs _magasin_ 25; see open questions                                                           |
| item                                      | article                                                 | 192; _élément_ only for non-stock UI things                                                      |
| batch                                     | lot                                                     | 27/28                                                                                            |
| expiry / expiry date                      | expiration / date d'expiration                          | _péremption_ not used                                                                            |
| pack                                      | conditionnement (_cond._)                               |                                                                                                  |
| pack size                                 | unités par conditionnement (_Unités / Cond._)           | see open questions                                                                               |
| stock on hand (SOH)                       | stock utilisable / stock total                          | depends on context; _stock utilisable_ when contrasted with unusable stock                       |
| available                                 | utilisable                                              | _Cond. utilisables_                                                                              |
| inbound shipment                          | livraison entrante                                      |                                                                                                  |
| outbound shipment                         | livraison sortante                                      |                                                                                                  |
| shipment                                  | livraison                                               |                                                                                                  |
| requisition                               | réquisition                                             | 51 vs _commande_ 4                                                                               |
| internal order                            | commande interne                                        |                                                                                                  |
| purchase order (PO)                       | commande d'achat                                        | 62 vs _bon de commande_ 5                                                                        |
| supplier                                  | fournisseur                                             |                                                                                                  |
| customer                                  | client                                                  |                                                                                                  |
| master list                               | liste maîtresse                                         | 10 vs _liste maitresse_ 3 and _liste principale_ 3                                               |
| location (storage)                        | emplacement                                             | _localisation_ only for geolocation                                                              |
| AMC (average monthly consumption)         | CMM (consommation mensuelle moyenne)                    |                                                                                                  |
| months of stock / months cover            | couverture (mois)                                       |                                                                                                  |
| finalise                                  | finaliser                                               |                                                                                                  |
| sync / synchronise                        | synchronisation / synchroniser                          |                                                                                                  |
| vaccine                                   | vaccin                                                  |                                                                                                  |
| immunisation programme                    | programme de vaccination                                |                                                                                                  |
| vaccine course                            | schéma de vaccination                                   |                                                                                                  |
| cold chain                                | chaîne du froid                                         |                                                                                                  |
| patient                                   | patient                                                 |                                                                                                  |
| prescription                              | prescription                                            | _ordonnance_ once                                                                                |
| dispensing                                | délivrance                                              | see open questions                                                                               |
| donor (funding)                           | donateur                                                | see open questions                                                                               |
| wastage                                   | perte (adjustments), taux de déperdition (wastage rate) |                                                                                                  |
| reason (adjustment, log)                  | motif                                                   | see open questions                                                                               |
| issued (stock leaving)                    | livré / alloué                                          | _alloué_ for packs issued against a line                                                         |
| facility                                  | site                                                    | see open questions                                                                               |
| encounter                                 | rencontre                                               | `fr-DJ` uses _visite_                                                                            |
| barcode                                   | code-barres (pl. codes-barres)                          | settled 2026-10-29; the catalog is split with _code-barre_                                       |
| prescription request (prescriber's order) | ordonnance (f.)                                         | James, 2026-10-29: use until a native speaker decides; see open questions                        |
| dispensing record                         | prescription (f.)                                       | catalog majority; avoid _record de délivrance_                                                   |
| dispensary                                | dispensaire                                             |                                                                                                  |
| activity (formerly campaign)              | campagne                                                | James, 2026-10-29: keep the catalog's _campagne_ (not _activité_) until a native speaker decides |
| discount                                  | remise                                                  | vs _réduction_ in two labels                                                                     |
| pair / pairing (scanner)                  | appairer / appairage                                    |                                                                                                  |
| safety stock / supply interval            | stock de sécurité / intervalle d'approvisionnement      |                                                                                                  |
| maintenance mode / processors             | mode maintenance / processeurs                          |                                                                                                  |
| auto-allocate                             | allouer automatiquement                                 | vs _affecter_ in `messages.stock-expired`                                                        |

## `fr-DJ` (Djibouti) watch list

`fr-DJ` is a hand-maintained overlay. The skill never writes to it. When a new French string
uses one of the terms below, flag it to the developer as a possible `fr-DJ` override. Djibouti
consistently replaces:

| `fr`                    | `fr-DJ`          |
| ----------------------- | ---------------- |
| conditionnement / cond. | boîte(s)         |
| livraison entrante      | bon de livraison |
| livraison sortante      | sortie de stock  |
| commande interne        | bon de commande  |
| rencontre               | visite           |

## Open questions for a native speaker

Each item lists where the variants appear. Where the drafts had to choose, the choice is noted.

These are existing inconsistencies. The skill does not change them. New strings follow the
majority form shown in the glossary until someone rules.

- **store**: _dépôt_ (38) vs _magasin_ (25), e.g. `button.edit-current-store` uses _magasin_,
  and `auth.no-store-assigned` uses _dépôt_. `permission.StoreAccess` uses _boutique_.
- **pack size**: _nombre d'unités par conditionnement_ / _Unités / Cond._ vs _taille du colis_
  (`error.pack-size-min`, `stocktake.column.pack-size`, `stocktake.line-edit.pack-size`).
- **master list**: _liste maîtresse_ vs _liste maitresse_ (spelling) vs _liste principale_
  (`label.add-from-master-list`, `stocktake.filter.master-list`).
- **dispensing**: _délivrance_ vs _prescription_ vs _ordonnance_. "Dispensing record" is
  rendered both _record de délivrance_ (an anglicism) and _prescription_.
- **donor**: _donneur_ (most labels) vs _donateur_ (`heading.donor-name`). In a funding context
  _donateur_ (or _bailleur_) is the usual word, while _donneur_ suggests a blood or organ donor.
- **reason**: _raison_ (22) vs _motif_ (6). _Motif_ is the usual term for an adjustment reason.
- **facility**: _site_ vs _structure_ vs _installation_ vs _Facilité_. _Facilité_ is a false
  friend, at `label.facility`.
- **purchase order**: _commande d'achat_ (62) vs _bon de commande_ (5). `fr-DJ` also uses
  _bon de commande_ for internal orders, so the two can collide.
- **prescription vs ordonnance**: the new prescription-request flow needs two words. The drafts
  use _ordonnance_ for the prescriber's request and keep _prescription_ for the dispensing
  record, as the catalog already does. `nav.dispensary.prescription` is _Ordonnances_ but
  means dispensing records, so it now collides. `button.new-dispensing-record` = _Nouveau
  record de délivrance_ and `label.create-prescription` = _Créer un enregistrement de
  délivrance_ are a third and fourth wording.
- **activity vs campagne**: the English renamed campaigns to activities. French keeps
  _campagne_ for both old and new strings until a native speaker decides whether to move to
  _activité_.
- **vaccine course**: the glossary says _schéma de vaccination_, but older strings use
  _calendrier de vaccination_ (`button.add-new-vaccine-course`) and _fiche vaccin_
  (`heading.create-vaccine-course`, `label.immunisation-name`).
- **encounter**: _rencontre_ (`label.encounter`) vs _consultation_ (`label.encounters`,
  `nav.dispensary.encounter`, `label.encounter-id`).
- **expected delivery date**: _estimée_ (`label.expected-delivery-date`) vs _prévue_
  elsewhere. The drafts use _prévue_.
- **service charges**: _Frais additionnels_ (`heading.service-charges`) vs _Frais de service_
  (the majority, used by the drafts).

## Likely errors in existing translations

Found while drafting. The skill doesn't fix these; they're for the translation team.

- `label.price-per-pack-after-discount` / `-before-discount` say _Prix par unité_ (per unit)
  for "per pack".
- `label.facility` = _Facilité_, a false friend; elsewhere it is _site_.
- `label.expired-stock` = _Expiration des stocks_; it should be _Stock expiré_.
- `label.to-confirmed-datetime` = _Date à confirmer_, which means the opposite of "to
  confirmed date".
- `heading.enter-values-manually` = _Continuer sans variante_, which doesn't match the
  English.
- `label.cancel-prescription` = _Annulé prescription_; it should be _Annuler la prescription_.
- `label.target-stock` adds a _(CMM)_ that isn't in the English.
- Typos: `label.ancillary-of` _Auxiilaire_, `label.ancillary-item` _auxiliare_,
  `heading.stores` / `nav.manage.stores` _Dépots_, `server-error.NotThisStoreRnRForm`
  _dépot_.
- Stale against changed English: `messages.confirm-delete-plugin` and
  `messages.plugin-deleted-successfully` leave out "it stays active until the server
  restarts".
- `label.packs` = _Emballages_ and `label.packs-to-move` = _Packs à déplacer_ are off-glossary
  (the glossary uses _conditionnement_).
