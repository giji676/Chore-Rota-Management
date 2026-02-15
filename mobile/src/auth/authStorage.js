import * as SecureStore from "expo-secure-store";

export const setTokens = async (access, refresh, type) => {
    await SecureStore.setItemAsync("access_token", access);
    await SecureStore.setItemAsync("refresh_token", refresh);
    await SecureStore.setItemAsync("last_login", type); // guest | registered
};

export const getTokens = async () => {
    const access = await SecureStore.getItemAsync("access_token");
    const refresh = await SecureStore.getItemAsync("refresh_token");
    const type = await SecureStore.getItemAsync("last_login");
    return { access, refresh, type };
};

export const clearTokens = async () => {
    await SecureStore.deleteItemAsync("access_token");
    await SecureStore.deleteItemAsync("refresh_token");
    await SecureStore.deleteItemAsync("last_login");
};

export const getDeviceId = async () => {
    return SecureStore.getItemAsync("device_id");
};

export const setDeviceId = async (id) => {
    return SecureStore.setItemAsync("device_id", id);
};
