import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from './navigation/NavigationService';
import { ActionSheetProvider } from "@expo/react-native-action-sheet";
import MainStack from './navigation/MainStack';
import { AuthProvider } from './auth/AuthContext';

export default function App() {
    return (
        <AuthProvider>
            <ActionSheetProvider>
                <NavigationContainer>
                    <MainStack />
                </NavigationContainer>
            </ActionSheetProvider>
        </AuthProvider>
    );
}
