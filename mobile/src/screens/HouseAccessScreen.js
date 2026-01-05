import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator } from "react-native";
import { FontAwesome } from "@expo/vector-icons";

import HouseOptionsModal from "../components/modals/HouseOptionsModal";
import api from "../utils/api";
import logout from "../utils/logout";
import { apiLogError, apiLogSuccess, jsonLog } from "../utils/loggers";

export default function HouseAccessScreen({ navigation }) {
    const [joinCode, setJoinCode] = useState("");
    const [password, setPassword] = useState("");
    const [result, setResult] = useState("");
    const [houses, setHouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [houseOptionsModalVisible, setHouseOptionsModalVisible] = useState(false);
    const [selectedHouse, setSelectedHouse] = useState(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await api.get("accounts/user/");
                // apiLogSuccess(res);
            } catch (err) {
                apiLogError(err);
            }
        }
        fetchUser();
    }, []);

    useEffect(() => {
        fetchUserHouses();
    }, []);

    const fetchUserHouses = async () => {
        try {
            const res = await api.get("houses/user/");
            setHouses(res.data);
        } catch (err) {
            console.log("Failed to fetch user houses:", err.response?.data || err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleJoinHouse = async () => {
        if (!joinCode.trim()) {
            setResult("Please enter a join code");
            return;
        }

        try {
            const response = await api.post(`house/join/${joinCode}/`, { password });
            setResult(JSON.stringify(response.data, null, 2));
            navigation.navigate("HouseDashboard", { house: response.data });
        } catch (error) {
            console.log(error.response?.data || error.message);
            setResult("Error: " + (error.response?.data?.error || error.message));
        }
    };

    const handleCreateHouse = () => {
        navigation.navigate("CreateHouse");
    };

    const renderHouseItem = ({ item }) => (
        <TouchableOpacity
            style={styles.houseItem}
            onPress={() => navigation.navigate("HouseDashboard", { house: item })}
        >
            <Text style={styles.houseName}>{item.name}</Text>
            <TouchableOpacity
                style={styles.houseOptions}
                onPress={() => {
                    setSelectedHouse(item);
                    setHouseOptionsModalVisible(true);
                }}
            >
                <FontAwesome name={"ellipsis-v"} size={20} color="#000" />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    const temp_logout = () => {
        logout();
        navigation.navigate("Login");
    };

    const temp_login_redirect = () => {
        navigation.navigate("Login");
    };

    const handleDelete = async (house) => {
        try {
            const res = await api.delete(`house/${house.id}/delete/`, {data: {house_version: house.version}});
            apiLogSuccess(res);
        } catch (error) {
            apiLogError(error);
        } finally {
            fetchUserHouses();
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Your Houses</Text>

            {loading ? (
                <ActivityIndicator size="large" style={{ marginVertical: 20 }} />
            ) : houses.length > 0 ? (
                    <FlatList
                        data={houses}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={renderHouseItem}
                        style={{ marginBottom: 20 }}
                    />
                ) : (
                        <Text style={{ textAlign: "center", marginBottom: 20 }}>No houses yet</Text>
                    )}

            <Text style={styles.title}>Join or Create a House</Text>

            <TextInput
                style={styles.input}
                placeholder="Enter join code"
                placeholderTextColor="gray"
                value={joinCode}
                onChangeText={setJoinCode}
            />
            <TextInput
                style={styles.input}
                placeholder="Enter password"
                placeholderTextColor="gray"
                value={password}
                onChangeText={setPassword}
            />

            <TouchableOpacity style={styles.button} onPress={handleJoinHouse}>
                <Text style={styles.buttonText}>Join House</Text>
            </TouchableOpacity>

            <Text style={styles.or}>OR</Text>

            <TouchableOpacity style={styles.createButton} onPress={handleCreateHouse}>
                <Text style={styles.buttonText}>Create New House</Text>
            </TouchableOpacity>

            {result !== "" && (
                <View style={styles.resultBox}>
                    <Text style={styles.resultText}>{result}</Text>
                </View>
            )}

            <TouchableOpacity style={styles.button} onPress={temp_logout}>
                <Text style={styles.buttonText}>Logout</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={temp_login_redirect}>
                <Text style={styles.buttonText}>LoginRedirect</Text>
            </TouchableOpacity>

            <HouseOptionsModal
                visible={houseOptionsModalVisible}
                house={selectedHouse}
                onClose={() => {
                    setHouseOptionsModalVisible(false);
                    fetchUserHouses();
                }}
                onEdit={(house) => jsonLog("edit", house)}
                onDelete={(house) => handleDelete(house)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    title: { fontSize: 24, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
    input: {
        borderWidth: 1,
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
    },
    button: {
        backgroundColor: "#3498db",
        padding: 14,
        borderRadius: 8,
        alignItems: "center",
    },
    createButton: {
        backgroundColor: "#2ecc71",
        padding: 14,
        borderRadius: 8,
        alignItems: "center",
    },
    buttonText: { color: "white", fontWeight: "bold" },
    or: { textAlign: "center", marginVertical: 20, fontSize: 16 },
    resultBox: {
        marginTop: 20,
        padding: 12,
        backgroundColor: "#eee",
        borderRadius: 6,
    },
    resultText: { fontFamily: "monospace" },
    houseItem: {
        padding: 12,
        backgroundColor: "#f0f0f0",
        borderRadius: 6,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    houseName: { fontSize: 16 },
    houseOptions: {
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 15,
        backgroundColor: "#ddd",
        aspectRatio: 1,
        borderRadius: 5,
    },
});
