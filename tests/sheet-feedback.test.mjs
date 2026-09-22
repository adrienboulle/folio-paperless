import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [sheetToast, workspace, fileActions, pageEditor] = await Promise.all([
  readFile(new URL('../src/components/sheet-toast.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/document-paperless3-workspace.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/document-file-actions.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/components/document-pdf-page-editor.tsx', import.meta.url), 'utf8'),
]);

test('the shared sheet toast keeps its own timer and forwards to the screen below', () => {
  assert.match(sheetToast, /export function useSheetToast\(forward\?: \(message: string, error\?: boolean\) => void\)/);
  assert.match(sheetToast, /forwardRef\.current\?\.\(message, error\)/);
  assert.match(sheetToast, /}, error \? 3500 : 2200\)/);
  assert.match(sheetToast, /export function SheetToast\(/);
  assert.match(sheetToast, /accessibilityLiveRegion="polite"/);
  assert.match(sheetToast, /pointerEvents="none"/);
});

test('every modal sheet renders its own toast instead of the one under the modal', () => {
  for (const source of [workspace, fileActions]) {
    assert.match(source, /onToast: reportToast/);
    assert.match(source, /const \{ showToast: onToast, toast \} = useSheetToast\(reportToast\)/);
    assert.match(source, /<SheetToast toast=\{toast\} \/>\s*<\/SafeAreaView>\s*<\/Modal>/);
  }
  assert.match(pageEditor, /const \{ showToast, toast \} = useSheetToast\(\)/);
  assert.match(pageEditor, /<SheetToast toast=\{toast\} \/>\s*<\/View>\s*<\/Modal>/);
});

test('a PDF operation reports its outcome and refreshes the document on success', () => {
  assert.match(workspace, /\): Promise<PdfOperationOutcome> \{/);
  assert.match(workspace, /return \{ ok: false, message: trackingMessage \}/);
  assert.match(workspace, /onToast\(message\);\s*try \{\s*await onRefresh\(\);/);
  assert.match(workspace, /return \{ ok: true, message \}/);
  assert.match(workspace, /onApply=\{\(plan\) => runPdf\(/);
  assert.match(workspace, /onMerge=\{\(documentIds\) => runPdf\('merge'/);
});

test('the page editor closes on an applied plan or a merge and shows failures in place', () => {
  assert.match(pageEditor, /onApply: \(plan: PdfPageEditorApply\) => Promise<PdfOperationOutcome>/);
  assert.match(pageEditor, /onMerge: \(documentIds: number\[\]\) => Promise<PdfOperationOutcome>/);
  assert.match(
    pageEditor,
    /async function run\(operation: \(\) => Promise<PdfOperationOutcome>\) \{\s*const outcome = await operation\(\);\s*if \(outcome\.ok\) \{\s*setOpen\(false\);/,
  );
  assert.match(pageEditor, /if \(outcome\.message\) showToast\(outcome\.message, true\)/);
  assert.match(pageEditor, /const submit = \(\) => void run\(\(\) => onApply\(/);
  assert.match(pageEditor, /onMerge=\{\(documentIds\) => void run\(\(\) => onMerge\(documentIds\)\)\}/);
});
