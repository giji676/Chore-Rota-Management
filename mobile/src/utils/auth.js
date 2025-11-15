import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const authApi = axios.create({
    baseURL: process.env.EXPO_PUBLIC_API_URL,
});


const refreshAccessToken = async () => {
    const refresh_token = await AsyncStorage.getItem("refresh_token");
    if (!refresh_token) return null;

    try {
        const res = await authApi.post("accounts/refresh/", { refresh_token });

        const newAccessToken = res.data.access_token;

        await AsyncStorage.setItem("access_token", newAccessToken);
        return newAccessToken;
    } catch (err) {
        console.log("Refresh token failed", err);
        await AsyncStorage.removeItem("access_token");
        await AsyncStorage.removeItem("refresh_token");
        return null;
    }
};

export default authApi;
