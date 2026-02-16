import { ActivityIndicator, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NavigationContainer } from "@react-navigation/native";
import { navigationRef } from "./NavigationService";

import LoginScreen from "../screens/LoginScreen";
import HouseAccessScreen from "../screens/HouseAccessScreen";
import CreateHouseScreen from "../screens/CreateHouseScreen";
import HouseDashboardScreen from "../screens/HouseDashboardScreen";
import EditHouseScreen from "../screens/EditHouseScreen";
import EditChoreScreen from "../screens/EditChoreScreen";
import ProfileButton from "../components/ProfileButton";
import ProfileScreen from "../screens/ProfileScreen";
import VerifyEmailScreen from "../screens/VerifyEmailScreen";
import ChangeEmailScreen from "../screens/ChangeEmailScreen";
import SplashScreen from "../screens/SplashScreen";
import { useAuth } from "../auth/useAuth";

import { colors } from "../theme/index";
const Stack = createNativeStackNavigator();

export default function MainStack() {
    const { accessToken, loading } = useAuth();

    const headerOpts = {
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.background,
        headerTitleStyle: { fontWeight: "bold" },
        title: "",
    }

    if (loading) return <SplashScreen />;

    return (
        <Stack.Navigator>
            {!accessToken ? (
                <Stack.Screen name="Login" component={LoginScreen} options={{
                    ...headerOpts,
                }} />
            ) : (
                    <>
                        <Stack.Screen name="HouseAccess" component={HouseAccessScreen} options={{
                            ...headerOpts,
                            headerRight: () => <ProfileButton />,
                        }} />
                        <Stack.Screen name="Profile" component={ProfileScreen} options={{
                            ...headerOpts,
                        }} />
                        <Stack.Screen name="CreateHouse" component={CreateHouseScreen} options={{
                            ...headerOpts,
                            headerRight: () => <ProfileButton />,
                        }} />
                        <Stack.Screen name="HouseDashboard" component={HouseDashboardScreen} options={{
                            ...headerOpts,
                            headerRight: () => <ProfileButton />,
                        }} />
                        <Stack.Screen name="EditHouse" component={EditHouseScreen} options={{
                            ...headerOpts,
                            headerRight: () => <ProfileButton />,
                        }} />
                        <Stack.Screen name="EditChore" component={EditChoreScreen} options={{
                            ...headerOpts,
                            headerRight: () => <ProfileButton />,
                        }} />
                        <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} options={{
                            presentation: "modal",
                            headerShown: false,
                        }} />
                        <Stack.Screen name="ChangeEmail" component={ChangeEmailScreen} options={{
                            ...headerOpts,
                            // headerRight: () => <ProfileButton />,
                        }} />
                    </>
                )}
        </Stack.Navigator>
    );
}
