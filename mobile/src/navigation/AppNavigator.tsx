import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import SettingsScreen from '../screens/SettingsScreen';
import IssueScreen from '../screens/issue/IssueScreen';
import ItemSearchScreen from '../screens/issue/ItemSearchScreen';
import ReceiveListScreen from '../screens/receive/ReceiveListScreen';
import ReceiveDetailScreen from '../screens/receive/ReceiveDetailScreen';
import StocktakeScreen from '../screens/stocktake/StocktakeScreen';

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Settings: undefined;
  Issue: {addedItem?: {lineId: string; itemId: string; itemName: string}} | undefined;
  ItemSearch: {invoiceId: string; shipmentCreated: boolean};
  ReceiveList: undefined;
  ReceiveDetail: {shipmentId: string};
  Stocktake: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerStyle: {backgroundColor: '#007AFF'},
          headerTintColor: '#fff',
          headerTitleStyle: {fontWeight: '600'},
        }}>
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{title: 'mSupply Mobile', headerBackVisible: false}}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{title: 'Settings'}}
        />
        <Stack.Screen
          name="Issue"
          component={IssueScreen}
          options={{title: 'Issue Stock'}}
        />
        <Stack.Screen
          name="ItemSearch"
          component={ItemSearchScreen}
          options={{title: 'Search Items'}}
        />
        <Stack.Screen
          name="ReceiveList"
          component={ReceiveListScreen}
          options={{title: 'Receive Stock'}}
        />
        <Stack.Screen
          name="ReceiveDetail"
          component={ReceiveDetailScreen}
          options={{title: 'Inbound Shipment'}}
        />
        <Stack.Screen
          name="Stocktake"
          component={StocktakeScreen}
          options={{title: 'Stocktake'}}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
