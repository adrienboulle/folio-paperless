import { StatusBar } from 'expo-status-bar';
import { Check, ChevronDown, ChevronUp, FileStack, Search, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MotionPressable as Pressable, useReducedMotion } from '@/components/motion';
import { SecureDocumentThumbnail } from '@/components/secure-document-thumbnail';
import { createThemedStyleSheet, fonts, palette, radii } from '@/constants/theme';
import { useI18n } from '@/i18n';
import { movePdfMergeSelection, togglePdfMergeSelection } from '@/lib/document-production';
import { isChangeAuthorizedPdfMergeDocument, rankPdfMergeCandidates } from '@/lib/paperless-advanced';
import type { DocumentItem, PaperlessCredentials } from '@/types/document';

type DocumentPdfMergeSheetProps = {
  busy: boolean;
  credentials: PaperlessCredentials;
  currentDocument: DocumentItem;
  documents: readonly DocumentItem[];
  enabled: boolean;
  onClose: () => void;
  onMerge: (documentIds: number[]) => void;
  visible: boolean;
};

export function DocumentPdfMergeSheet({
  busy,
  credentials,
  currentDocument,
  documents,
  enabled,
  onClose,
  onMerge,
  visible,
}: DocumentPdfMergeSheetProps) {
  const { colorScheme, formatDate, formatNumber, t } = useI18n();
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const currentId = currentDocument.remoteId!;
  const [selectedIds, setSelectedIds] = useState<number[]>([currentId]);
  const [query, setQuery] = useState('');
  const authorized = useMemo(() => {
    const byId = new Map<number, DocumentItem>();
    for (const document of documents) {
      if (isChangeAuthorizedPdfMergeDocument(document)) byId.set(document.remoteId!, document);
    }
    if (isChangeAuthorizedPdfMergeDocument(currentDocument)) byId.set(currentId, currentDocument);
    return byId;
  }, [currentDocument, currentId, documents]);
  const ranked = useMemo(
    () => rankPdfMergeCandidates(currentDocument, [...authorized.values()], query),
    [authorized, currentDocument, query],
  );
  // The current document opens the list, and anything already picked stays visible even when
  // the search no longer matches it, so the chosen order can always be reviewed and undone.
  const candidates = useMemo(() => {
    const ordered = new Map<number, DocumentItem>();
    const current = authorized.get(currentId);
    if (current) ordered.set(currentId, current);
    for (const id of selectedIds) {
      const document = authorized.get(id);
      if (document) ordered.set(id, document);
    }
    for (const document of ranked) ordered.set(document.remoteId!, document);
    return [...ordered.values()];
  }, [authorized, currentId, ranked, selectedIds]);
  const selected = selectedIds.flatMap((id) => {
    const document = authorized.get(id);
    return document ? [document] : [];
  });
  const candidateIds = useMemo(() => new Set(authorized.keys()), [authorized]);
  const canSubmitMerge = enabled
    && !busy
    && selectedIds.length >= 2
    && selectedIds.every((documentId) => candidateIds.has(documentId));

  function toggleDocument(documentId: number) {
    if (!candidateIds.has(documentId)) return;
    setSelectedIds((current) => togglePdfMergeSelection(current, documentId, currentId));
  }

  function moveDocument(documentId: number, direction: -1 | 1) {
    setSelectedIds((current) => movePdfMergeSelection(current, documentId, direction));
  }

  function submitMerge() {
    if (!canSubmitMerge) return;
    onMerge([...selectedIds]);
  }

  function documentMeta(item: DocumentItem) {
    if (item.remoteId === currentId) return t('paperless3.pageEditorCurrentDocument');
    return [item.correspondent, item.created ? formatDate(item.created, { year: 'numeric', month: 'short' }) : '']
      .filter(Boolean)
      .join(' · ')
      || t('paperless3.pageEditorDocumentId', { id: item.remoteId! });
  }

  return (
    <Modal
      animationType={reducedMotion ? 'none' : 'slide'}
      onRequestClose={onClose}
      presentationStyle="fullScreen"
      visible={visible}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <View style={styles.root}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <View style={styles.flexCopy}>
            <Text style={styles.headerTitle}>{t('paperless3.mergeDocuments')}</Text>
            <Text numberOfLines={1} style={styles.headerSubtitle}>{currentDocument.title}</Text>
          </View>
          <Pressable accessibilityLabel={t('paperless3.mergeClose')} onPress={onClose} style={styles.closeButton}>
            <X color={palette.ink} size={20} />
          </Pressable>
        </View>

        {/* The sheet has its own window on Android, which the app's soft-input mode does not
            resize: without this, the search field disappears under the keyboard. */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardFrame}>
          <FlatList
            contentContainerStyle={styles.list}
            data={candidates}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            keyExtractor={(item) => String(item.remoteId)}
            ListEmptyComponent={
              <Text style={styles.empty}>
                {query ? t('paperless3.pageEditorMergeNoMatches') : t('paperless3.pageEditorMergeNoCandidates')}
              </Text>
            }
            ListHeaderComponent={
              <View style={styles.listHeader}>
                <Text style={styles.hint}>{t('paperless3.pageEditorMergeSelectHint')}</Text>
                <View style={styles.search}>
                  <Search color={palette.muted} size={18} />
                  <TextInput
                    accessibilityLabel={t('paperless3.pageEditorMergeSearchLabel')}
                    autoCapitalize="none"
                    autoCorrect={false}
                    onChangeText={setQuery}
                    placeholder={t('paperless3.pageEditorMergeSearchPlaceholder')}
                    placeholderTextColor={palette.faint}
                    returnKeyType="search"
                    style={styles.searchInput}
                    value={query}
                  />
                  {!!query && (
                    <Pressable accessibilityLabel={t('choice.clearSearch')} haptic="light" onPress={() => setQuery('')} style={styles.clearSearch}>
                      <X color={palette.muted} size={16} />
                    </Pressable>
                  )}
                </View>
              </View>
            }
            renderItem={({ item }) => {
              const documentId = item.remoteId!;
              const order = selectedIds.indexOf(documentId);
              const checked = order >= 0;
              return (
                <Pressable
                  accessibilityLabel={`${item.title}. ${documentMeta(item)}`}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked, disabled: documentId === currentId }}
                  onPress={() => toggleDocument(documentId)}
                  style={[styles.row, checked && styles.rowSelected]}>
                  <View style={[styles.rowMark, checked && styles.rowMarkSelected]}>
                    {checked ? <Text style={styles.rowMarkText}>{formatNumber(order + 1)}</Text> : null}
                  </View>
                  <SecureDocumentThumbnail
                    credentials={credentials}
                    documentId={documentId}
                    fallback={
                      <View accessibilityLabel={item.title}>
                        <FileStack color={palette.muted} size={20} />
                      </View>
                    }
                    pendingFallback={<ActivityIndicator color={palette.limeDark} size="small" />}
                    style={styles.thumbnail}
                    title={item.title}
                  />
                  <View style={styles.flexCopy}>
                    <Text numberOfLines={2} style={styles.rowTitle}>{item.title}</Text>
                    <Text numberOfLines={1} style={styles.rowMeta}>{documentMeta(item)}</Text>
                  </View>
                  {checked && <Check color={palette.limeDark} size={18} />}
                </Pressable>
              );
            }}
          />

          <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
            <Text accessibilityLiveRegion="polite" style={styles.summary}>
              {selected.length >= 2
                ? t('paperless3.mergeOrderSummary', { count: formatNumber(selected.length) })
                : t('paperless3.mergeNeedsSecond')}
            </Text>
            <ScrollView contentContainerStyle={styles.orderListContent} nestedScrollEnabled style={styles.orderList}>
              {selected.map((item, index) => {
                const documentId = item.remoteId!;
                return (
                  <View key={documentId} style={styles.orderRow}>
                    <Text style={styles.orderIndex}>{formatNumber(index + 1)}</Text>
                    <Text numberOfLines={1} style={styles.orderTitle}>{item.title}</Text>
                    <Pressable
                      accessibilityLabel={t('paperless3.mergeMoveEarlier', { title: item.title })}
                      disabled={index === 0}
                      onPress={() => moveDocument(documentId, -1)}
                      style={[styles.orderButton, index === 0 && styles.disabled]}>
                      <ChevronUp color={palette.ink} size={16} />
                    </Pressable>
                    <Pressable
                      accessibilityLabel={t('paperless3.mergeMoveLater', { title: item.title })}
                      disabled={index === selected.length - 1}
                      onPress={() => moveDocument(documentId, 1)}
                      style={[styles.orderButton, index === selected.length - 1 && styles.disabled]}>
                      <ChevronDown color={palette.ink} size={16} />
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>
            <Pressable
              accessibilityRole="button"
              disabled={!canSubmitMerge}
              onPress={submitMerge}
              style={[styles.mergeButton, !canSubmitMerge && styles.disabled]}>
              {busy ? (
                <ActivityIndicator color={palette.accentInk} size="small" />
              ) : (
                <FileStack color={palette.accentInk} size={17} />
              )}
              <Text style={styles.mergeButtonText}>{t('paperless3.createMerged')}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = createThemedStyleSheet({
  root: { flex: 1, backgroundColor: palette.canvas },
  keyboardFrame: { flex: 1 },
  header: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: palette.line,
  },
  flexCopy: { flex: 1, minWidth: 0 },
  headerTitle: { color: palette.ink, fontFamily: fonts.serif, fontSize: 23, fontWeight: '600' },
  headerSubtitle: { color: palette.muted, fontFamily: fonts.sans, fontSize: 11, marginTop: 3 },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: palette.paper,
  },
  list: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20, paddingTop: 16, gap: 10 },
  listHeader: { gap: 12, marginBottom: 4 },
  hint: { color: palette.muted, fontFamily: fonts.sans, fontSize: 11, lineHeight: 17 },
  search: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 14,
    paddingRight: 7,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: radii.md,
    backgroundColor: palette.paper,
  },
  searchInput: { flex: 1, minHeight: 38, color: palette.ink, fontFamily: fonts.sans, fontSize: 15 },
  clearSearch: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
  empty: { color: palette.muted, fontFamily: fonts.sans, fontSize: 12, lineHeight: 18, marginTop: 8 },
  row: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: palette.line,
    backgroundColor: palette.paper,
  },
  rowSelected: { borderColor: palette.limeDark },
  rowMark: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.canvas,
  },
  rowMarkSelected: { borderColor: palette.lime, backgroundColor: palette.lime },
  rowMarkText: { color: palette.accentInk, fontFamily: fonts.sans, fontSize: 11, fontWeight: '900' },
  thumbnail: { width: 52, height: 68, borderRadius: radii.sm, backgroundColor: palette.viewerSurface },
  rowTitle: { color: palette.ink, fontFamily: fonts.sans, fontSize: 13, fontWeight: '900', lineHeight: 18 },
  rowMeta: { color: palette.muted, fontFamily: fonts.sans, fontSize: 11, marginTop: 3 },
  footer: {
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.canvas,
  },
  summary: { color: palette.inkSoft, fontFamily: fonts.sans, fontSize: 12, fontWeight: '800' },
  orderList: { maxHeight: 148 },
  orderListContent: { gap: 6 },
  orderRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10 },
  orderIndex: {
    minWidth: 20,
    color: palette.muted,
    fontFamily: fonts.sans,
    fontSize: 12,
    fontWeight: '900',
  },
  orderTitle: { flex: 1, color: palette.ink, fontFamily: fonts.sans, fontSize: 12 },
  orderButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    backgroundColor: palette.paper,
  },
  mergeButton: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderRadius: radii.md,
    backgroundColor: palette.lime,
    paddingHorizontal: 18,
  },
  mergeButtonText: { color: palette.accentInk, fontFamily: fonts.sans, fontSize: 12, fontWeight: '900' },
  disabled: { opacity: 0.45 },
});
