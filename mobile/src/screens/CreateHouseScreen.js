import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import api from "../utils/api";

export default function CreateHouseScreen({ navigation }) {
    const [name, setName] = useState("");
    const [address, setAddress] = useState("");
    const [placeId, setPlaceId] = useState("");
    const [password, setPassword] = useState("");
    const [maxMembers, setMaxMembers] = useState("6");
    const [result, setResult] = useState("");

    const handleCreate = async () => {
        if (!name || !address || !password) {
            setResult("Please fill all required fields.");
            return;
        }

        try {
            const payload = {
                name,
                address,
                place_id: placeId,
                password,
                max_members: parseInt(maxMembers) || 6,
            };

            const response = await api.post("house/create/", payload);

            setResult(JSON.stringify(response.data, null, 2));

            // Navigate to house/dashboard (optional)
            // navigation.navigate("HouseDashboard", { house: response.data });

        } catch (err) {
            console.log(err.response?.data || err.message);
            setResult("Error: " + (err.response?.data?.error || err.message));
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Create a House</Text>

            <TextInput
                style={styles.input}
                placeholder="House Name"
                value={name}
                onChangeText={setName}
            />

            <TextInput
                style={styles.input}
                placeholder="Address"
                value={address}
                onChangeText={setAddress}
            />

            <TextInput
                style={styles.input}
                placeholder="Place ID (optional)"
                value={placeId}
                onChangeText={setPlaceId}
            />

            <TextInput
                style={styles.input}
                secureTextEntry
                placeholder="House Password"
                value={password}
                onChangeText={setPassword}
            />

            <TextInput
                style={styles.input}
                placeholder="Max Members"
                keyboardType="numeric"
                value={maxMembers}
                onChangeText={setMaxMembers}
            />

            <TouchableOpacity style={styles.button} onPress={handleCreate}>
                <Text style={styles.buttonText}>Create House</Text>
            </TouchableOpacity>

            {result !== "" && (
                <View style={styles.resultBox}>
                    <Text style={styles.resultText}>{result}</Text>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 20, paddingTop: 60 },
    title: { fontSize: 24, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        marginBottom: 14,
    },
    button: {
        backgroundColor: "#27ae60",
        padding: 14,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 10,
    },
    buttonText: { color: "white", fontWeight: "bold" },
    resultBox: {
        marginTop: 20,
        padding: 12,
        backgroundColor: "#eee",
        borderRadius: 6,
    },
    resultText: { fontFamily: "monospace" },
});
