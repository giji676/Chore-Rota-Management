import React, { useEffect, useState, useRef } from 'react';
import { Alert, View, Text, Button, FlatList, StyleSheet, TextInput, Modal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync, configureAndroidChannel } from '../utils/notifications';

import api from '../utils/api';
import WeekCalendar from "../components/WeekCalendar";
import CheckBox from "../components/CheckBox";

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
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

    // Modal state
    const [modalVisible, setModalVisible] = useState(false);
    const [newChoreName, setNewChoreName] = useState('');
    const [newChoreDescription, setNewChoreDescription] = useState('');
    const [newChoreColor, setNewChoreColor] = useState('#ffffff');

    const [assignModalVisible, setAssignModalVisible] = useState(false);
    const [selectedDay, setSelectedDay] = useState('mon');
    const [selectedTime, setSelectedTime] = useState(new Date());
    const [selectedMember, setSelectedMember] = useState('');

    const notificationListener = useRef();
    const responseListener = useRef();

    useEffect(() => {
        async function initNotifications() {
            try {
                await configureAndroidChannel();
                const token = await registerForPushNotificationsAsync();
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

    const handleCreateChore = async () => {
        if (!newChoreName.trim()) {
            Alert.alert("Error", "Chore name is required");
            return;
        }

        try {
            const res = await api.post("chores/create/", {
                house_id: house.id,
                name: newChoreName,
                description: newChoreDescription,
                color: newChoreColor,
            });
            // setHouse((prev) => ({
            //     ...prev,
            //     chores: [...prev.chores, res.data],
            // }));

            await fetchHouse();
            setModalVisible(false);
            setNewChoreName('');
            setNewChoreDescription('');
            setNewChoreColor('#ffffff');
        } catch (err) {
            Alert.alert("Error", err.response?.data?.error || err.message);
        }
    };

    const handleAssignChore = async () => {
        if (!selectedDay || !selectedTime || !selectedMember) {
            Alert.alert("Error", "Please select day, time, and assignee");
            return;
        }

        try {
            await api.post("chores/assign/", {
                // chore_id: selectedChore.id, // replace with your actual selected chore
                chore_id: 91, // replace with your actual selected chore
                rota_id: house?.rota[0].id, // replace with your actual selected chore
                day: selectedDay,
                time: selectedTime.toTimeString().slice(0, 5), // HH:MM 24h
                assignee: selectedMember,
            });
            await fetchHouse();
            setAssignModalVisible(false);
            // reset
            setSelectedDay('mon');
            setSelectedTime(new Date());
            setSelectedMember('');
        } catch (err) {
            Alert.alert("Error", err.response?.data?.error || err.message);
        }
    };

    const onChangeTime = (event, time) => {
        if (time) setSelectedTime(time);
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
                                <Text>{ass.id} - {ass.chore.name}</Text>
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
                <Button onPress={handleSave} title="Save Changes"/>
            </View>
            <View style={styles.buttonContainer}>
                <Button onPress={() => setModalVisible(true)} title="Create Chore"/>
            </View>
            <Modal

                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalBackground}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>Create New Chore</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Chore Name"
                            value={newChoreName}
                            onChangeText={setNewChoreName}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Description"
                            value={newChoreDescription}
                            onChangeText={setNewChoreDescription}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Color (Hex)"
                            value={newChoreColor}
                            onChangeText={setNewChoreColor}
                        />

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                            <Button title="Cancel" onPress={() => setModalVisible(false)} />
                            <Button title="Create" onPress={handleCreateChore} />
                        </View>
                    </View>
                </View>
            </Modal>
            <View style={styles.buttonContainer}>
                <Button title="Assign Chore" onPress={() => setAssignModalVisible(true)} />
            </View>

            <Modal
                visible={assignModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setAssignModalVisible(false)}
            >
                <View style={styles.modalBackground}>
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>Assign Chore</Text>

                        {/* Day Picker */}
                        <Text>Day</Text>
                        <Picker
                            selectedValue={selectedDay}
                            onValueChange={(day) => setSelectedDay(day)}
                            style={{ marginBottom: 10 }}
                        >
                            {['mon','tue','wed','thu','fri','sat'].map(day => (
                                <Picker.Item key={day} label={day.toUpperCase()} value={day} />
                            ))}
                        </Picker>

                        {/* Time Picker */}
                        <Text>Time</Text>
                        <DateTimePicker
                            value={selectedTime}
                            mode="time"
                            is24Hour={true}
                            display="default"
                            onChange={onChangeTime}
                            style={{ marginBottom: 10 }}
                        />

                        {/* Assignee Picker */}
                        <Text>Assignee</Text>
                        <Picker
                            selectedValue={selectedMember}
                            onValueChange={(memberId) => setSelectedMember(memberId)}
                            style={{ marginBottom: 10 }}
                        >
                            {house.members.map(member => (
                                <Picker.Item
                                    key={member.id}
                                    label={member.username + (member.is_guest ? ' (Guest)' : '')}
                                    value={member.id}
                                />
                            ))}
                        </Picker>

                        {/* Buttons */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                            <Button title="Cancel" onPress={() => setAssignModalVisible(false)} />
                            <Button title="Assign" onPress={handleAssignChore} />
                        </View>
                    </View>
                </View>
            </Modal>
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
    modalBackground: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: '80%',
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 10,
    },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        padding: 10,
        marginBottom: 10,
    },
});
