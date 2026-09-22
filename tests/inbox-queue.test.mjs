import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { de, en, fr } from '../src/i18n/catalogs.ts';

const inbox = await readFile(new URL('../src/app/inbox.tsx', import.meta.url), 'utf8');

test('the inbox shows the whole queue under the document being triaged', () => {
  const upNext = inbox.match(/\{inboxDocuments\.length > 1 && \([\s\S]*?\n          \)\}/)?.[0] ?? '';
  assert.match(upNext, /inboxDocuments\.slice\(1\)\.map\(\(document\) =>/);
  // Title, correspondent and date on every row, not just on the second document.
  assert.match(upNext, /\{document\.title\}/);
  assert.match(upNext, /\{document\.correspondent\} · \{formatDocumentDate\(document\.created\)\}/);
  assert.doesNotMatch(upNext, /inboxDocuments\[1\]/);
  assert.match(upNext, /key=\{document\.id\}/);
});

test('every queued row opens its own document from the inbox', () => {
  const upNext = inbox.match(/\{inboxDocuments\.length > 1 && \([\s\S]*?\n          \)\}/)?.[0] ?? '';
  assert.match(upNext, /params: \{ id: document\.id, from: 'inbox' \}/);
  assert.match(upNext, /router\.preload\(\{/);
  assert.match(upNext, /isPendingDocument\(document\)/);
});

test('the queue label counts what is left, in every locale', () => {
  assert.match(inbox, /t\('inbox\.upNextCount', \{ count: formatNumber\(inboxDocuments\.length - 1\) \}\)/);
  for (const catalog of [en, de, fr]) {
    assert.match(catalog['inbox.upNextCount'], /\{\{count\}\}/);
  }
  assert.equal(fr['inbox.upNextCount'], 'À SUIVRE · {{count}}');
});
