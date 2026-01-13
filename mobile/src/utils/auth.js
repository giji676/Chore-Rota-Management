import axios from "axios";
import { jwtDecode } from "jwt-decode";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { navigate } from "../navigation/NavigationService";

const authApi = axios.create({
    baseURL: process.env.EXPO_PUBLIC_API_URL,
});

export const isTokenExpired = (token) => {
    if (!token) return true;

    try {
        const decoded = jwtDecode(token);
        const now = Math.floor(Date.now() / 1000);
        return decoded.exp < now;
    } catch (e) {
        return true;
    }
};

export const guestLogin = async (device_id) => {
    if (!device_id) {
        const _device_id = await AsyncStorage.getItem("device_id");
        if (!_device_id) {
            return null;
        }
        device_id = _device_id;
    }

    try {
        const res = await authApi.post("accounts/guest/", { device_id });
        const accessToken = res.data.access_token;
        const refreshToken = res.data.refresh_token;

        await AsyncStorage.setItem("access_token", accessToken);
        await AsyncStorage.setItem("refresh_token", refreshToken);
        await AsyncStorage.setItem("last_login", "guest");

        return accessToken;
    } catch (err) {
        console.log("Guest login failed:", err.response?.data || err.message);
        return null;
    }
};

export const refreshAccessToken = async () => {
    const refresh_token = await AsyncStorage.getItem("refresh_token");
    if (!refresh_token) {
        return guestLogin();
    }

    const isExpired = isTokenExpired(refresh_token);

    if (isExpired) {
        return guestLogin();
    }

    try {
        const res = await authApi.post("accounts/refresh/", {
            refresh_token,
        });

        const newAccessToken = res.data.access_token;
        const newRefreshToken = res.data.refresh_token;
        await AsyncStorage.setItem("access_token", newAccessToken);
        await AsyncStorage.setItem("refresh_token", newRefreshToken);

        return newAccessToken;
    } catch (err) {
        console.log("Token refresh failed:", err.response?.data || err.message);
        // await AsyncStorage.removeItem("access_token");
        // await AsyncStorage.removeItem("refresh_token");

        const guestToken = await guestLogin();
        if (guestToken) return guestToken;

        navigate("Login");
        return null;
    }
};

export default { authApi, refreshAccessToken };
