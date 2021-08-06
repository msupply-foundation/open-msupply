import { useIntl } from 'react-intl'
import type { PrimitiveType } from 'intl-messageformat'

// "import type" ensures en messages aren't bundled by default
import * as sourceOfTruth from './en.json'

// Note: in order to use "import type" you'll need Babel >= 7.9.0 and/or TypeScript >= 3.8.
// Otherwise, you can use a normal import and accept to always bundle one language + the user required one

export type LocaleMessages = typeof sourceOfTruth
export type LocaleKey = keyof LocaleMessages

export const useFormatMessage = (): (id: LocaleKey, // only accepts valid keys, not any string
    values?: Record<string, PrimitiveType>) => string => {
    const intl = useIntl()
    return (id, values) => intl.formatMessage({ id: (id as string) }, values);
}

export type SupportedLocales = 'en' | 'fr' | 'pt';

// return type on this signature enforces that all languages have the same translations defined
export const importMessages = (
    locale: SupportedLocales
    //): Promise<LocaleMessages> => {
): LocaleMessages => {

    switch (locale) {
        case 'en':
            return sourceOfTruth;
        case 'fr':
            const fr = require('./fr.json');
            return ({ ...sourceOfTruth, ...fr });
        case 'pt':
            return sourceOfTruth;
    }
}