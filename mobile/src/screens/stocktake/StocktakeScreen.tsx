import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useFocusEffect} from '@react-navigation/native';
import {v4 as uuidv4} from 'uuid';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {appPreferences} from '../../prefs/appPreferences';
import {
  findInProgressStocktake,
  createStocktake,
  loadStocktakeLines,
  saveItemCount,
  finaliseStocktake,
  groupLinesByItem,
  StocktakeRow,
  StocktakeItem,
  StocktakeLine,
} from '../../api/stocktake';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Stocktake'>;
};

export default function StocktakeScreen({navigation}: Props) {
  const [storeId, setStoreId] = useState('');
  const [stocktake, setStocktake] = useState<StocktakeRow | null>(null);
  const [items, setItems] = useState<StocktakeItem[]>([]);
  const [rawLines, setRawLines] = useState<StocktakeLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [finalising, setFinalising] = useState(false);

  // Search
  const [search, setSearch] = useState('');

  // Count modal
  const [countModal, setCountModal] = useState<{item: StocktakeItem} | null>(null);
  const [countInput, setCountInput] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      init();
    }, []),
  );

  async function init() {
    const sid = await appPreferences.getStoreId();
    if (!sid) return;
    setStoreId(sid);
    setLoading(true);
    try {
      const existing = await findInProgressStocktake(sid);
      if (existing) {
        await loadStocktake(sid, existing);
      } else {
        setStocktake(null);
        setItems([]);
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadStocktake(sid: string, row: StocktakeRow) {
    setStocktake(row);
    const data = await loadStocktakeLines(sid, row.id);
    setRawLines(data.lines);
    setItems(groupLinesByItem(data.lines));
  }

  async function handleCreate() {
    setCreating(true);
    try {
      const row = await createStocktake(storeId, uuidv4());
      await loadStocktake(storeId, row);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to create stocktake');
    } finally {
      setCreating(false);
    }
  }

  async function handleFinalise() {
    const countedCount = items.filter(i => i.countedTotal !== null).length;
    if (countedCount === 0) return;

    Alert.alert(
      'Finalise Stocktake',
      `This will adjust stock for ${countedCount} counted item(s). Uncounted items will not be adjusted. Continue?`,
      [
        {
          text: 'Finalise',
          style: 'destructive',
          onPress: async () => {
            setFinalising(true);
            try {
              await finaliseStocktake(storeId, stocktake!.id);
              setStocktake(null);
              setItems([]);
              setRawLines([]);
              Alert.alert('Done', 'Stocktake finalised and stock adjusted.');
              navigation.goBack();
            } catch (err: any) {
              Alert.alert('Error', err?.message ?? 'Failed to finalise');
            } finally {
              setFinalising(false);
            }
          },
        },
        {text: 'Cancel', style: 'cancel'},
      ],
    );
  }

  // ── Count modal ───────────────────────────────────────────────────────────

  function openCountModal(item: StocktakeItem) {
    setCountInput(item.countedTotal !== null ? String(item.countedTotal) : '');
    setCountModal({item});
  }

  async function submitCount() {
    if (!countModal) return;
    const total = parseFloat(countInput);
    if (isNaN(total) || total < 0) {
      Alert.alert('Invalid', 'Please enter a valid quantity.');
      return;
    }
    setSaving(true);
    try {
      const {item} = countModal;
      const linesToUpdate = rawLines.filter(l => l.itemId === item.itemId);
      await saveItemCount(storeId, linesToUpdate, total);
      // Update local state
      setItems(prev =>
        prev.map(i =>
          i.itemId === item.itemId ? {...i, countedTotal: total} : i,
        ),
      );
      setCountModal(null);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to save count');
    } finally {
      setSaving(false);
    }
  }

  // ── Filtered items ────────────────────────────────────────────────────────

  const filtered = search.trim()
    ? items.filter(i =>
        i.itemName.toLowerCase().includes(search.toLowerCase()),
      )
    : items;

  // Uncounted first
  const sorted = [
    ...filtered.filter(i => i.countedTotal === null),
    ...filtered.filter(i => i.countedTotal !== null),
  ];

  const countedCount = items.filter(i => i.countedTotal !== null).length;

  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.centred}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  if (!stocktake) {
    return (
      <View style={styles.centred}>
        <Text style={styles.noStocktakeTitle}>No active stocktake</Text>
        <Text style={styles.noStocktakeBody}>
          Starting a new stocktake will load all items in this store for
          counting.
        </Text>
        <TouchableOpacity
          style={[styles.createBtn, creating && styles.btnDisabled]}
          onPress={handleCreate}
          disabled={creating}>
          {creating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createBtnText}>Start New Stocktake</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search items…"
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Progress summary */}
      <View style={styles.progress}>
        <Text style={styles.progressText}>
          {countedCount} / {items.length} items counted
        </Text>
      </View>

      {/* Item list */}
      <FlatList
        data={sorted}
        keyExtractor={item => item.itemId}
        renderItem={({item}) => {
          const counted = item.countedTotal !== null;
          return (
            <TouchableOpacity
              style={[styles.itemRow, counted && styles.itemRowCounted]}
              onPress={() => openCountModal(item)}>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, counted && styles.itemNameCounted]}>
                  {item.itemName}
                </Text>
                <Text style={styles.itemSnapshot}>
                  Current stock: {item.snapshotTotal}
                </Text>
              </View>
              <View style={styles.itemCount}>
                {counted ? (
                  <Text style={styles.countedValue}>{item.countedTotal}</Text>
                ) : (
                  <Text style={styles.uncountedPlaceholder}>Tap to count</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {search ? 'No items match your search' : 'No items in stocktake'}
          </Text>
        }
      />

      {/* Finalise button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.finaliseBtn,
            (countedCount === 0 || finalising) && styles.btnDisabled,
          ]}
          onPress={handleFinalise}
          disabled={countedCount === 0 || finalising}>
          {finalising ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.finaliseBtnText}>
              Finalise Stocktake ({countedCount} items)
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Count entry modal */}
      <Modal
        visible={!!countModal}
        transparent
        animationType="slide"
        onRequestClose={() => setCountModal(null)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{countModal?.item.itemName}</Text>
            <Text style={styles.modalSubtitle}>
              Current stock: {countModal?.item.snapshotTotal ?? 0}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter counted quantity"
              placeholderTextColor="#999"
              value={countInput}
              onChangeText={setCountInput}
              keyboardType="numeric"
              autoFocus
              selectTextOnFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setCountModal(null)}
                disabled={saving}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, saving && styles.btnDisabled]}
                onPress={submitCount}
                disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f5f5f5'},
  centred: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {color: '#666', marginTop: 12},

  noStocktakeTitle: {fontSize: 20, fontWeight: '700', marginBottom: 12, color: '#000'},
  noStocktakeBody: {
    textAlign: 'center',
    color: '#666',
    lineHeight: 22,
    marginBottom: 32,
  },
  createBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 16,
    minWidth: 200,
    alignItems: 'center',
  },
  createBtnText: {color: '#fff', fontSize: 16, fontWeight: '700'},

  searchBar: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  searchInput: {
    fontSize: 16,
    color: '#000',
    padding: 0,
  },

  progress: {
    backgroundColor: '#e8e8e8',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  progressText: {fontSize: 13, color: '#555'},

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemRowCounted: {opacity: 0.6},
  itemInfo: {flex: 1},
  itemName: {fontSize: 15, fontWeight: '600', color: '#000'},
  itemNameCounted: {color: '#555'},
  itemSnapshot: {fontSize: 12, color: '#888', marginTop: 2},
  itemCount: {marginLeft: 12, alignItems: 'flex-end'},
  countedValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#34C759',
    minWidth: 48,
    textAlign: 'right',
  },
  uncountedPlaceholder: {
    fontSize: 12,
    color: '#aaa',
    fontStyle: 'italic',
  },
  emptyText: {textAlign: 'center', color: '#aaa', marginTop: 40, fontSize: 15},

  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  finaliseBtn: {
    backgroundColor: '#FF9500',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  finaliseBtnText: {color: '#fff', fontSize: 16, fontWeight: '700'},
  btnDisabled: {opacity: 0.4},

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalTitle: {fontSize: 18, fontWeight: '700', color: '#000', marginBottom: 4},
  modalSubtitle: {fontSize: 14, color: '#666', marginBottom: 20},
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    color: '#000',
    marginBottom: 20,
  },
  modalActions: {flexDirection: 'row', gap: 12},
  modalCancel: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  modalCancelText: {fontSize: 16, color: '#555'},
  modalConfirm: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  modalConfirmText: {color: '#fff', fontSize: 16, fontWeight: '700'},
});
