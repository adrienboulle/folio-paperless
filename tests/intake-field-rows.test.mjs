import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { de, en, fr } from '../src/i18n/catalogs.ts';

const intakeSource = await readFile(new URL('../src/app/intake.tsx', import.meta.url), 'utf8');
const choiceSheetSource = await readFile(
  new URL('../src/components/choice-sheet.tsx', import.meta.url),
  'utf8',
);

test('upload review picks catalogue values through the searchable sheet, not chip rails', () => {
  assert.doesNotMatch(intakeSource, /function OptionPicker/);
  assert.doesNotMatch(intakeSource, /function QuickCreateOption/);
  for (const field of ['correspondent', 'documentType', 'storagePath', 'owner', 'workflow', 'tags']) {
    assert.match(
      intakeSource,
      new RegExp(`onPress=\\{\\(\\) => setPicker\\('${field}'\\)\\}`),
      `no row opens the ${field} sheet`,
    );
    assert.match(
      intakeSource,
      new RegExp(`picker === '${field}' && <ChoiceSheet`),
      `no sheet is mounted for ${field}`,
    );
  }
});

test('the sheets keep the same catalogue data, prefill and creation rules as the chips did', () => {
  assert.match(intakeSource, /options=\{catalog\.correspondents\}/);
  assert.match(intakeSource, /options=\{catalog\.documentTypes\}/);
  assert.match(intakeSource, /options=\{catalog\.storagePaths\}/);
  assert.match(intakeSource, /options=\{catalog\.owners\}/);
  assert.match(intakeSource, /options=\{catalog\.workflows \?\? \[\]\}/);
  assert.match(intakeSource, /options=\{catalog\.tags\}/);
  assert.match(
    intakeSource,
    /selectedIds=\{draft\.correspondent\.state === 'value' \? \[draft\.correspondent\.value\.id\] : \[\]\}/,
  );
  assert.match(intakeSource, /selectedIds=\{selectedTags\.map\(\(tag\) => tag\.id\)\}/);
  assert.match(
    intakeSource,
    /canQuickCreate\.correspondent[\s\S]*createCatalogOption\('correspondent'/,
  );
  assert.match(
    intakeSource,
    /canQuickCreate\.documentType[\s\S]*createCatalogOption\('documentType'/,
  );
  assert.match(intakeSource, /canQuickCreate\.tag && uploadAllowed[\s\S]*createCatalogOption\('tag'/);
  // Owner assignment stays gated by the server capability it always was.
  assert.match(intakeSource, /disabled=\{!ownerAssignmentAllowed\}\s*\n\s*label=\{t\('intake\.owner'\)\}/);
});

test('"let Paperless decide" survives as the unset choice in every locale', () => {
  assert.match(intakeSource, /noneLabel=\{t\('intake\.paperlessDecide'\)\}/);
  assert.match(intakeSource, /noneSubtitle=\{t\('intake\.paperlessDecideSubtitle'\)\}/);
  // Clearing every tag means "unset", like the chip that used to say so.
  assert.match(
    intakeSource,
    /replaceField\(draft, 'tags', selected\.length[\s\S]*: \{ state: 'unset' \}\)\)/,
  );
  assert.match(choiceSheetSource, /\{noneLabel \?\? t\('choice\.none'\)\}/);
  assert.match(choiceSheetSource, /\{noneSubtitle \?\? t\('choice\.noneSubtitle'\)\}/);
  for (const catalog of [en, de, fr]) {
    assert.equal(typeof catalog['intake.paperlessDecideSubtitle'], 'string');
    assert.ok(catalog['intake.paperlessDecideSubtitle'].length > 0);
  }
  assert.equal(
    fr['intake.paperlessDecideSubtitle'],
    'Paperless applique ses propres règles de correspondance.',
  );
});
