import AsyncStorage from "@react-native-async-storage/async-storage";

const logout = async () => {
    await AsyncStorage.removeItem("access_token");
    await AsyncStorage.removeItem("refresh_token");
};

export default logout;
