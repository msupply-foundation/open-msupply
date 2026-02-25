import React, {useCallback, useRef, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RouteProp} from '@react-navigation/native';
import {v4 as uuidv4} from 'uuid';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {appPreferences} from '../../prefs/appPreferences';
import {
  searchItems,
  ItemSearchResult,
  createOutboundShipment,
  insertOutboundLine,
} from '../../api/issue';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ItemSearch'>;
  route: RouteProp<RootStackParamList, 'ItemSearch'>;
};

export default function ItemSearchScreen({navigation, route}: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ItemSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {invoiceId, shipmentCreated: wasCreated} = route.params;
  const shipmentCreated = useRef(wasCreated);

  function onQueryChange(text: string) {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => doSearch(text.trim()), 350);
  }

  async function doSearch(text: string) {
    setLoading(true);
    try {
      const storeId = await appPreferences.getStoreId();
      if (!storeId) return;
      const found = await searchItems(storeId, text);
      setResults(found);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  async function selectItem(item: ItemSearchResult) {
    setAdding(true);
    try {
      const storeId = await appPreferences.getStoreId();
      const nameId = await appPreferences.getNameId();
      if (!storeId || !nameId) {
        Alert.alert('Error', 'Missing store or patient name configuration.');
        return;
      }

      if (!shipmentCreated.current) {
        await createOutboundShipment(storeId, invoiceId, nameId);
        shipmentCreated.current = true;
      }

      const lineId = uuidv4();
      await insertOutboundLine(storeId, lineId, invoiceId, item.id, 1);

      // Navigate back to Issue, passing the newly-added item so the list
      // updates immediately without a server round-trip.
      navigation.navigate('Issue', {
        addedItem: {lineId, itemId: item.id, itemName: item.name},
      });
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to add item');
    } finally {
      setAdding(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Type item name or code…"
          placeholderTextColor="#999"
          value={query}
          onChangeText={onQueryChange}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {loading && <ActivityIndicator style={{marginLeft: 8}} />}
      </View>

      {query.length > 0 && query.length < 2 && (
        <Text style={styles.hint}>Type at least 2 characters to search</Text>
      )}

      <FlatList
        data={results}
        keyExtractor={item => item.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({item}) => (
          <TouchableOpacity
            style={styles.resultRow}
            onPress={() => selectItem(item)}
            disabled={adding}>
            <View style={styles.resultInfo}>
              <Text style={styles.resultName}>{item.name}</Text>
              <Text style={styles.resultCode}>{item.code}</Text>
            </View>
            {adding ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.addIcon}>＋</Text>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading && query.length >= 2 ? (
            <Text style={styles.empty}>No items found for "{query}"</Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f5f5f5'},
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    padding: 0,
  },
  hint: {
    textAlign: 'center',
    color: '#aaa',
    marginTop: 24,
    fontSize: 14,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  resultInfo: {flex: 1},
  resultName: {fontSize: 15, color: '#000'},
  resultCode: {fontSize: 12, color: '#888', marginTop: 2},
  addIcon: {fontSize: 22, color: '#007AFF', fontWeight: '700'},
  empty: {
    textAlign: 'center',
    color: '#aaa',
    marginTop: 40,
    fontSize: 15,
  },
});
