import React, { useEffect, useState } from 'react';

import { Alert, View, Text, Button, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import api from '../utils/api';

export default function HouseDashboardScreen({ navigation, route }) {
    // Accept either a full house object or just houseId
    const [house, setHouse] = useState(route.params.house);
    const [rota, setRota] = useState();
    const [chore, setChore] = useState();
    const [error, setError] = useState('');

    useEffect(() => {
        if (!house) return;
        console.log(JSON.stringify(house, null, 2));
    }, [house]);

    // if (loading) return <ActivityIndicator size="large" style={styles.loader} />;
    if (error) return <Text style={styles.error}>{error}</Text>;
    if (!house) return <Text style={styles.error}>House not found</Text>;

    const handleDelete = async () => {
        Alert.alert(
            "Confirm Delete",
            "Are you sure you want to delete this house? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const res = await api.delete(`house/${house.id}/`);
                            Alert.alert("House deleted successfully");
                            navigation.goBack();
                        } catch (err) {
                            if (err.response && err.response.status !== 204) {
                                Alert.alert(
                                    "Error",
                                    err.response?.data?.error || err.message
                                );
                            } else {
                                Alert.alert("House deleted successfully");
                                navigation.goBack();
                            }
                        }
                    }
                }
            ]
        );
    }

    const createChore = async () => {
        const res = await api.post("chores/create/", {
            "house_id": house.id,
            "name": "hoover",
            "description": "shit"
        });
        return res.data.id;
    }

    const createAss = async (rotaId, choreId) => {
        const res = await api.post("chores/assign/", {
            "rota_id": rotaId,
            "chore_id": choreId,
            "day": "mon",
        });
        return res.data.id;
    }

    const getRota = async (rotaId) => {
        const res = await api.get(`rota/${rotaId}/`);
        return res.data;
    }

    const handleCreateRota = async () => {
        try {
            let rotaId;
            if (house.rota.length === 0) {
                const res = await api.post("rota/create/", { "house": house.id });
                rotaId = res.data.id;
            } else {
                rotaId = house.rota[0].id;
            }
            const choreId = await createChore();
            const assId = await createAss(rotaId, choreId);
            const newRota = await getRota(rotaId);
            setRota(newRota);
            console.log(JSON.stringify(newRota, null, 2));
        } catch {
        }
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{house.name}</Text>
            <Text style={styles.joinCode}>Join Code: {house.join_code}</Text>

            <Text style={styles.subTitle}>Members:</Text>
            <FlatList
                data={house.members}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <Text style={styles.member}>
                        {item.username}{item.is_guest ? ' (Guest)' : ''}
                    </Text>
                )}
            />

            {rota?.assignments?.length && (
                <View>
                    {rota.assignments.map((item) => (
                    <Text key={item.id}>{item.chore_name} {item.day}</Text>
                    ))}
                </View>
            )}

            <View style={styles.buttonContainer}>
                <Button
                    title="Create Rota"
                    onPress={handleCreateRota}
                />
            </View>
            <View style={styles.buttonContainer}>
                <Button
                    title="Delete House"
                    color="red"
                    onPress={handleDelete}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
    joinCode: { fontSize: 16, marginBottom: 20 },
    subTitle: { fontSize: 18, marginBottom: 10 },
    member: { fontSize: 16, marginBottom: 5 },
    buttonContainer: { marginTop: 20 },
    error: { color: 'red', textAlign: 'center', marginTop: 20 },
});
