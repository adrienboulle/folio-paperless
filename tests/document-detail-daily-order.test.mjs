import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { de, en, fr } from '../src/i18n/catalogs.ts';

const [detail, documentFiles] = await Promise.all([
  readFile(new URL('../src/app/document/[id].tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/lib/document-files.ts', import.meta.url), 'utf8'),
]);

test('tags are a Details row, next to correspondent, type and date', () => {
  const details = detail.match(/<View style=\{styles\.detailGroup\}>[\s\S]*?<\/View>\s*<\/View>/)?.[0] ?? '';
  assert.match(details, /label=\{t\('detail\.correspondent'\)\}/);
  assert.match(details, /label=\{t\('detail\.documentType'\)\}/);
  assert.match(details, /label=\{t\('detail\.tags'\)\}[\s\S]*onPress=\{\(\) => setPicker\('tags'\)\}/);
  assert.match(details, /t\('detail\.noTags'\)/);
  // The seventh block that used to hold the tags is gone, the editor it opened is not.
  assert.doesNotMatch(detail, /<Text style=\{styles\.sectionTitle\}>\{t\('detail\.tags'\)\}<\/Text>/);
  assert.match(detail, /picker === 'tags' && <ChoiceSheet/);
});

test('manager sections are folded under a single "More details" disclosure', () => {
  assert.match(detail, /const \[moreDetailsOpen, setMoreDetailsOpen\] = useState\(false\)/);
  assert.match(detail, /accessibilityState=\{\{ expanded: moreDetailsOpen \}\}/);
  assert.match(detail, /\{t\('detail\.moreDetails'\)\}/);
  const folded = detail.match(/\{moreDetailsOpen && <>[\s\S]*?<\/>\}/)?.[0] ?? '';
  assert.match(folded, /<DocumentDeepSections/);
  assert.match(folded, /t\('detail\.extractedText'\)/);
  for (const catalog of [en, de, fr]) {
    assert.equal(typeof catalog['detail.moreDetails'], 'string');
    assert.equal(typeof catalog['detail.moreDetailsCopy'], 'string');
  }
  assert.equal(fr['detail.moreDetails'], 'Plus de détails');
});

test('Android trades the duplicate Download button for Tags, and keeps it elsewhere', () => {
  // The premise: "Download" opens the very same share sheet as "Share".
  assert.match(documentFiles, /export async function savePaperlessDocument[\s\S]*?Sharing\.shareAsync/);
  const quickActions = detail.match(/<View style=\{styles\.quickActions\}>[\s\S]*?<\/View>/)?.[0] ?? '';
  assert.match(quickActions, /onPress=\{\(\) => void shareDocument\(\)\}/);
  assert.match(
    quickActions,
    /Platform\.OS === 'android' \? \([\s\S]*label=\{t\('detail\.tags'\)\}[\s\S]*\) : \([\s\S]*label=\{t\('detail\.download'\)\}/,
  );
  assert.match(quickActions, /onPress=\{\(\) => void downloadDocument\(\)\}/);
});
