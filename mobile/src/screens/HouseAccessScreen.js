import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import api from "../utils/api";

export default function HouseAccessScreen({ navigation }) {
    const [joinCode, setJoinCode] = useState("");
    const [password, setPassword] = useState("");
    const [result, setResult] = useState("");

    const handleJoinHouse = async () => {
        if (!joinCode.trim()) {
            setResult("Please enter a join code");
            return;
        }

        try {
            const response = await api.post(`house/join/${joinCode}/`, {"password": password});

            setResult(JSON.stringify(response.data, null, 2));

            // Navigate to house dashboard screen or whatever:
            // navigation.navigate("HouseDashboard", { house: response.data });

        } catch (error) {
            console.log(error.response?.data || error.message);
            setResult("Error: " + (error.response?.data?.error || error.message));
        }
    };

    const handleCreateHouse = () => {
        navigation.navigate("CreateHouse");
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Join or Create a House</Text>

            <TextInput
                style={styles.input}
                placeholder="Enter join code"
                value={joinCode}
                onChangeText={setJoinCode}
            />
            <TextInput
                style={styles.input}
                placeholder="Enter password"
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, justifyContent: "center" },
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
});
