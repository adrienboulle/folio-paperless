import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { de, en, fr } from '../src/i18n/catalogs.ts';

const workspace = await readFile(
  new URL('../src/components/document-paperless3-workspace.tsx', import.meta.url),
  'utf8',
);

test('rotating the document says what it rotates, in every language', () => {
  for (const catalog of [de, en, fr]) {
    assert.match(catalog['paperless3.rotateDocument'], /90/);
    assert.ok(catalog['paperless3.rotateRunning'].length > 0);
    assert.match(catalog['paperless3.rotateSucceeded'], /90/);
  }
  assert.match(en['paperless3.rotateDocument'], /every page/i);
  assert.match(fr['paperless3.rotateDocument'], /toutes les pages/i);
  assert.match(en['paperless3.rotateSucceeded'], /new version/i);
  assert.match(fr['paperless3.rotateSucceeded'], /nouvelle version/i);
});

test('the rotation button reports progress, its own success, and refuses a second tap', () => {
  assert.match(workspace, /label=\{t\('paperless3\.rotateDocument'\)\}\s*loading=\{busy === 'rotate'\}/);
  assert.match(workspace, /disabled=\{!!busy\}/);
  assert.match(workspace, /\{ successMessage: t\('paperless3\.rotateSucceeded'\) \}/);
  assert.match(
    workspace,
    /busy === 'rotate' && \(\s*<Text accessibilityLiveRegion="polite"[^>]*>\{t\('paperless3\.rotateRunning'\)\}/,
  );
  assert.match(workspace, /disabled=\{disabled \|\| loading\}/);
  assert.match(workspace, /\(disabled \|\| loading\) && styles\.pdfDisabled/);
});
