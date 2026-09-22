import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { de, en, fr } from '../src/i18n/catalogs.ts';

const [intake, home, shell] = await Promise.all([
  readFile(new URL('../src/app/intake.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/app/index.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/app-shell.tsx', import.meta.url), 'utf8'),
]);

test('the send button sits in a fixed footer instead of the end of the form', () => {
  assert.match(
    intake,
    /<\/ScrollView>\s*<SafeAreaView edges=\{\['bottom'\]\} style=\{styles\.submitBar\}>[\s\S]*?t\('intake\.queueOne'\)[\s\S]*?<\/SafeAreaView>/,
  );
  assert.match(intake, /submitBar: \{[^}]*borderTopWidth: 1/);
  // The preset card no longer stands between the last field and the button.
  const scrollEnd = intake.lastIndexOf('</ScrollView>');
  assert.ok(intake.indexOf("t('intake.unsetCopy')") < scrollEnd);
});

test('sending says "send" in every language', () => {
  assert.equal(en['intake.queueOne'], 'Send');
  assert.equal(fr['intake.queueOne'], 'Envoyer');
  assert.equal(de['intake.queueOne'], 'Senden');
  assert.match(en['intake.queueMany'], /^Send \{\{count\}\} documents$/);
  assert.match(fr['intake.queueMany'], /^Envoyer \{\{count\}\} documents$/);
  for (const catalog of [de, en, fr]) {
    assert.doesNotMatch(catalog['intake.queueOne'], /queue|einreihen|file d/i);
    assert.doesNotMatch(catalog['intake.autoSubmitConfirmTitle'], /queue|einreihen|file d/i);
  }
});

test('an accepted upload lands on home with a confirmation, not on the task centre', () => {
  assert.doesNotMatch(intake, /router\.replace\('\/tasks'\)/);
  assert.match(intake, /router\.replace\(\{ pathname: '\/', params: \{ sent: String\(count\) \} \}\)/);
  assert.equal((intake.match(/leaveAfterSend\(/g) ?? []).length, 3);
  assert.match(home, /const sentCount = Number\(route\.params\.sent\)/);
  assert.match(home, /showToast\(sentCount === 1\s*\? t\('home\.uploadSent'\)\s*: t\('home\.uploadSentMany'/);
  assert.match(home, /overlay=\{<SheetToast toast=\{toast\} \/>\}/);
  assert.match(shell, /\{overlay\}\s*<\/View>/);
  assert.equal(fr['home.uploadSent'], 'Envoyé · Paperless analyse le document');
  for (const catalog of [de, en, fr]) assert.match(catalog['home.uploadSentMany'], /\{\{count\}\}/);
});
