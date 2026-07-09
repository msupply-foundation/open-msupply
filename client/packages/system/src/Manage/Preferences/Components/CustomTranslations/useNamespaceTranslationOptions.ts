import { useMemo } from 'react';
import {
  DEFAULT_TRANSLATIONS_NAMESPACE,
  DESKTOP_TRANSLATIONS_NAMESPACE,
  LocaleKey,
  useIntl,
  useTranslation,
} from '@common/intl';
import {
  CustomTranslationsV2,
  DEFAULT_CUSTOM_TRANSLATION_NAMESPACE,
  LEGACY_NAMESPACE,
} from './helpers';
import { TranslationOption } from './TranslationSearchInput';

export const useNamespaceTranslationOptions = (
  namespace: string,
  nested?: CustomTranslationsV2
) => {
  const t = useTranslation();
  const { i18n } = useIntl();

  const getBundle = (
    language: string,
    ns: string
  ): Record<string, string> | undefined =>
    i18n?.store?.data?.[language]?.[ns] as Record<string, string> | undefined;

  const getDefaultForKey = (ns: string, key: string): string => {
    if (ns === DESKTOP_TRANSLATIONS_NAMESPACE) {
      const hierarchy: string[] = i18n.services?.languageUtils
        ? i18n.services.languageUtils.toResolveHierarchy(i18n.language)
        : [i18n.language, 'en'];
      for (const language of hierarchy) {
        const value = getBundle(language, ns)?.[key];
        if (value !== undefined) return value;
      }
      return getBundle('en', ns)?.[key] ?? key;
    }
    if (
      ns === DEFAULT_CUSTOM_TRANSLATION_NAMESPACE ||
      ns === LEGACY_NAMESPACE
    ) {
      return t(key as LocaleKey, { ns: DEFAULT_TRANSLATIONS_NAMESPACE });
    }
    // Label-as-key: the key is the English string
    return key;
  };

  const options: TranslationOption[] = useMemo(() => {
    if (namespace === DESKTOP_TRANSLATIONS_NAMESPACE) {
      const base = getBundle('en', DESKTOP_TRANSLATIONS_NAMESPACE) ?? {};
      return Object.keys(base).map(key => ({
        key,
        default: getDefaultForKey(namespace, key),
      }));
    }
    if (
      namespace === DEFAULT_CUSTOM_TRANSLATION_NAMESPACE ||
      namespace === LEGACY_NAMESPACE
    ) {
      // English common is the base for translations, will always be available
      // and have all keys. Defaults resolve via t() so they show in the
      // user's language.
      const base = getBundle('en', DEFAULT_TRANSLATIONS_NAMESPACE) ?? {};
      return Object.keys(base).map(key => ({
        key,
        default: getDefaultForKey(namespace, key),
      }));
    }
    const keys = new Set<string>();
    Object.values(nested ?? {}).forEach(byNamespace =>
      Object.keys(byNamespace[namespace] ?? {}).forEach(key => keys.add(key))
    );
    return [...keys]
      .sort((a, b) => a.localeCompare(b))
      .map(key => ({ key, default: key }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [namespace, nested, i18n, t]);

  return { options, getDefaultForKey };
};
