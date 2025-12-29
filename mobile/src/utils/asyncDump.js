import AsyncStorage from '@react-native-async-storage/async-storage';

export async function dumpAsyncStorage() {
    const keys = await AsyncStorage.getAllKeys();
    const all = await AsyncStorage.multiGet(keys);
    console.log('AsyncStorage dump:', all);
    return all;
}
