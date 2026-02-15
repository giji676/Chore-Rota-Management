import axios from "axios";
import { getTokens, setTokens, clearTokens } from "../auth/authStorage";
import { authApi } from "../auth/authApi";

const api = axios.create({
    baseURL: process.env.EXPO_PUBLIC_API_URL,
});

api.interceptors.request.use(async (config) => {
    const { access } = await getTokens();
    if (access) {
        config.headers.Authorization = `Bearer ${access}`;
    }
    return config;
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            const { refresh, type } = await getTokens();
            if (!refresh) {
                await clearTokens();
                return Promise.reject(error);
            }

            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return api(originalRequest);
                    });
            }

            isRefreshing = true;

            try {
                const res = await authApi.post( "accounts/refresh/",
                    { refresh_token: refresh }
                );

                const { access_token, refresh_token } = res.data;

                await setTokens(access_token, refresh_token, type);

                processQueue(null, access_token);

                originalRequest.headers.Authorization = `Bearer ${access_token}`;
                return api(originalRequest);
            } catch (err) {
                processQueue(err, null);
                await clearTokens();
                return Promise.reject(err);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default api;
