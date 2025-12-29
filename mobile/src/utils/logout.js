import AsyncStorage from "@react-native-async-storage/async-storage";

const logout = async () => {
    await AsyncStorage.removeItem("access_token");
    await AsyncStorage.removeItem("refresh_token");
    await AsyncStorage.removeItem("device_id");
    await AsyncStorage.removeItem("last_login");
};

export default logout;
