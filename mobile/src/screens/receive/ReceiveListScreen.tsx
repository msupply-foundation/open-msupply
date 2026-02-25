import React, {useCallback, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useFocusEffect} from '@react-navigation/native';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {appPreferences} from '../../prefs/appPreferences';
import {listInboundShipments, InboundShipmentRow} from '../../api/receive';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ReceiveList'>;
};

const STATUS_LABELS: Record<string, string> = {
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  RECEIVED: 'Received',
  VERIFIED: 'Verified',
};

const STATUS_COLORS: Record<string, string> = {
  SHIPPED: '#FF9500',
  DELIVERED: '#007AFF',
  RECEIVED: '#34C759',
  VERIFIED: '#8E8E93',
};

export default function ReceiveListScreen({navigation}: Props) {
  const [shipments, setShipments] = useState<InboundShipmentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      load();
    }, []),
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const storeId = await appPreferences.getStoreId();
      if (!storeId) {
        setError('Not logged in');
        return;
      }
      const data = await listInboundShipments(storeId);
      setShipments(data);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load shipments');
    } finally {
      setLoading(false);
    }
  }

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleDateString();
    } catch {
      return iso;
    }
  }

  if (loading && shipments.length === 0) {
    return (
      <View style={styles.centred}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading shipments…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centred}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={shipments}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} />
        }
        renderItem={({item}) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() =>
              navigation.navigate('ReceiveDetail', {shipmentId: item.id})
            }>
            <View style={styles.rowMain}>
              <Text style={styles.supplierName}>{item.otherPartyName}</Text>
              <Text style={styles.invoiceNo}>Shipment #{item.invoiceNumber}</Text>
              {item.theirReference ? (
                <Text style={styles.reference}>Ref: {item.theirReference}</Text>
              ) : null}
              <Text style={styles.date}>{formatDate(item.createdDatetime)}</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                {backgroundColor: STATUS_COLORS[item.status] ?? '#999'},
              ]}>
              <Text style={styles.statusText}>
                {STATUS_LABELS[item.status] ?? item.status}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.centred}>
            <Text style={styles.emptyText}>No shipments waiting to be received</Text>
          </View>
        }
      />
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
  errorText: {color: '#FF3B30', textAlign: 'center', marginBottom: 16},
  emptyText: {color: '#aaa', textAlign: 'center'},
  retryBtn: {backgroundColor: '#007AFF', borderRadius: 10, padding: 14},
  retryBtnText: {color: '#fff', fontWeight: '600'},

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  rowMain: {flex: 1},
  supplierName: {fontSize: 16, fontWeight: '600', color: '#000'},
  invoiceNo: {fontSize: 13, color: '#555', marginTop: 2},
  reference: {fontSize: 13, color: '#888', marginTop: 1},
  date: {fontSize: 12, color: '#aaa', marginTop: 2},

  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginLeft: 12,
  },
  statusText: {color: '#fff', fontSize: 12, fontWeight: '600'},
});
