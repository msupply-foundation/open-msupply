import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../navigation/AppNavigator';
import {login, fetchCurrentUser, UserStore} from '../api/auth';
import {tokenStorage} from '../auth/tokenStorage';
import {appPreferences} from '../prefs/appPreferences';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

export default function LoginScreen({navigation}: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter your username and password.');
      return;
    }

    const serverUrl = await appPreferences.getServerUrl();
    if (!serverUrl) {
      Alert.alert(
        'No server configured',
        'Please configure the server URL in Settings before logging in.',
        [
          {text: 'Go to Settings', onPress: () => navigation.navigate('Settings')},
          {text: 'Cancel'},
        ],
      );
      return;
    }

    setLoading(true);
    try {
      const result = await login(username.trim(), password);

      if (result.__typename === 'AuthTokenError') {
        const {error} = result;
        let message = error.description;
        if (error.__typename === 'AccountBlocked' && error.timeoutRemaining) {
          message = `Account locked. Try again in ${Math.ceil(error.timeoutRemaining / 60)} minute(s).`;
        }
        Alert.alert('Login Failed', message);
        return;
      }

      // Store the JWT
      await tokenStorage.setToken(result.token);

      // Fetch available stores
      const user = await fetchCurrentUser();
      if (!user) {
        Alert.alert('Error', 'Could not retrieve user information.');
        return;
      }

      const stores = user.stores.nodes;
      if (stores.length === 0) {
        Alert.alert('No stores', 'This account has no stores on this server.');
        return;
      }

      if (stores.length === 1) {
        await saveStoreAndNavigate(stores[0]);
      } else {
        // Show store picker — use default store as the first selection
        const defaultId = user.defaultStore?.id;
        showStorePicker(stores, defaultId ?? null);
      }
    } catch (error) {
      Alert.alert('Connection Error', 'Could not connect to the server. Check your settings.');
    } finally {
      setLoading(false);
    }
  }

  function showStorePicker(stores: UserStore[], defaultId: string | null) {
    Alert.alert(
      'Select Store',
      'This account has access to multiple stores. Please choose one:',
      [
        ...stores.map(store => ({
          text: store.id === defaultId
            ? `${store.code} – ${store.name} (last used)`
            : `${store.code} – ${store.name}`,
          onPress: () => saveStoreAndNavigate(store),
        })),
        {text: 'Cancel', style: 'cancel'},
      ],
    );
  }

  async function saveStoreAndNavigate(store: UserStore) {
    await appPreferences.setStoreId(store.id);
    // Re-resolve name_id if a name code was previously saved
    const nameCode = await appPreferences.getNameCode();
    if (nameCode) {
      const {lookupNameByCode} = await import('../api/issue');
      const found = await lookupNameByCode(store.id, nameCode).catch(() => null);
      await appPreferences.setNameId(found?.id ?? null);
    }
    navigation.replace('Home');
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>mSupply Mobile</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor="#999"
          autoCapitalize="none"
          autoCorrect={false}
          value={username}
          onChangeText={setUsername}
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#999"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          editable={!loading}
          onSubmitEditing={handleLogin}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingsLink}
          onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.settingsLinkText}>Configure Server</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f5f5f5'},
  inner: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#007AFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 14,
    color: '#000',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {opacity: 0.6},
  buttonText: {color: '#fff', fontSize: 16, fontWeight: '600'},
  settingsLink: {marginTop: 24, alignItems: 'center'},
  settingsLinkText: {color: '#007AFF', fontSize: 14},
});
