import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from './navigation/NavigationService';
import MainStack from './navigation/MainStack';
import { ActionSheetProvider } from "@expo/react-native-action-sheet";

export default function App() {
    return (
        <ActionSheetProvider>
            <NavigationContainer>
                <MainStack />
            </NavigationContainer>

        </ActionSheetProvider>
    );
}
