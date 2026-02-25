import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../navigation/AppNavigator';
import {tokenStorage} from '../auth/tokenStorage';
import {appPreferences} from '../prefs/appPreferences';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

type Tile = {
  key: keyof RootStackParamList;
  label: string;
  icon: string;
  color: string;
  disabled?: boolean;
  disabledReason?: string;
};

export default function HomeScreen({navigation}: Props) {
  const [nameId, setNameId] = useState<string | null>(null);

  useEffect(() => {
    const checkPrefs = async () => {
      const id = await appPreferences.getNameId();
      setNameId(id);
    };
    const unsubscribe = navigation.addListener('focus', checkPrefs);
    return unsubscribe;
  }, [navigation]);

  const issueDisabled = !nameId;

  const tiles: Tile[] = [
    {
      key: 'Issue',
      label: 'Issue Stock',
      icon: '📤',
      color: '#007AFF',
      disabled: issueDisabled,
      disabledReason: 'Set a patient name code in Settings first.',
    },
    {
      key: 'ReceiveList',
      label: 'Receive Stock',
      icon: '📥',
      color: '#34C759',
    },
    {
      key: 'Stocktake',
      label: 'Stocktake',
      icon: '📋',
      color: '#FF9500',
    },
  ];

  function handleTile(tile: Tile) {
    if (tile.disabled) {
      Alert.alert('Not ready', tile.disabledReason ?? '');
      return;
    }
    navigation.navigate(tile.key as any);
  }

  async function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await tokenStorage.clearToken();
          await appPreferences.clearAll();
          navigation.replace('Login');
        },
      },
      {text: 'Cancel', style: 'cancel'},
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.tilesGrid}>
        {tiles.map(tile => (
          <TouchableOpacity
            key={tile.key}
            style={[
              styles.tile,
              {backgroundColor: tile.color},
              tile.disabled && styles.tileDisabled,
            ]}
            onPress={() => handleTile(tile)}
            activeOpacity={tile.disabled ? 1 : 0.75}>
            <Text style={styles.tileIcon}>{tile.icon}</Text>
            <Text style={styles.tileLabel}>{tile.label}</Text>
            {tile.disabled && (
              <Text style={styles.tileDisabledText}>Setup required</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.footerBtn}
          onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.footerBtnText}>⚙️  Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerBtn} onPress={handleLogout}>
          <Text style={[styles.footerBtnText, {color: '#FF3B30'}]}>
            Sign Out
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
    justifyContent: 'space-between',
  },
  tilesGrid: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
  },
  tile: {
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 110,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  tileDisabled: {opacity: 0.5},
  tileIcon: {fontSize: 36, marginBottom: 8},
  tileLabel: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  tileDisabledText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  footerBtn: {padding: 8},
  footerBtnText: {fontSize: 16, color: '#007AFF'},
});
