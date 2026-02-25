import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  ScrollView,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RouteProp} from '@react-navigation/native';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {appPreferences} from '../../prefs/appPreferences';
import {
  getInboundShipment,
  updateInboundShipmentStatus,
  updateInboundLineQty,
  InboundShipmentDetail,
  InboundShipmentLine,
  InboundStatus,
  UpdateInboundStatus,
} from '../../api/receive';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ReceiveDetail'>;
  route: RouteProp<RootStackParamList, 'ReceiveDetail'>;
};

const STATUS_SEQUENCE: InboundStatus[] = [
  'SHIPPED',
  'DELIVERED',
  'RECEIVED',
  'VERIFIED',
];

const NEXT_STATUS: Partial<Record<InboundStatus, UpdateInboundStatus>> = {
  SHIPPED: 'DELIVERED',
  DELIVERED: 'RECEIVED',
  RECEIVED: 'VERIFIED',
};

const NEXT_STATUS_LABEL: Partial<Record<InboundStatus, string>> = {
  SHIPPED: 'Mark as Delivered',
  DELIVERED: 'Mark as Received',
  RECEIVED: 'Mark as Verified',
};

export default function ReceiveDetailScreen({navigation, route}: Props) {
  const {shipmentId} = route.params;
  const [shipment, setShipment] = useState<InboundShipmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [storeId, setStoreId] = useState('');

  // Local copy of line quantities for editing
  const [lineQtys, setLineQtys] = useState<Record<string, string>>({});

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const sid = await appPreferences.getStoreId();
    if (!sid) return;
    setStoreId(sid);
    await load(sid);
  }

  async function load(sid: string) {
    setLoading(true);
    try {
      const data = await getInboundShipment(sid, shipmentId);
      setShipment(data);
      if (data) {
        const qtys: Record<string, string> = {};
        data.lines.nodes.forEach(l => {
          qtys[l.id] = String(l.numberOfPacks);
        });
        setLineQtys(qtys);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange() {
    if (!shipment) return;
    const next = NEXT_STATUS[shipment.status];
    if (!next) return;

    const label = NEXT_STATUS_LABEL[shipment.status];
    Alert.alert(
      label ?? 'Update Status',
      `Change this shipment to ${next}?`,
      [
        {
          text: 'Confirm',
          onPress: async () => {
            setUpdatingStatus(true);
            try {
              const newStatus = await updateInboundShipmentStatus(
                storeId,
                shipmentId,
                next,
              );
              setShipment(prev =>
                prev ? {...prev, status: newStatus} : prev,
              );
            } catch (err: any) {
              Alert.alert('Error', err?.message ?? 'Failed to update status');
            } finally {
              setUpdatingStatus(false);
            }
          },
        },
        {text: 'Cancel', style: 'cancel'},
      ],
    );
  }

  async function handleLineQtyBlur(lineId: string) {
    if (shipment?.status !== 'DELIVERED') return;
    const raw = lineQtys[lineId];
    const qty = parseFloat(raw);
    if (isNaN(qty) || qty < 0) return;
    const originalLine = shipment.lines.nodes.find(l => l.id === lineId);
    if (!originalLine || originalLine.numberOfPacks === qty) return;
    try {
      await updateInboundLineQty(storeId, lineId, qty);
      setShipment(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          lines: {
            nodes: prev.lines.nodes.map(l =>
              l.id === lineId ? {...l, numberOfPacks: qty} : l,
            ),
          },
        };
      });
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to update quantity');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.centred}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!shipment) {
    return (
      <View style={styles.centred}>
        <Text style={styles.errorText}>Shipment not found</Text>
      </View>
    );
  }

  const canEditQtys = shipment.status === 'DELIVERED';
  const nextStatusLabel = NEXT_STATUS_LABEL[shipment.status];
  const statusStep = STATUS_SEQUENCE.indexOf(shipment.status);

  return (
    <View style={styles.container}>
      {/* Header info */}
      <View style={styles.header}>
        <Text style={styles.supplier}>{shipment.otherPartyName}</Text>
        <Text style={styles.invoiceNo}>Shipment #{shipment.invoiceNumber}</Text>
        {shipment.theirReference ? (
          <Text style={styles.reference}>Ref: {shipment.theirReference}</Text>
        ) : null}

        {/* Status progress bar */}
        <View style={styles.statusRow}>
          {STATUS_SEQUENCE.map((s, i) => (
            <View
              key={s}
              style={[
                styles.statusStep,
                i <= statusStep ? styles.statusStepActive : styles.statusStepInactive,
              ]}>
              <Text style={styles.statusStepText}>{s}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Lines */}
      <View style={styles.linesHeader}>
        <Text style={styles.linesHeaderText}>Item</Text>
        <Text style={styles.linesHeaderQty}>Shipped</Text>
        <Text style={styles.linesHeaderQty}>Received</Text>
      </View>
      <FlatList
        data={shipment.lines.nodes}
        keyExtractor={item => item.id}
        renderItem={({item}) => (
          <View style={styles.lineRow}>
            <Text style={styles.lineName} numberOfLines={2}>
              {item.itemName}
            </Text>
            <Text style={styles.lineQtyReadonly}>
              {item.shippedNumberOfPacks}
            </Text>
            {canEditQtys ? (
              <TextInput
                style={styles.lineQtyInput}
                value={lineQtys[item.id] ?? String(item.numberOfPacks)}
                onChangeText={v => setLineQtys(prev => ({...prev, [item.id]: v}))}
                onBlur={() => handleLineQtyBlur(item.id)}
                keyboardType="numeric"
                selectTextOnFocus
              />
            ) : (
              <Text style={styles.lineQtyReadonly}>{item.numberOfPacks}</Text>
            )}
          </View>
        )}
        style={styles.linesList}
      />

      {/* Status action button */}
      {nextStatusLabel && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={[
              styles.statusBtn,
              updatingStatus && styles.btnDisabled,
            ]}
            onPress={handleStatusChange}
            disabled={updatingStatus}>
            {updatingStatus ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.statusBtnText}>{nextStatusLabel}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {shipment.status === 'VERIFIED' && (
        <View style={styles.verifiedBanner}>
          <Text style={styles.verifiedText}>✓ This shipment has been fully received</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f5f5f5'},
  centred: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  errorText: {color: '#FF3B30'},

  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  supplier: {fontSize: 18, fontWeight: '700', color: '#000'},
  invoiceNo: {fontSize: 14, color: '#555', marginTop: 2},
  reference: {fontSize: 13, color: '#888', marginTop: 1},

  statusRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 4,
  },
  statusStep: {
    flex: 1,
    paddingVertical: 5,
    alignItems: 'center',
    borderRadius: 4,
  },
  statusStepActive: {backgroundColor: '#007AFF'},
  statusStepInactive: {backgroundColor: '#ddd'},
  statusStepText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },

  linesHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#e8e8e8',
  },
  linesHeaderText: {flex: 1, fontSize: 12, fontWeight: '600', color: '#555', textTransform: 'uppercase'},
  linesHeaderQty: {width: 70, textAlign: 'center', fontSize: 12, fontWeight: '600', color: '#555', textTransform: 'uppercase'},

  linesList: {flex: 1},
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  lineName: {flex: 1, fontSize: 14, color: '#000', marginRight: 8},
  lineQtyReadonly: {width: 70, textAlign: 'center', fontSize: 15, color: '#333'},
  lineQtyInput: {
    width: 70,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 6,
    padding: 6,
    textAlign: 'center',
    fontSize: 15,
    color: '#000',
  },

  actionBar: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  statusBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  btnDisabled: {opacity: 0.6},
  statusBtnText: {color: '#fff', fontSize: 16, fontWeight: '700'},

  verifiedBanner: {
    backgroundColor: '#34C759',
    padding: 16,
    alignItems: 'center',
  },
  verifiedText: {color: '#fff', fontSize: 15, fontWeight: '600'},
});
