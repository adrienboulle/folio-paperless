import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { de, en, fr } from '../src/i18n/catalogs.ts';

const [scan, detail] = await Promise.all([
  readFile(new URL('../src/app/scan.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/app/document/[id].tsx', import.meta.url), 'utf8'),
]);

test('leaving a scan under review asks before the pages are discarded', () => {
  assert.match(
    scan,
    /const confirmAbandonScan = useCallback\(\(proceed: \(\) => void\) => \{\s*Alert\.alert\(t\('scan\.abandonTitle'\), t\('scan\.abandonBody'\)/,
  );
  assert.match(scan, /if \(!scanSession \|\| isSaving\) return;\s*const subscription = BackHandler\.addEventListener\('hardwareBackPress'/);
  assert.match(scan, /confirmAbandonScan\(\(\) => router\.back\(\)\);\s*return true;/);
  assert.match(scan, /onPress=\{\(\) => confirmAbandonScan\(\(\) => router\.back\(\)\)\}/);
  for (const catalog of [de, en, fr]) {
    for (const key of ['scan.abandonTitle', 'scan.abandonBody', 'scan.abandonConfirm', 'scan.abandonKeep']) {
      assert.ok(catalog[key].length > 0, key);
    }
  }
  assert.match(fr['scan.abandonTitle'], /Abandonner ce scan/);
});

test('the document menu closes on a tap outside and on the back button', () => {
  assert.match(
    detail,
    /\{moreOpen && \(\s*<Pressable\s*accessibilityLabel=\{t\('detail\.closeMenu'\)\}\s*onPress=\{\(\) => setMoreOpen\(false\)\}/,
  );
  assert.match(detail, /moreBackdrop: \{[\s\S]*?zIndex: 19/);
  assert.match(
    detail,
    /BackHandler\.addEventListener\('hardwareBackPress', \(\) => \{\s*if \(moreOpenRef\.current\) \{\s*setMoreOpen\(false\);\s*return true;/,
  );
  assert.match(detail, /moreOpenRef\.current = moreOpen;/);
  for (const catalog of [de, en, fr]) assert.ok(catalog['detail.closeMenu'].length > 0);
});
