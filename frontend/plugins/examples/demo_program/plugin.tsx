/*
 * The custom-forms demo program (kdd/custom-forms/implementation-plan.md
 * § The demo program): a form plugin whose document types, schema versions
 * and event rules live under `forms/`, declared in `forms/forms.json`.
 *
 * The module declares its identity and the display names of what it
 * installs, and no contributions, which is enough for the loader to accept it
 * and the dev loop to serve it from source.
 *
 * TO-DO: contribute the forms, the patient field group and the follow-up
 * trigger (plan item P2) once their host slots exist (H9, H10, H10b).
 *
 * The identity is read from `./package.json`, the manifest the pack step and
 * the server's install gate read, so the module and its bundle cannot
 * disagree.
 */
import { PLUGIN_API_VERSION, definePlugin } from '@openmsupply/plugin-sdk';
import { name, version } from './package.json';

export default definePlugin({
  manifest: {
    code: name,
    version,
    pluginApiVersion: PLUGIN_API_VERSION,
  },
  // The display names of the program and its document types, keyed as
  // `forms/forms.json` names them.
  translations: {
    en: {
      'program.demo': 'Demo Program',
      'documentType.Patient': 'Patient',
      'documentType.DemoProgramEnrolment': 'Demo Program',
      'documentType.DemoEncounter': 'Demo follow-up',
    },
  },
});
