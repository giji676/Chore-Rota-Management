import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Android notification channel
export async function configureAndroidChannel() {
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }
}

// Ask permission + get Expo push token
export async function registerForPushNotificationsAsync() {
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
        const { status: requestStatus } = await Notifications.requestPermissionsAsync();
        status = requestStatus;
    }

    if (status !== 'granted') {
        console.warn('Push notifications permission denied!');
        return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
}
