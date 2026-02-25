import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCodeScanner,
} from 'react-native-vision-camera';
import Zeroconf from 'react-native-zeroconf';
import {appPreferences} from '../prefs/appPreferences';
import {lookupNameByCode} from '../api/issue';
import {apolloClient} from '../api/apolloClient';
import {gql} from '@apollo/client';

interface DiscoveredServer {
  name: string;
  host: string;
  port: number;
}

const PING_QUERY = gql`
  query ping {
    isCentralServer
  }
`;

export default function SettingsScreen() {
  // Server URL state
  const [savedUrl, setSavedUrl] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');

  // QR scanner state
  const [showQr, setShowQr] = useState(false);
  const device = useCameraDevice('back');
  const qrHandled = useRef(false);

  // mDNS discovery state
  const [discovered, setDiscovered] = useState<DiscoveredServer[]>([]);
  const [scanning, setScanning] = useState(false);

  // Name code state
  const [nameCode, setNameCode] = useState('');
  const [nameStatus, setNameStatus] = useState<'idle' | 'checking' | 'found' | 'notfound'>('idle');
  const [resolvedName, setResolvedName] = useState('');

  useEffect(() => {
    loadSaved();
  }, []);

  async function loadSaved() {
    const url = await appPreferences.getServerUrl();
    if (url) setSavedUrl(url);
    const code = await appPreferences.getNameCode();
    if (code) setNameCode(code);
  }

  // ── QR Code scanner ──────────────────────────────────────────────────────

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: codes => {
      if (qrHandled.current || codes.length === 0) return;
      const value = codes[0].value;
      if (!value) return;
      qrHandled.current = true;
      setShowQr(false);
      handleUrlFromQr(value);
    },
  });

  function handleUrlFromQr(raw: string) {
    try {
      const url = new URL(raw);
      saveServerUrl(raw);
    } catch {
      Alert.alert('Invalid QR', `The QR code does not contain a valid URL:\n${raw}`);
    }
  }

  // ── Manual entry ──────────────────────────────────────────────────────────

  function buildUrl(h: string, p: string) {
    return `https://${h.trim()}:${p.trim()}`;
  }

  function handleSaveManual() {
    if (!host.trim() || !port.trim()) {
      Alert.alert('Missing fields', 'Please enter both a host and a port.');
      return;
    }
    saveServerUrl(buildUrl(host, port));
  }

  async function saveServerUrl(url: string) {
    await appPreferences.setServerUrl(url);
    setSavedUrl(url);
    setTestStatus('idle');
    Alert.alert('Saved', `Server URL set to:\n${url}`);
  }

  // ── Test connection ───────────────────────────────────────────────────────

  async function testConnection() {
    const url = await appPreferences.getServerUrl();
    if (!url) {
      Alert.alert('No URL', 'Save a server URL first.');
      return;
    }
    setTestStatus('testing');
    try {
      await apolloClient.query({query: PING_QUERY, fetchPolicy: 'network-only'});
      setTestStatus('ok');
    } catch {
      setTestStatus('fail');
    }
  }

  // ── mDNS discovery ────────────────────────────────────────────────────────

  function startDiscovery() {
    setDiscovered([]);
    setScanning(true);
    const zc = new Zeroconf();
    zc.scan('http', 'tcp', 'local.');
    zc.on('resolved', (service: any) => {
      setDiscovered(prev => {
        const already = prev.some(s => s.name === service.name);
        if (already) return prev;
        return [...prev, {name: service.name, host: service.host, port: service.port}];
      });
    });
    // Stop after 8 seconds
    setTimeout(() => {
      zc.stop();
      setScanning(false);
    }, 8000);
  }

  function selectDiscovered(server: DiscoveredServer) {
    const url = `https://${server.host}:${server.port}`;
    saveServerUrl(url);
  }

  // ── Name code ─────────────────────────────────────────────────────────────

  async function saveNameCode() {
    const trimmed = nameCode.trim();
    if (!trimmed) {
      Alert.alert('Empty', 'Please enter a name code.');
      return;
    }
    await appPreferences.setNameCode(trimmed);
    const storeId = await appPreferences.getStoreId();
    if (!storeId) {
      Alert.alert('Not logged in', 'Log in first so the name code can be verified.');
      return;
    }
    setNameStatus('checking');
    const found = await lookupNameByCode(storeId, trimmed).catch(() => null);
    if (found) {
      await appPreferences.setNameId(found.id);
      setResolvedName(found.name);
      setNameStatus('found');
    } else {
      await appPreferences.setNameId(null);
      setNameStatus('notfound');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  if (showQr) {
    if (!device) {
      return (
        <View style={styles.centred}>
          <Text>No camera available</Text>
          <TouchableOpacity onPress={() => setShowQr(false)}>
            <Text style={styles.link}>Go back</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={{flex: 1}}>
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive
          codeScanner={codeScanner}
        />
        <View style={styles.qrOverlay}>
          <Text style={styles.qrHint}>Scan the server QR code</Text>
          <TouchableOpacity
            style={styles.qrCancel}
            onPress={() => {
              qrHandled.current = false;
              setShowQr(false);
            }}>
            <Text style={styles.qrCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* ── Server URL section ── */}
      <SectionHeader title="Server Connection" />

      {savedUrl ? (
        <View style={styles.savedUrlRow}>
          <Text style={styles.savedUrlLabel}>Current:</Text>
          <Text style={styles.savedUrlValue} numberOfLines={1}>{savedUrl}</Text>
        </View>
      ) : null}

      <TouchableOpacity style={styles.qrButton} onPress={() => { qrHandled.current = false; setShowQr(true); }}>
        <Text style={styles.qrButtonText}>📷  Scan QR Code</Text>
      </TouchableOpacity>

      <View style={styles.divider}><Text style={styles.dividerText}>or discover automatically</Text></View>

      <TouchableOpacity style={styles.discoverButton} onPress={startDiscovery} disabled={scanning}>
        {scanning
          ? <ActivityIndicator color="#007AFF" />
          : <Text style={styles.discoverButtonText}>🔍  Find Servers on Network</Text>
        }
      </TouchableOpacity>

      {discovered.length > 0 && (
        <View style={styles.discoveredList}>
          {discovered.map(s => (
            <TouchableOpacity
              key={s.name}
              style={styles.discoveredItem}
              onPress={() => selectDiscovered(s)}>
              <Text style={styles.discoveredName}>{s.name}</Text>
              <Text style={styles.discoveredAddr}>{s.host}:{s.port}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.divider}><Text style={styles.dividerText}>or enter manually</Text></View>

      <TextInput
        style={styles.input}
        placeholder="Host (e.g. 192.168.1.5)"
        placeholderTextColor="#999"
        value={host}
        onChangeText={setHost}
        autoCapitalize="none"
        keyboardType="url"
      />
      <TextInput
        style={styles.input}
        placeholder="Port (e.g. 8000)"
        placeholderTextColor="#999"
        value={port}
        onChangeText={setPort}
        keyboardType="number-pad"
      />
      <TouchableOpacity style={styles.primaryButton} onPress={handleSaveManual}>
        <Text style={styles.primaryButtonText}>Save</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.testButton, testStatus === 'ok' && styles.testOk, testStatus === 'fail' && styles.testFail]}
        onPress={testConnection}
        disabled={testStatus === 'testing'}>
        {testStatus === 'testing'
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.testButtonText}>
              {testStatus === 'ok' ? '✓ Connected' : testStatus === 'fail' ? '✗ Failed' : 'Test Connection'}
            </Text>
        }
      </TouchableOpacity>

      {/* ── Name code section ── */}
      <SectionHeader title="Issue Settings" />
      <Text style={styles.label}>Patient name code for outbound shipments</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. PATIENT01"
        placeholderTextColor="#999"
        value={nameCode}
        onChangeText={t => { setNameCode(t); setNameStatus('idle'); }}
        autoCapitalize="characters"
        autoCorrect={false}
      />
      <TouchableOpacity style={styles.primaryButton} onPress={saveNameCode}>
        <Text style={styles.primaryButtonText}>Save Name Code</Text>
      </TouchableOpacity>

      {nameStatus === 'checking' && <ActivityIndicator style={{marginTop: 8}} />}
      {nameStatus === 'found' && (
        <Text style={styles.nameFound}>✓ Found: {resolvedName}</Text>
      )}
      {nameStatus === 'notfound' && (
        <Text style={styles.nameNotFound}>✗ No name found for code "{nameCode}"</Text>
      )}

      <View style={{height: 40}} />
    </ScrollView>
  );
}

function SectionHeader({title}: {title: string}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f5f5f5'},
  centred: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  link: {color: '#007AFF', marginTop: 16, fontSize: 16},

  sectionHeader: {
    backgroundColor: '#e8e8e8',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 20,
    marginBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  savedUrlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  savedUrlLabel: {fontWeight: '600', marginRight: 8, color: '#555'},
  savedUrlValue: {flex: 1, color: '#007AFF', fontSize: 13},

  qrButton: {
    margin: 16,
    padding: 14,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    alignItems: 'center',
  },
  qrButtonText: {color: '#fff', fontSize: 16, fontWeight: '600'},

  divider: {
    alignItems: 'center',
    marginVertical: 4,
  },
  dividerText: {color: '#999', fontSize: 13},

  discoverButton: {
    margin: 16,
    padding: 14,
    backgroundColor: '#34C759',
    borderRadius: 10,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  discoverButtonText: {color: '#fff', fontSize: 16, fontWeight: '600'},

  discoveredList: {
    marginHorizontal: 16,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  discoveredItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  discoveredName: {fontWeight: '600', fontSize: 15},
  discoveredAddr: {color: '#666', fontSize: 13},

  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginHorizontal: 16,
    marginBottom: 10,
    color: '#000',
  },
  label: {
    fontSize: 14,
    color: '#555',
    marginHorizontal: 16,
    marginBottom: 6,
  },

  primaryButton: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {color: '#fff', fontSize: 16, fontWeight: '600'},

  testButton: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    backgroundColor: '#555',
    borderRadius: 10,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  testOk: {backgroundColor: '#34C759'},
  testFail: {backgroundColor: '#FF3B30'},
  testButtonText: {color: '#fff', fontSize: 16, fontWeight: '600'},

  nameFound: {
    color: '#34C759',
    fontWeight: '600',
    marginHorizontal: 16,
    marginTop: 4,
  },
  nameNotFound: {
    color: '#FF3B30',
    marginHorizontal: 16,
    marginTop: 4,
  },

  // QR overlay
  qrOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    alignItems: 'center',
  },
  qrHint: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
  },
  qrCancel: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  qrCancelText: {color: '#fff', fontSize: 16, fontWeight: '600'},
});
