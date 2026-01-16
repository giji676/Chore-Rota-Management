import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NavigationContainer } from "@react-navigation/native";
import { navigationRef } from "./NavigationService";
import AsyncStorage from "@react-native-async-storage/async-storage";

import LoginScreen from "../screens/LoginScreen";
import HouseAccessScreen from "../screens/HouseAccessScreen";
import CreateHouseScreen from "../screens/CreateHouseScreen";
import HouseDashboardScreen from "../screens/HouseDashboardScreen";
import EditHouseScreen from "../screens/EditHouseScreen";
import EditChoreScreen from "../screens/EditChoreScreen";
import { dumpAsyncStorage } from "../utils/asyncDump";
import { isTokenExpired, refreshAccessToken, guestLogin } from "../utils/auth";

import { colors } from "../theme/index";
const Stack = createNativeStackNavigator();

export default function MainStack() {
    const [initialRoute, setInitialRoute] = useState(null);

    useEffect(() => {
        const checkLogin = async () => {
            // dumpAsyncStorage();
            const lastLogin = await AsyncStorage.getItem("last_login");
            if (lastLogin === "registered") {
                const access = await AsyncStorage.getItem("access_token");
                const refresh = await AsyncStorage.getItem("refresh_token");
                if (access && !isTokenExpired(access)) {
                    setInitialRoute("HouseAccess");
                } else if (refresh && !isTokenExpired(refresh)) {
                    const newAccess = await refreshAccessToken();
                    console.log("Refreshed access token:", newAccess);
                    if (newAccess) {
                        setInitialRoute("HouseAccess");
                    } else {
                        setInitialRoute("Login");
                    }
                } else {
                    setInitialRoute("Login");
                }
            } else if (lastLogin === "guest") {
                const deviceId = await AsyncStorage.getItem("device_id");
                const token = await guestLogin(deviceId);

                setInitialRoute("HouseAccess");
            } else {
                console.log("no last_login");
                setInitialRoute("Login");
            }
        };

        checkLogin();
    }, []);

    if (!initialRoute) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    const headerOpts = {
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.background,
        headerTitleStyle: { fontWeight: "bold" },
        // title: "",
    }

    return (
        <Stack.Navigator initialRouteName={initialRoute}>
            <Stack.Screen name="Login" component={LoginScreen} options={{
                ...headerOpts,
            }} />
            <Stack.Screen name="HouseAccess" component={HouseAccessScreen} options={{
                ...headerOpts,
            }} />
            <Stack.Screen name="CreateHouse" component={CreateHouseScreen} options={{
                ...headerOpts,
            }} />
            <Stack.Screen name="HouseDashboard" component={HouseDashboardScreen} options={{
                ...headerOpts,
            }} />
            <Stack.Screen name="EditHouse" component={EditHouseScreen} options={{
                ...headerOpts,
            }} />
            <Stack.Screen name="EditChore" component={EditChoreScreen} options={{
                ...headerOpts,
            }} />
        </Stack.Navigator>
    );
}
