import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, FlatList, ActivityIndicator } from "react-native";
import api from "../utils/api";

import { colors, spacing, typography } from "../theme";
import AppText from "../components/AppText";
import AppTextInput from "../components/AppTextInput";
import AppButton from "../components/AppButton";

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
            <AppText style={styles.title}>Create a House</AppText>
            <View style={{ gap: spacing.md }}>
                <AppTextInput
                    placeholder="House Name"
                    placeholderTextColor="gray"
                    value={name}
                    onChangeText={setName}
                />

                <AppTextInput
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
                    <View style={styles.suggestions}>
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            {suggestions.map((item, index) => (
                                <View key={item.place_id}>
                                    <TouchableOpacity
                                        style={styles.suggestionItem}
                                        onPress={() => handleSelectSuggestion(item)}
                                    >
                                        <AppText>{item.description}</AppText>
                                    </TouchableOpacity>

                                    {index < suggestions.length - 1 && (
                                        <View style={styles.divider} />
                                    )}
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                )}

                <AppTextInput
                    secureTextEntry
                    placeholder="House Password"
                    placeholderTextColor="gray"
                    value={password}
                    onChangeText={setPassword}
                />

                <AppTextInput
                    placeholder="Max Members"
                    placeholderTextColor="gray"
                    keyboardType="numeric"
                    value={maxMembers}
                    onChangeText={setMaxMembers}
                />

                <AppButton
                    title="Save Changes"
                    onPress={handleCreate}
                />

                {result !== "" && (
                    <View style={styles.resultBox}>
                        <AppText style={styles.resultText}>{result}</AppText>
                    </View>
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: spacing.lg,
        backgroundColor: colors.background,
    },
    title: {
        ...typography.h2,
        marginBottom: spacing.lg,
    },
    suggestions: {
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.raisedSurface,
        borderRadius: 8,
        maxHeight: 150,
        overflow: "hidden"
    },
    suggestionItem: {
        padding: spacing.sm,
    },
    divider: {
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
        marginVertical: spacing.xs,
    },
    resultBox: {
        marginTop: 20,
        padding: 12,
        backgroundColor: "#eee",
        borderRadius: 6,
    },
    resultText: { fontFamily: "monospace" },
});
