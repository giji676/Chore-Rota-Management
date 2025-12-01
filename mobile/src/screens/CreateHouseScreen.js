import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, FlatList, ActivityIndicator } from "react-native";
import api from "../utils/api";

export default function CreateHouseScreen({ navigation }) {
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [address, setAddress] = useState("");
    const [maxMembers, setMaxMembers] = useState("6");
    const [result, setResult] = useState("");
    const [placeId, setPlaceId] = useState(""); // internal, not user-editable
    const [suggestions, setSuggestions] = useState([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [selectedPlace, setSelectedPlace] = useState(null);

    useEffect(() => {
        if (address.length < 2) {
            setSuggestions([]);
            return;
        }

        if (selectedPlace && address === selectedPlace.description) {
            return;
        }

        const fetchSuggestions = async () => {
            setLoadingSuggestions(true);
            try {
                const res = await api.get(`/address-autocomplete/?q=${encodeURIComponent(address)}`);
                setSuggestions(res.data.predictions);
            } catch (err) {
                console.log(err.response?.data || err.message);
            } finally {
                setLoadingSuggestions(false);
            }
        };

        const delayDebounce = setTimeout(fetchSuggestions, 300); // debounce
        return () => clearTimeout(delayDebounce);
    }, [address]);

    const handleSelectSuggestion = (item) => {
        setAddress(item.description);
        setPlaceId(item.place_id);
        setSelectedPlace(item);
        setSuggestions([]);
    };

    const handleCreate = async () => {
        if (!name || !address) {
            setResult("Please fill all required fields.");
            return;
        }

        try {
            const payload = {
                name,
                password,
                address,
                place_id: placeId,
                max_members: parseInt(maxMembers) || 6,
            };

            const response = await api.post("house/create/", payload);

            setResult(JSON.stringify(response.data, null, 2));

            navigation.navigate("HouseDashboard", { house: response.data });

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
                placeholderTextColor="gray"
                value={name}
                onChangeText={setName}
            />

            <TextInput
                style={styles.input}
                placeholder="Address"
                placeholderTextColor="gray"
                value={address}
                onChangeText={text => {
                    setAddress(text);
                    setPlaceId("");
                }}
            />

            {loadingSuggestions && <ActivityIndicator size="small" />}
            {suggestions.length > 0 && (
                <ScrollView style={styles.suggestionsList}>
                    {suggestions.map((item) => (
                        <TouchableOpacity
                            key={item.place_id}
                            style={styles.suggestionItem}
                            onPress={() => handleSelectSuggestion(item)}
                        >
                            <Text>{item.description}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}

            <TextInput
                style={styles.input}
                secureTextEntry
                placeholder="House Password"
                placeholderTextColor="gray"
                value={password}
                onChangeText={setPassword}
            />

            <TextInput
                style={styles.input}
                placeholder="Max Members"
                placeholderTextColor="gray"
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
        marginBottom: 10,
    },
    suggestionsList: {
        borderWidth: 1,
        borderColor: "#ccc",
        maxHeight: 150,
        marginBottom: 10,
        borderRadius: 8,
    },
    suggestionItem: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
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
