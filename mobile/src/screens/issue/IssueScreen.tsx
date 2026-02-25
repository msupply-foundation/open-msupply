import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from 'react-native-vision-camera';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RouteProp, useFocusEffect} from '@react-navigation/native';
import {v4 as uuidv4} from 'uuid';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {appPreferences} from '../../prefs/appPreferences';
import {
  lookupBarcode,
  getItemById,
  createOutboundShipment,
  insertOutboundLine,
  updateOutboundLine,
} from '../../api/issue';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Issue'>;
  route: RouteProp<RootStackParamList, 'Issue'>;
};

interface LineItem {
  lineId: string;
  itemId: string;
  itemName: string;
  quantity: number;
}

export default function IssueScreen({navigation, route}: Props) {
  const {hasPermission, requestPermission} = useCameraPermission();
  const device = useCameraDevice('back');

  const [cameraActive, setCameraActive] = useState(true);
  const [lines, setLines] = useState<LineItem[]>([]);
  const [processing, setProcessing] = useState(false);

  const storeId = useRef('');
  const nameId = useRef('');
  const shipmentId = useRef(uuidv4());
  const shipmentCreated = useRef(false);

  useEffect(() => {
    requestPermission();
    loadPrefs();
  }, []);

  async function loadPrefs() {
    const sid = await appPreferences.getStoreId();
    const nid = await appPreferences.getNameId();
    if (sid) storeId.current = sid;
    if (nid) nameId.current = nid;
  }

  // When returning from ItemSearch, the navigator passes the newly-added item
  // back via route params so the list stays in sync without a server round-trip.
  useFocusEffect(
    useCallback(() => {
      setCameraActive(true);
      const addedItem = route.params?.addedItem;
      if (addedItem) {
        setLines(prev => {
          const exists = prev.some(l => l.lineId === addedItem.lineId);
          if (exists) return prev;
          return [{...addedItem, quantity: 1}, ...prev];
        });
        navigation.setParams({addedItem: undefined});
      }
    }, [route.params?.addedItem]),
  );

  // ── Barcode scanning ─────────────────────────────────────────────────────

  const lastScanned = useRef('');
  const scanCooldown = useRef(false);

  const codeScanner = useCodeScanner({
    codeTypes: ['ean-13', 'ean-8', 'code-128', 'code-39', 'qr', 'upc-a', 'upc-e'],
    onCodeScanned: async codes => {
      if (scanCooldown.current || processing || !codes.length) return;
      const value = codes[0].value;
      if (!value || value === lastScanned.current) return;
      lastScanned.current = value;
      scanCooldown.current = true;
      setTimeout(() => {
        scanCooldown.current = false;
        lastScanned.current = '';
      }, 2000);
      await handleScan(value);
    },
  });

  async function handleScan(gtin: string) {
    if (!storeId.current) {
      Alert.alert('Not ready', 'Please log in first.');
      return;
    }
    setProcessing(true);
    setCameraActive(false);
    try {
      const barcode = await lookupBarcode(storeId.current, gtin);
      if (!barcode) {
        // Fall back to item search, preserving shipment context
        navigation.navigate('ItemSearch', {
          invoiceId: shipmentId.current,
          shipmentCreated: shipmentCreated.current,
        });
        return;
      }
      // Fetch human-readable item name before adding to list
      const item = await getItemById(storeId.current, barcode.itemId);
      await addItemToShipment(barcode.itemId, item?.name ?? barcode.itemId);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'An error occurred');
    } finally {
      setProcessing(false);
      setCameraActive(true);
    }
  }

  async function addItemToShipment(itemId: string, itemName: string) {
    // Ensure the shipment exists before adding the first line
    if (!shipmentCreated.current) {
      await createOutboundShipment(
        storeId.current,
        shipmentId.current,
        nameId.current,
      );
      shipmentCreated.current = true;
    }

    const existing = lines.find(l => l.itemId === itemId);
    if (existing) {
      const newQty = existing.quantity + 1;
      await updateOutboundLine(storeId.current, existing.lineId, newQty);
      setLines(prev =>
        prev.map(l =>
          l.lineId === existing.lineId ? {...l, quantity: newQty} : l,
        ),
      );
    } else {
      const lineId = uuidv4();
      await insertOutboundLine(
        storeId.current,
        lineId,
        shipmentId.current,
        itemId,
        1,
      );
      setLines(prev => [{lineId, itemId, itemName, quantity: 1}, ...prev]);
    }
  }

  // ── Quantity editing ─────────────────────────────────────────────────────

  async function handleQtyChange(lineId: string, rawValue: string) {
    const qty = parseInt(rawValue, 10);
    if (isNaN(qty) || qty < 1) return;
    setLines(prev =>
      prev.map(l => (l.lineId === lineId ? {...l, quantity: qty} : l)),
    );
    try {
      await updateOutboundLine(storeId.current, lineId, qty);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to update quantity');
    }
  }

  // ── Finish ───────────────────────────────────────────────────────────────

  function handleFinished() {
    shipmentId.current = uuidv4();
    shipmentCreated.current = false;
    setLines([]);
    setCameraActive(true);
    lastScanned.current = '';
  }

  // ─────────────────────────────────────────────────────────────────────────

  if (!hasPermission) {
    return (
      <View style={styles.centred}>
        <Text style={styles.centredText}>
          Camera permission is required to scan barcodes
        </Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.centred}>
        <Text style={styles.centredText}>No back camera found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera viewfinder */}
      <View style={styles.cameraContainer}>
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={cameraActive}
          codeScanner={codeScanner}
        />
        {processing && (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.processingText}>Looking up item…</Text>
          </View>
        )}
        {!processing && (
          <View style={styles.scanHint}>
            <Text style={styles.scanHintText}>Point camera at barcode</Text>
          </View>
        )}
      </View>

      {/* Item list */}
      <View style={styles.listContainer}>
        {lines.length === 0 ? (
          <View style={styles.emptyList}>
            <Text style={styles.emptyText}>No items scanned yet</Text>
          </View>
        ) : (
          <FlatList
            data={lines}
            keyExtractor={item => item.lineId}
            renderItem={({item}) => (
              <View style={styles.lineRow}>
                <Text style={styles.lineName} numberOfLines={2}>
                  {item.itemName}
                </Text>
                <TextInput
                  style={styles.qtyInput}
                  value={String(item.quantity)}
                  onChangeText={v => handleQtyChange(item.lineId, v)}
                  keyboardType="number-pad"
                  selectTextOnFocus
                />
              </View>
            )}
          />
        )}
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.addBtn]}
          onPress={() => setCameraActive(true)}>
          <Text style={styles.actionBtnText}>Add Another Item</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionBtn,
            styles.finishBtn,
            lines.length === 0 && styles.btnDisabled,
          ]}
          onPress={handleFinished}
          disabled={lines.length === 0}>
          <Text style={styles.actionBtnText}>Finished</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#000'},
  centred: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 32,
  },
  centredText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 16,
    textAlign: 'center',
  },

  cameraContainer: {
    height: '42%',
    position: 'relative',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {color: '#fff', marginTop: 12, fontSize: 14},
  scanHint: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  scanHintText: {
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    fontSize: 13,
  },

  listContainer: {flex: 1, backgroundColor: '#f5f5f5'},
  emptyList: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  emptyText: {color: '#aaa', fontSize: 15},

  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  lineName: {flex: 1, fontSize: 15, color: '#000', marginRight: 12},
  qtyInput: {
    width: 60,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    textAlign: 'center',
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fff',
  },

  actions: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    padding: 12,
    gap: 10,
  },
  actionBtn: {flex: 1, padding: 14, borderRadius: 10, alignItems: 'center'},
  addBtn: {backgroundColor: '#555'},
  finishBtn: {backgroundColor: '#007AFF'},
  btnDisabled: {opacity: 0.4},
  actionBtnText: {color: '#fff', fontSize: 16, fontWeight: '600'},

  btn: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  btnText: {color: '#fff', fontSize: 16, fontWeight: '600'},
});
