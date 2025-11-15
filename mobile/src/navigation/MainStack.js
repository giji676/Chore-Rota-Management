import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LoginScreen from '../screens/LoginScreen';
import HouseAccessScreen from '../screens/HouseAccessScreen';
import CreateHouseScreen from '../screens/CreateHouseScreen';
import HouseDashboardScreen from '../screens/HouseDashboardScreen';

const Stack = createNativeStackNavigator();

export default function MainStack() {
    const [initialRoute, setInitialRoute] = useState(null);

    useEffect(() => {
        const checkLogin = async () => {
            const access = await AsyncStorage.getItem('access_token');
            console.log("MainStack access:", access);
            if (access) {
                setInitialRoute('HouseAccess');
            } else {
                setInitialRoute('Login');
            }
        };

        checkLogin();
    }, []);

    if (!initialRoute) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <Stack.Navigator initialRouteName={initialRoute}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="HouseAccess" component={HouseAccessScreen} />
            <Stack.Screen name="CreateHouse" component={CreateHouseScreen} />
            <Stack.Screen name="HouseDashboard" component={HouseDashboardScreen} />
        </Stack.Navigator>
    );
}
