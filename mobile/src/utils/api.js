import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import authApi from "./auth";

const api = axios.create({
    baseURL: process.env.EXPO_PUBLIC_API_URL,
});

// request interceptor for access token
api.interceptors.request.use(async (config) => {
    const _token = await AsyncStorage.getItem("access_token");
    const refresh_token = await AsyncStorage.getItem("refresh_token");
    const res = await axios.post("http://192.168.0.134:8000/api/accounts/refresh/", {"refresh_token": refresh_token});

    const token = res.data.access_token;
    await AsyncStorage.setItem("access_token", res.data.access_token);
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    response => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            const newAccessToken = await authApi.refreshAccessToken();

            if (newAccessToken) {
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return api(originalRequest);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
