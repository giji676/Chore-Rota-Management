import React, { useEffect, useState, useRef } from 'react';

import { Alert, View, Text, Button, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import api from '../utils/api';

import WeekCalendar from "../components/WeekCalendar";
import CheckBox from "../components/CheckBox";

import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync, configureAndroidChannel } from '../utils/notifications';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export default function HouseDashboardScreen({ navigation, route }) {
    const [house, setHouse] = useState(route.params.house);
    const [error, setError] = useState('');
    const [displayDay, setDisplayDay] = useState([]);
    const [displayDayKey, setDisplayDayKey] = useState('0');
    const [updatedChoresState, setUpdatedChoresState] = useState([]);

    const notificationListener = useRef();
    const responseListener = useRef();

    useEffect(() => {
        async function initNotifications() {
            try {
                await configureAndroidChannel();
                console.log("registering");
                const token = await registerForPushNotificationsAsync();
                console.log("token:", token);
                if (token) {
                    await api.post("accounts/push-token/", { token });
                }
            } catch (error) {
                console.log("error:", error);
            }
        }

        initNotifications();

        const notificationListener = Notifications.addNotificationReceivedListener(notification => {
            console.log("Notification Received:", notification);
        });

        const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
            console.log("Notification Response:", response);
        });

        return () => {
            notificationListener.remove();
            responseListener.remove();
        };
    }, []);

    useEffect(() => {
        if (!house) return;
        fetchHouse();
    }, []);

    useEffect(() => {
        if (!house?.rota[0]) return;
        setDisplayDay(house.rota[0].week[displayDayKey]);
        setUpdatedChoresState([]);
    }, [displayDayKey]);

    const fetchHouse = async () => {
        const res = await api.get(`house/${house.id}/`);
        setHouse(res.data);
    }

    useEffect(() => {
        if (!house) return;
        setDisplayDay(house.rota[0].week[displayDayKey]);
        setUpdatedChoresState([]);
        // console.log(JSON.stringify(house.rota[0], null, 2));
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
    };

    const handleCheck = (ass) => {
        setUpdatedChoresState(prev => {
            const exists = prev.find(item => item.id === ass.id);

            if (exists) {
                return prev.filter(item => item.id !== ass.id);
            } else {
                return [...prev, { ...ass, completed: !ass.completed }];
            }
        });
    };

    const handleSave = async () => {
        await Promise.all(
            updatedChoresState.map(async (ass) => {
                const res = await api.patch(`chores/assignment/${ass.id}/`, { completed: ass.completed });
                return res.data;
            })
        );
        await fetchHouse();
        setUpdatedChoresState([]);
    };

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

            {house?.rota[0] && 
                <WeekCalendar
                    rota={house.rota[0]}
                    onDayPress={(dayKey) => {
                        setDisplayDayKey(dayKey);
                    }}
                />
            }
            {displayDay?.length > 0 && (
                <>
                    <View style={styles.markCompleteContainer}>
                        <Text>Mark Complete</Text>
                    </View>
                    <View>
                        {displayDay.map((ass) => (
                            <View key={ass.id} style={styles.choreDetail}>
                                <Text>{ass.id} - {ass.chore_name}</Text>
                                <CheckBox 
                                    onPress={() => handleCheck(ass)} 
                                    checked={ass.completed}
                                />
                            </View>
                        ))}
                    </View>
                </>
            )}

            <View style={styles.buttonContainer}>
                <Button onPress={() => handleSave()} title="Save changes"/>
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
    choreDetail: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    markCompleteContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 5 
    },
});
