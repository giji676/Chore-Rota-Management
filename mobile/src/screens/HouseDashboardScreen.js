import { useEffect, useState, useRef, useMemo } from 'react';
import { 
    Pressable,
    Alert,
    View,
    StyleSheet,
    PanResponder,
    LayoutAnimation,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync, configureAndroidChannel } from '../utils/notifications';
import { useActionSheet } from "@expo/react-native-action-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';

import api from '../utils/api';
import { useAuth } from '../auth/useAuth';
import socketUrl from '../utils/webSocketBase';
import { apiLogSuccess, apiLogError, jsonLog } from "../utils/loggers";
import MonthCalendar from "../components/MonthCalendar";
import CheckBox from "../components/CheckBox";

import { colors, spacing, typography } from "../theme";
import AppText from "../components/AppText";

const DEFAULT_COLOR = "#ff0000";

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export default function HouseDashboardScreen({ navigation, route }) {
    const { user } = useAuth();
    const { showActionSheetWithOptions } = useActionSheet();
    const insets = useSafeAreaInsets();

    const [house, setHouse] = useState(route.params.house);
    const [displayDayKey, setDisplayDayKey] = useState(new Date().toISOString().split("T")[0]);

    const [choreFilter, setChoreFilter] = useState("all"); 
    const [expandedOccId, setExpandedOccId] = useState(null);

    const [currentMonth, setCurrentMonth] = useState(
        new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    );

    const socketRef = useRef();

    useEffect(() => {
        async function initNotifications() {
            try {
                await configureAndroidChannel();
                const token = await registerForPushNotificationsAsync();
                if (token) {
                    const res = await api.post("accounts/push-token/", { token });
                }
            } catch (err) {
                apiLogError(err);
            }
        }
        initNotifications();
    }, []);

    useEffect(() => {
        if (!house) return;
        fetchHouse();
        // setupWebSocket();
    }, []);

    const setupWebSocket = () => {
        const socket = new WebSocket(socketUrl(`/ws/house/${house.id}/`));
        socketRef.current = socket;

        socket.onopen = (e) => {
        };

        socket.onerror = (e) => {
            console.log("ws error", e);
        };

        socket.onmessage = (e) => {
            const data = JSON.parse(e.data);
            // TEMP: Change it so only requests the updated item with id
            switch (data.event) {
                case "chore.update":
                    // updateChores(data.data);
                    break;
                case "schedule.update":
                    // updateSchedule(data.data);
                    break;
            }
        };

        socket.onclose = () => {
            console.log("ws closed");
        };
    };

    const fetchHouse = async () => {
        try {
            const res = await api.get(`house/${house.id}/details/`);
            setHouse(res.data);
        } catch (err) {
            setError("Failed to fetch house");
        }
    };

    const handleCheckOccurrence = async (occ) => {
        await api.patch(`occurrences/${occ.id}/update/`, {
            "occurrence_version": occ.version,
            completed: !occ.completed 
        });
        fetchHouse();
    };

    const handleDeleteOccurrence = async (occ) => {
        Alert.alert(
            "Confirm Delete",
            "Confirm aciton",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete Only This",
                    style: "destructive",
                    onPress: async () => {
                        const data = {
                            "occurrence_version": occ.version,
                            "generate_occurrences": true
                        };
                        try {
                            const res = await api.delete(`occurrences/${occ.id}/delete/`, {data: data});
                            Alert.alert("Chore deleted successfully");
                        } catch (err) {
                            Alert.alert("Error", err.response?.data?.detail);
                        } finally {
                            fetchHouse();
                        }
                    }
                },
                {
                    text: "Delete All Futures",
                    style: "destructive",
                    onPress: async () => {
                        const data = {
                            "occurrence_version": occ.version,
                            "generate_occurrences": false
                        };
                        try {
                            const res = await api.delete(`occurrences/${occ.id}/delete/`, {data: data});
                            Alert.alert("All chores deleted successfully");
                        } catch (err) {
                            Alert.alert("Error", err.response?.data?.detail);
                        } finally {
                            fetchHouse();
                        }
                    }
                }
            ]
        );
    };

    const filteredOccurrences = useMemo(() => {
        if (!house?.occurrences) return [];

        if (choreFilter === "all") {
            return house.occurrences;
        }

        return house.occurrences.filter(
            occ => occ.assigned_user.id === user.id
        ); }, [house, choreFilter]);

    const occurrencesByDate = useMemo(() => {
        const map = {};

        filteredOccurrences.forEach((occ) => {
            const key = new Date(occ.due_date).toISOString().split("T")[0];
            if (!map[key]) map[key] = [];
            map[key].push(occ);
        });

        return map;
    }, [filteredOccurrences]);

    const displayDay = displayDayKey
        ? occurrencesByDate[displayDayKey] || []
        : [];

    const goToPrevMonth = () => {
        setCurrentMonth(prev =>
            new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
        );
    };

    const goToNextMonth = () => {
        setCurrentMonth(prev =>
            new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
        );
    };

    // TODO: Fetch from prev month to next month?
    // and on month change fetch the nest/previous
    // so buffer of 1 month is kept locally
    const fetchOccurrences = async (date) => {
        const yyyy = date.getFullYear();
        const mm = (date.getMonth() + 1).toString().padStart(2, "0");

        const start_dd = "01";
        const end_dd = new Date(
            date.getFullYear(),
            date.getMonth() + 1,
            0
        ).getDate().toString().padStart(2, "0");

        const from_date = `${yyyy}-${mm}-${start_dd}`;
        const to_date = `${yyyy}-${mm}-${end_dd}`;

        const res = await api.get(
            `chore/occurrences/37/?from=${from_date}&to=${to_date}`
        );

        setHouse({ occurrences: res.data });
        setUpdate(prev => !prev);
    };

    useEffect(() => {
        fetchOccurrences(currentMonth);
    }, [currentMonth]);

    useEffect(() => {
        const today = new Date();
        const isCurrentMonth = 
            currentMonth.getFullYear() === today.getFullYear() &&
            currentMonth.getMonth() === today.getMonth();
        
        if (isCurrentMonth) {
            // Current month: select today
            setDisplayDayKey(today.toISOString().split("T")[0]);
        } else {
            // Other months: select 1st of the month
            const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
            const year = firstDay.getFullYear();
            const month = String(firstDay.getMonth() + 1).padStart(2, '0');
            const day = String(firstDay.getDate()).padStart(2, '0');
            setDisplayDayKey(`${year}-${month}-${day}`);
        }
    }, [currentMonth]);

    const handleOccurrenceLongPress = (occ) => {
        const options = ["Edit Chore", "Delete", "Cancel"];
        const cancelButtonIndex = 2;
        const destructiveButtonIndex = 1;

        showActionSheetWithOptions({
            options,
            cancelButtonIndex,
            destructiveButtonIndex,
            title: occ.chore.name,
        }, buttonIndex => {
                if (buttonIndex === 0){
                    navigation.navigate("EditChore", { house, occurrence: occ });
                } else if( buttonIndex=== 1){
                    handleDeleteOccurrence(occ);
                }
            });
    };

    const getDueTime = (occ) => new Date(occ.due_date).getTime();

    const orderedOccurrences = useMemo(() => {
        if (!displayDay) return [];

        const uncompleted = displayDay
        .filter(occ => !occ.completed)
        .sort((a, b) => getDueTime(a) - getDueTime(b));

        const completed = displayDay
        .filter(occ => occ.completed)
        .sort((a, b) => getDueTime(a) - getDueTime(b));

        return [...uncompleted, ...completed];
    }, [displayDay]);

    const onGrantRef = useRef(null);
    const onMoveRef = useRef(null);
    const onReleaseRef = useRef(null);

    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, g) =>
                Math.abs(g.dy) > 10 &&
                Math.abs(g.dy) > Math.abs(g.dx),

            onPanResponderGrant: (_, g) => {
                onGrantRef.current?.(g);
            },

            onPanResponderMove: (_, g) => {
                onMoveRef.current?.(g);
            },

            onPanResponderRelease: (_, g) => {
                onReleaseRef.current?.(g);
            },
        })
    ).current;

    const toggleExpanded = (occId) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedOccId(prev => (prev === occId ? null : occId));
    };

    const handleTest = async () => {
        const data = { 
            "name": "chore_name",
            "description": "chore_description",
            "color": "#aabbcc",
            "schedule": {
                "start_date": "2026-03-30T12:30",
                "repeat_unit": "day",
                "repeat_interval": 1,
                "assignment": {
                    "rule_type": "fixed",
                    "rotation_offset": 0,
                    "rotation_members": [{
                        "user": 32,
                        "position": 0
                    }]
                }
            }
        }
        const res = await api.post("chore/create/37/", data);
        console.log(res.data);
    };

    return (
        <View 
            {...panResponder.panHandlers}
            style={styles.container}
        >

            <View style={styles.calendarContainer}>
                <MonthCalendar
                    occurrences={filteredOccurrences}
                    selectedDay={displayDayKey}
                    onDayPress={setDisplayDayKey}
                    currentMonth={currentMonth}
                    onPrevMonth={goToPrevMonth}
                    onNextMonth={goToNextMonth}
                    onGrant={(fn) => { onGrantRef.current = fn; }}
                    onMove={(fn) => { onMoveRef.current = fn; }}
                    onRelease={(fn) => { onReleaseRef.current = fn; }}
                />
            </View>

            <View style={styles.choreView}>
                <View style={styles.filterRow}>
                    <AppText style={styles.choreViewTitle}>
                        {new Date(displayDayKey).toLocaleString("en-GB", {
                            day: "2-digit",
                            month: "short",
                        })}
                    </AppText>

                    <View style={styles.filterRowRight}>
                        <Pressable
                            onPress={() => setChoreFilter("all")}
                            style={[
                                styles.filterPill,
                                choreFilter === "all" && styles.filterPillActive,
                            ]}
                        >
                            <AppText
                                style={[
                                    styles.filterText,
                                    choreFilter === "all" && styles.filterTextActive,
                                ]}
                            >
                                All
                            </AppText>
                        </Pressable>

                        <Pressable
                            onPress={() => setChoreFilter("mine")}
                            style={[
                                styles.filterPill,
                                choreFilter === "mine" && styles.filterPillActive,
                            ]}
                        >
                            <AppText
                                style={[
                                    styles.filterText,
                                    choreFilter === "mine" && styles.filterTextActive,
                                ]}
                            >
                                My chores
                            </AppText>
                        </Pressable>
                    </View>
                </View>
                {orderedOccurrences.map((occ, index) => (
                    <View key={occ.id}>
                        <Pressable
                            onPress={() => toggleExpanded(occ.id)}
                            onLongPress={() => {handleOccurrenceLongPress(occ)}}
                            style={styles.choreDetail}
                        >
                            <View>
                                <View style={styles.row}>
                                    <View 
                                        style={[
                                            styles.choreBar,
                                            {
                                                backgroundColor: occ.chore?.color || DEFAULT_COLOR,
                                                opacity: occ.completed ? 0.4 : 1,
                                            },
                                        ]}
                                    >
                                    </View>
                                    <View style={styles.textColumn}>
                                        <View style={{ 
                                            flexDirection: "row",
                                            alignItems: "center",
                                            gap: spacing.sm,
                                        }}>
                                            <AppText style={styles.choreName}>{occ.chore.name}</AppText>
                                            <AppText>-</AppText>
                                            <AppText>{occ.assigned_user.name}</AppText>
                                        </View>
                                        <AppText style={styles.dateText}>
                                            {new Date(occ.due_date).toLocaleString("en-GB", {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </AppText>
                                    </View>
                                    <CheckBox
                                        onPress={() => handleCheckOccurrence(occ)}
                                        checked={occ.completed}
                                        style={{ marginLeft: "auto" }}
                                    />
                                </View>

                                {expandedOccId === occ.id && (
                                    <AppText style={styles.description}>
                                        {occ.chore.description}
                                    </AppText>
                                )}
                            </View>
                        </Pressable>

                        {/* {index < displayDay.length - 1 && ( */}
                        {/*     <View style={styles.divider} /> */}
                        {/* )} */}
                    </View>
                ))}
            </View>

            <View style={[styles.createBtnView, { marginBottom: insets.bottom }]}>
                <Pressable 
                    style={styles.createBtn}
                    // onPress={() => navigation.navigate("EditChore", { house })}
                    onPress={handleTest}
                >
                    <FontAwesome5
                        name="plus"
                        size={24}
                        color="white"
                    />
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    calendarContainer: {
        padding: spacing.lg,
        backgroundColor: colors.surface,
    },
    choreView: {
        flex: 1,
        padding: spacing.lg,
        gap: spacing.sm,
    },
    choreDetail: {
        padding: spacing.sm,
        paddingRight: spacing.md,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: colors.surface,
        borderRadius: spacing.md,
    },
    divider: {
        height: 1.5,
        backgroundColor: colors.divider,
        marginVertical: 5,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        width: "100%",
    },
    textColumn: {
        flexDirection: "column",
        flexShrink: 1,
    },
    choreName: {
        ...typography.h3,
    },
    dateText: {
        ...typography.small,
        color: colors.textSecondary,
    },
    description: {
        color: "#666",
        ...typography.small,
    },
    choreBar: {
        width: 6,
        height: "80%",
        borderRadius: 3,
        marginRight: spacing.md,
    },
    choreViewTitle: {
        ...typography.h2,
    },
    filterRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    filterRowRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
    },
    filterPill: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 50,
        backgroundColor: colors.surfaceRaised,
        borderWidth: 1,
        borderColor: colors.border,
    },
    filterPillActive: {
        backgroundColor: colors.accentSurface,
        borderColor: colors.accentBorder,
    },
    filterText: {
        color: colors.textSecondary,
        ...typography.small,
    },
    filterTextActive: {
        color: colors.primary,
        fontWeight: "600",
    },
    createBtnView: {
        width: "100%",
        justifyContent: "center",
        alignItems: "center"
    },
    createBtn: {
        backgroundColor: colors.primary,
        borderRadius: 50,
        justifyContent: "center",
        alignItems: "center",
        aspectRatio: 1,
        padding: spacing.md,
    },
});
