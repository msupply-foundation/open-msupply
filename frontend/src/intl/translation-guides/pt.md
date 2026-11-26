# Portuguese (`pt`) translation guide

Read by the `translate` skill before drafting Portuguese.

**No team glossary exists yet for Portuguese.** Everything below is taken from the catalog
(`locales/pt/common.json`, 3,038 keys, 2,878 of them paired with an English key), counted with a
script over the pt values paired with en by key. Counts are numbers of keys. When a Portuguese
team or PM writes a glossary, it takes precedence and this file should be fixed to match it.

## House style

- **Formal register, mostly without a pronoun.** Requests use the third-person imperative
  (_Selecione_, _Clique_, _Insira_, _Verifique_, _Contacte_): 111 hits in sentence strings, no
  _tu_ imperatives (_seleciona_, _clica_). _Você_ is written out in 35 keys; _seu/sua_ in 29.
  Of the 124 English strings with "you/your", 49 drop the pronoun in Portuguese. _Por favor_
  opens requests in 41 keys. Write _Escolha o ficheiro_, _Ainda pode descarregar_, not
  _Escolhe_ / _podes_.
- **_Tu_ is a minority to avoid** (19 keys, mostly confirmation prompts: _Tens certeza…?_,
  _Estás pronto…?_, _Desejas prosseguir?_). Eight of them mix _tens_ with _deseja_ in the same
  sentence. New strings use _Tem certeza…?_.
- **Spelling is post-1990-agreement, European-style**: _atual/ação/ativo_ in 102 keys against 3
  with pre-reform _actual/acção_; _receção_ 6 vs _recepção/recebimento_ 2.
- **Vocabulary is a mix of European and Brazilian usage**, as in Lusophone African
  deployments. The catalog's majority word wins per term:
  - European: _ficheiro_ 22 vs _arquivo_ 4; _descarregar_ 10 vs _baixar_ 0; _artigo_ 112 vs
    _item/itens_ 81; _equipa_ 7 vs _equipe_ 0.
  - Brazilian: _estoque_ 170 vs _stock_ 9; _salvar_ 62 vs _guardar_ 6; _busca_ 24 vs
    _pesquisa_ 3; _usuário_ 10 vs _utilizador_ 6; _excluir_ 140 vs _eliminar/apagar/remover_ 44.
  - Split: _registro_ 24 vs _registo_ 21 (see the glossary and open questions).
- **Buttons use the infinitive**: 124 `button.` keys start with an infinitive (_Adicionar_,
  _Descarregar_, _Exportar para Excel_, _Limpar resultados_); one uses an imperative
  (`button.select-a-color` _Selecione uma cor_); 50 are nouns or phrases (_Detalhes_,
  _Novo programa_).
- **Plurals**: `pt` has `one`, `many` and `other`. `many` only applies to compact millions, so
  in 65 of the 94 `_many` keys it is identical to `_other`; write it the same.
- **No space before `:`**, as in English (_Linhas por página:_).

## Abbreviations

The catalog barely abbreviates. Words such as _Máximo_ / _Mínimo_ (`label.max`, `label.min`)
are written in full even in column headers. The only shortenings it uses:

- _n.º_ for número, in sentences (5 keys, e.g. _remessa n.º {{invoiceNumber}}_);
- _aprox._ (1 key, `label.requested-number-packs`);
- acronyms kept as-is: _ID_ (24), _CMM_ for AMC (13 keys, though 9 still say _AMC_), _MOS_ (6),
  _VVM_ (11), _VEN_ (3).

Don't introduce new abbreviations (_Qtd._, _Cód._, _Ref._): none appear in the catalog.

## Glossary

| English                     | Portuguese                          | Evidence (keys)                                                                                                                  |
| --------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| import (verb / noun)        | importar / importação               | 21 of 34 "import" strings; 14 use _carregar / fazer o carregamento_ (`button.import`, `button.upload-assets`)                    |
| export                      | exportar / exportação               | 6 of 7                                                                                                                           |
| upload                      | carregar                            | 27 of 30; `button.choose-file` uses _enviar_                                                                                     |
| download                    | descarregar                         | 9 of 11; no _baixar_                                                                                                             |
| file                        | ficheiro                            | 18 of 22 "file" strings; _arquivo_ 3 (`button.choose-file`, `error.duplicated-field`, `label.filename`)                          |
| row                         | linha                               | 16 of 16                                                                                                                         |
| column                      | coluna                              | 9 of 9                                                                                                                           |
| sheet (worksheet)           | folha                               | 2 of 2 (`report.stocktake-sheet` _Folha de inventário_)                                                                          |
| spreadsheet / template file | planilha                            | 3 (`heading.download-example` _planilha de exemplo_); no _folha de cálculo_                                                      |
| table                       | tabela                              | 5 of 5                                                                                                                           |
| record                      | registro                            | 12 of the "record" strings vs _registo_ 7; 18 render "record" another way (e.g. _prescrição_)                                    |
| unit                        | unidade                             | 45 of 52                                                                                                                         |
| item                        | artigo                              | 112 keys vs _item/itens_ 81 (105 vs 77 counting only keys that use one form); `label.item` itself is _Item_                      |
| location                    | local                               | 36 of 46 (_localização_ 24, mostly geolocation and "all locations")                                                              |
| location type               | tipo de armazenamento frio          | `label.location-type`, `label.location-types` (2); see open questions                                                            |
| user                        | usuário                             | 7 of 12 "user" strings vs _utilizador_ 5                                                                                         |
| preview                     | pré-visualização                    | 1 (`label.colour-preview`)                                                                                                       |
| change (noun)               | mudança                             | 7 of 12 "changes" strings vs _alteração_ 4; for the participle "changed", _alterado_ (`log.sensor-location-changed`)             |
| new                         | novo / nova                         | 82 of 94                                                                                                                         |
| updated                     | atualizado                          | 19 of 21                                                                                                                         |
| deleted / delete            | excluído / excluir                  | 95 of 113 "delete(d)" strings (140 keys overall vs _eliminar/apagar/remover_ 44); `label.encounter-status-deleted` is _Removido_ |
| unchanged                   | inalterado (not yet in the catalog) | 0                                                                                                                                |
| error                       | erro                                | 43 of 44                                                                                                                         |
| problem                     | problema                            | 4 of 6                                                                                                                           |
| filter                      | filtro                              | 13 of 14                                                                                                                         |
| search                      | busca                               | 20 of 23 "search" strings vs _pesquisa_ 3                                                                                        |
| status                      | estado                              | 52 keys vs _status_ 23; `label.status` is _Estado_; VVM strings keep _status_                                                    |
| total                       | total                               | 42 of 44                                                                                                                         |
| "Unable to …"               | Não foi possível …                  | 46 of 51                                                                                                                         |
| "… contains" (search label) | … contém                            | `label.code-or-name-contains` _Código ou nome contém_                                                                            |
| common medicines | medicamentos frequentes | settled 2026-11-26 (Simple screen common medicines editor) |

## Open questions

- **_registro_ vs _registo_** (24 vs 21 keys overall): the same feature uses both:
  `label.records-to-push_other` _registros_ and `label.no-records-to-push` _registos_.
- **_usuário_ vs _utilizador_** (10 vs 6): `label.users` _Usuários_; `heading.user-guide`,
  `sync-info.updating-user` use _utilizador_.
- **_artigo_ vs _item_** (112 vs 81): `label.item` and `label.item-name` say _Item_, most
  sentences say _artigo_.
- **_ficheiro_ vs _arquivo_** (22 vs 4): `button.choose-file` _Escolher arquivo para enviar_.
- **_importar_ vs _fazer o carregamento_** for "Import": `label.import` _Importar_ but
  `button.import` and `button.upload-assets` _Fazer o carregamento_, which is also how
  "upload" is rendered.
- **_mudança_ vs _alteração_** (7 vs 4 for "changes"): e.g. `messages.confirm-save-generic`
  _mudanças_, `messages.not-on-hold-description` _alterações_.
- **_estado_ vs _status_** (52 vs 23): `label.status` _Estado_, `label.edit-vvm-status`
  _Editar status VVM_, `heading.synchronise-status`.
- **_Tens certeza_ (tu)** in 19 confirmation prompts against the formal register everywhere
  else, e.g. `messages.confirm-save-generic` _Estás pronto para salvar as mudanças?_,
  `messages.template-download-text` _Não tens certeza de como começar?_.
- **Location type = _Tipo de armazenamento frio_** (`label.location-type(s)`): it names the
  older cold-storage meaning. If location types are now general, _Tipo de local_ fits.
- **_CMM_ vs _AMC_**: `label.amc` _CMM_, but `label.amc-calculation` _Cálculo de AMC_ and 8 more
  keep _AMC_.
- **Tab**: no evidence for a browser/page tab; _aba_ (Brazilian) and _separador_ (European)
  are both unused.

## Likely errors in existing translations

- `label.change` = _Alterar_ (a verb) is the item ledger's column header for a quantity
  change; a noun (_Variação_) is needed.
- `label.records-to-push_one` = _Existem {{count}} registros para serem enviados_ is plural
  in the singular form.
- `label.location-type(s)` — see open questions.
