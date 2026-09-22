import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { de, en, fr } from '../src/i18n/catalogs.ts';

const [library, settings, filterSheet] = await Promise.all([
  readFile(new URL('../src/app/documents.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/app/settings.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/library-filter-sheet.tsx', import.meta.url), 'utf8'),
]);

test('the library header no longer carries the management screens', () => {
  assert.doesNotMatch(library, /router\.push\('\/saved-views'\)/);
  assert.doesNotMatch(library, /router\.push\('\/paperless-metadata'\)/);
  // The saved-view actions stay, but only when there is something to save.
  assert.match(
    library,
    /connected && !selectionActive && \(narrowed \|\| sortOrder !== 'added-desc' \|\| \(!!activeSavedView && presetRefined\)\)/,
  );
  assert.match(library, /t\('library\.saveView'\)/);
});

test('Settings gathers the four Paperless management screens in one group', () => {
  const group = settings.match(
    /\{t\('settings\.paperlessSection'\)\}[\s\S]*?\{t\('settings\.appearanceSection'\)\}/,
  )?.[0] ?? '';
  assert.match(group, /router\.push\('\/paperless-metadata'\)/);
  assert.match(group, /router\.push\('\/saved-views'\)/);
  assert.match(group, /router\.push\('\/trash'\)/);
  assert.match(group, /router\.push\('\/tasks'\)/);
  // Each screen is listed exactly once in the whole settings screen.
  for (const route of ['/paperless-metadata', '/saved-views', '/trash', '/tasks']) {
    assert.equal(
      (settings.match(new RegExp(`router\\.push\\('${route}'\\)`, 'g')) ?? []).length,
      1,
      `${route} is listed more than once`,
    );
  }
  for (const catalog of [en, de, fr]) {
    assert.equal(typeof catalog['settings.paperlessSection'], 'string');
    assert.equal(typeof catalog['settings.metadataSubtitle'], 'string');
    assert.equal(typeof catalog['settings.savedViewsSubtitle'], 'string');
  }
});

test('type and folder chips open the filter sheet on their own facet', () => {
  assert.match(library, /onPress=\{\(\) => openFilterFacet\('documentTypes'\)\}/);
  assert.match(library, /onPress=\{\(\) => openFilterFacet\('tags'\)\}/);
  assert.match(library, /initialFacet=\{filterFacet \?\? undefined\}/);
  assert.match(filterSheet, /setFacet\(initialFacet \?\? null\)/);
  assert.match(filterSheet, /initialFacet === 'tags'[\s\S]*selectedTagAncestorIds/);
  // The PDF chip leaves the row; the file-type filter stays under Advanced.
  assert.doesNotMatch(library, /toggleQuickFilter\('pdf'\)/);
  assert.match(filterSheet, /mimeTypes/);
  assert.equal(fr['library.tagChip'], 'Étiquettes');
  assert.equal(de['library.typeChip'], 'Typ');
  assert.equal(en['library.typeChip'], 'Type');
});
