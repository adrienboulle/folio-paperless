import assert from 'node:assert/strict';
import test from 'node:test';

import { movePdfMergeSelection, togglePdfMergeSelection } from '../src/lib/document-production.ts';
import { catalogs, en } from '../src/i18n/catalogs.ts';

const locales = Object.entries(catalogs);

function everyLocale(key) {
  return locales.map(([locale, catalog]) => [locale, catalog[key]]);
}

test('the "…" menu offers a direct entry to the page tools in every language', () => {
  for (const key of ['detail.editPages', 'detail.editPagesCopy']) {
    assert.ok(key in en, `${key} is missing from the English catalog`);
    for (const [locale, value] of everyLocale(key)) {
      assert.equal(typeof value, 'string', `${key} is missing from ${locale}`);
      assert.ok(value.trim().length > 0, `${key} is empty in ${locale}`);
    }
  }
  assert.equal(catalogs.fr['detail.editPages'], 'Modifier les pages');
});

test('the PDF tools no longer describe the API to the person holding the phone', () => {
  // Wording the owner called out: it says how the server works, not what the
  // gesture does. Each fragment is checked in the language that carried it.
  const banned = {
    en: ['API v10', 'endpoint', 'page plan', 'profile-scoped', 'private page previews'],
    de: ['API-v10', 'Endpunkt', 'Seitenplan', 'profilbezogen', 'Private Seitenvorschauen'],
    fr: ['API v10', 'point de terminaison', 'plan de pages', 'propre au profil', 'aperçus de pages privés'],
  };
  const keys = [
    'paperless3.pdfOperations',
    'paperless3.pdfOperationsCopy',
    'paperless3.pageEditorPreparing',
    'paperless3.pageEditorApply',
    'paperless3.pageEditorReset',
    'paperless3.pageEditorSecureCache',
    'paperless3.pageEditorSplitAfter',
    'runtimeError.pdfSourcePage',
    'runtimeError.pdfDuplicatePage',
  ];
  for (const [locale, catalog] of locales) {
    for (const key of keys) {
      const value = catalog[key];
      assert.equal(typeof value, 'string', `${key} is missing from ${locale}`);
      for (const fragment of banned[locale]) {
        assert.ok(
          !value.toLocaleLowerCase().includes(fragment.toLocaleLowerCase()),
          `${key} still says "${fragment}" in ${locale}: ${value}`,
        );
      }
    }
  }
  assert.equal(catalogs.fr['paperless3.pageEditorApply'], 'Appliquer les modifications');
  assert.equal(catalogs.fr['paperless3.pageEditorSplitAfter'], 'Séparer après cette page');
});

test('the merge sheet keeps the current document in, and lets its place move', () => {
  const current = 7;
  // The document you started from carries the metadata of the merged result, so it
  // stays in the list whatever you tap.
  assert.deepEqual(togglePdfMergeSelection([current], current, current), [current]);
  assert.deepEqual(togglePdfMergeSelection([current], 12, current), [current, 12]);
  assert.deepEqual(togglePdfMergeSelection([current, 12], 12, current), [current]);
  // Order is the order of the taps, and every entry can be moved, the current one included.
  assert.deepEqual(movePdfMergeSelection([current, 12, 30], current, 1), [12, current, 30]);
  assert.deepEqual(movePdfMergeSelection([12, current, 30], current, -1), [current, 12, 30]);
  assert.deepEqual(movePdfMergeSelection([current, 12], current, -1), [current, 12]);
  assert.deepEqual(movePdfMergeSelection([current, 12], 12, 1), [current, 12]);
  assert.deepEqual(movePdfMergeSelection([current, 12], 99, 1), [current, 12]);
});

test('the merge sheet speaks of documents and order in every language', () => {
  for (const key of [
    'paperless3.mergeOpen',
    'paperless3.mergeClose',
    'paperless3.mergeOrderSummary',
    'paperless3.mergeNeedsSecond',
    'paperless3.mergeMoveEarlier',
    'paperless3.mergeMoveLater',
  ]) {
    assert.ok(key in en, `${key} is missing from the English catalog`);
    for (const [locale, value] of everyLocale(key)) {
      assert.equal(typeof value, 'string', `${key} is missing from ${locale}`);
      assert.ok(value.trim().length > 0, `${key} is empty in ${locale}`);
    }
  }
  assert.equal(catalogs.fr['paperless3.mergeOpen'], 'Fusionner avec d\u2019autres documents');
  assert.equal(catalogs.fr['paperless3.mergeOrderSummary'], '{{count}} documents, dans cet ordre');
});
