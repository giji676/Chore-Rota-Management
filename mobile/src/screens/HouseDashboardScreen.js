import React, { useEffect, useState } from 'react';

import { Alert, View, Text, Button, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import api from '../utils/api';

export default function HouseDashboardScreen({ navigation, route }) {
    // Accept either a full house object or just houseId
    const [house, setHouse] = useState(route.params.house);
    const [error, setError] = useState('');

    useEffect(() => {
        // if (!house && houseId) {
        //     const fetchHouse = async () => {
        //         try {
        //             const res = await api.get(`house/${houseId}/`);
        //             setHouse(res.data);
        //         } catch (err) {
        //             setError(err.response?.data?.error || err.message);
        //         } finally {
        //             setLoading(false);
        //         }
        //     };
        //
        //     fetchHouse();
        // }
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

            <View style={styles.buttonContainer}>
                <Button
                    title="Manage Rota"
                    onPress={() => navigation.navigate('ManageRota', { houseId: house.id })}
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
