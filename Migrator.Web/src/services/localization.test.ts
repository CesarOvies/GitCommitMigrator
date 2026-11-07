import { describe, it, expect } from 'vitest';
import { getTranslation, translations } from './localization';
import { AppLanguage } from '../types';

describe('localization', () => {
  const languages: AppLanguage[] = ['pt-BR', 'en-US', 'es'];

  it('provides translations for all supported languages', () => {
    for (const lang of languages) {
      const t = getTranslation(lang);
      expect(t).toBeDefined();
      expect(t.windowTitle).toBe('Git Commit Migrator');
      expect(t.headerSubtitle).toBeTruthy();
      expect(t.introBannerTitle).toBeTruthy();
      expect(t.introBannerText).toBeTruthy();
      expect(t.clientSideBadge).toBeTruthy();
      expect(t.successBannerDescription).toBeTruthy();
      expect(t.viewCommitsButton).toBeTruthy();
      expect(t.sourceSectionHeader).toBeTruthy();
      expect(t.targetSectionHeader).toBeTruthy();
      expect(t.executionLogTitle).toBeTruthy();
      expect(t.migrateButton).toBeTruthy();
      expect(t.validationSummaryHeader).toBeTruthy();
      expect(t.errPatEmpty).toBeTruthy();
      expect(t.footerLicense).toBeTruthy();
      expect(t.footerSubtitle).toBeTruthy();
    }
  });

  it('ensures no translation key is empty or undefined', () => {
    for (const lang of languages) {
      const langTranslations = translations[lang];
      for (const [key, value] of Object.entries(langTranslations)) {
        expect(value, `Key "${key}" in language "${lang}" is empty or undefined`).toBeTruthy();
      }
    }
  });

  it('has identical keys across all languages', () => {
    const ptKeys = Object.keys(translations['pt-BR']).sort();
    const enKeys = Object.keys(translations['en-US']).sort();
    const esKeys = Object.keys(translations['es']).sort();

    expect(enKeys).toEqual(ptKeys);
    expect(esKeys).toEqual(ptKeys);
  });
});

