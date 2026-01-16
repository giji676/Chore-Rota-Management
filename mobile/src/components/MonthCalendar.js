import React, { useState, useEffect, useMemo, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    PanResponder,
    Animated,
    Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { jsonLog } from "../utils/loggers";
import { colors, spacing, typography } from "../theme";
import AppText from "../components/AppText";
import AppButton from "../components/AppButton";

const DEFAULT_COLOR = "#3498db";
const SWIPE_THRESHOLD = 50;

export default function MonthCalendar({
    occurrences,
    selectedDay,
    onDayPress,
    currentMonth,
    onPrevMonth,
    onNextMonth,
    collapseProgress,
}) {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const monthYearLabel = currentMonth.toLocaleString("default", {
        month: "long",
        year: "numeric",
    });
    const currentDate = new Date().getDate();

    /* HORIZONTAL SWIPE HANDLER */
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onStartShouldSetPanResponderCapture: () => false,

            onMoveShouldSetPanResponder: (_, gesture) =>
                Math.abs(gesture.dx) > 10 &&
                    Math.abs(gesture.dx) > Math.abs(gesture.dy),

            onPanResponderRelease: (_, gesture) => {
                if (gesture.dx > SWIPE_THRESHOLD) {
                    onPrevMonth();
                } else if (gesture.dx < -SWIPE_THRESHOLD) {
                    onNextMonth();
                }
            },
        })
    ).current;

    /* MONTH DAYS */
    const monthDays = useMemo(() => {
        let days = [];
        const first = new Date(year, month, 1);
        const last = new Date(year, month + 1, 0);

        let startDay = first.getDay();
        if (startDay === 0) startDay = 7;
        const emptyBefore = startDay - 1;

        for (let i = 0; i < emptyBefore; i++) days.push(null);
        for (let d = 1; d <= last.getDate(); d++) {
            days.push(new Date(year, month, d));
        }

        return days;
    }, [year, month]);

    /*  OCCURRENCES MAP  */
    const occByDate = useMemo(() => {
        const map = {};
        if (!occurrences) return {};
        occurrences.forEach((occ) => {
            const d = new Date(occ.due_date);
            if (d.getMonth() !== month || d.getFullYear() !== year) return;
            const key = d.toISOString().split("T")[0];
            if (!map[key]) map[key] = [];
            map[key].push(occ);
        });
        return map;
    }, [occurrences, month, year]);

    const rows = [];
    for (let i = 0; i < monthDays.length; i += 7) {
        rows.push(monthDays.slice(i, i + 7));
    }

    /* VERTICAL SWIPE HANDLER */
    const selectedRowIndex = useMemo(() => {
        return rows.findIndex(week =>
            week.some(
                date => date && date.toISOString().split("T")[0] === selectedDay
            )
        );
    }, [rows, selectedDay]);

    const [measured, setMeasured] = useState(false);
    const rowHeightsRef = useRef({});
    const translateY = useRef(new Animated.Value(0)).current;

    const selectedRowIndexRef = useRef(selectedRowIndex);

    useEffect(() => {
        selectedRowIndexRef.current = selectedRowIndex;
    }, [selectedRowIndex]);

    const originalCalendarHeight = () => {
        let totalHeight = 0;
        for (let i = 0; i < rows.length; i++) {
            totalHeight += rowHeightsRef.current[i] || 0;
        }
        return totalHeight;
    };

    const verticalShrink = useRef(new Animated.Value(originalCalendarHeight())).current;

    useEffect(() => {
        if (Object.keys(rowHeightsRef.current).length === rows.length) {
            const totalHeight = Object.values(rowHeightsRef.current).reduce((sum, h) => sum + h, 0);
            verticalShrink.setValue(totalHeight); // initialize Animated.Value now
            setMeasured(true); // flag that layout is ready
        }
    }, [rows]);

    // TODO: If row index changes, manually set collapse progress so the multiplied offset isn't 0
    // TODO: When swiping up (collapsing) slowly,
    // shrink seems to get to the target before the translate does, causing a jump. Fix timing.
    useEffect(() => {
        if (!measured) return; 
        const id = collapseProgress.addListener(({ value }) => {
            let offset = 0;
            let shrinkToValue = shrinkToValue = originalCalendarHeight();
            if (value > 0) {
                for (let i = 0; i < selectedRowIndexRef.current; i++) {
                    offset += rowHeightsRef.current[i] || 0;
                }
                offset *= -1 * value;
                offset = Math.min(0, offset);
                shrinkToValue = rowHeightsRef.current[selectedRowIndexRef.current] * value || 0;
            }

            Animated.parallel([
                Animated.timing(translateY, {
                    toValue: offset,
                    duration: 250,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(verticalShrink, {
                    toValue: shrinkToValue,
                    duration: 250,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: false,
                }),
            ]).start();
        });

        return () => collapseProgress.removeListener(id);
    }, [measured]);

    return (
        <View>
            {/* HEADER */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.arrow} onPress={onPrevMonth}>
                    <Ionicons name="chevron-back" size={28} color={colors.textPrimary}/>
                </TouchableOpacity>

                <AppText style={styles.monthHeader}>{monthYearLabel}</AppText>

                <TouchableOpacity style={styles.arrow} onPress={onNextMonth}>
                    <Ionicons name="chevron-forward" size={28} color={colors.textPrimary}/>
                </TouchableOpacity>
            </View>
            <Animated.View
                style={{
                    height: measured ? verticalShrink : undefined,
                    overflow: "hidden",
                }}
            >
                <Animated.View
                    {...panResponder.panHandlers}
                    style={{ transform: [{ translateY }] }}
                >
                    {rows.map((week, rowIndex) => (
                        <View
                            key={rowIndex}
                            style={styles.weekRow}
                            onLayout={(e) => {
                                rowHeightsRef.current[rowIndex] = e.nativeEvent.layout.height;
                            }}
                        >
                            {week.map((date, colIndex) => {
                                if (!date) return <View key={colIndex} style={styles.dayCell} />;

                                const key = date.toISOString().split("T")[0];
                                const occs = occByDate[key] || [];
                                const isSelected = key === selectedDay;
                                const isToday = key === new Date().toISOString().split("T")[0];

                                return (
                                    <TouchableOpacity
                                        key={key}
                                        style={[
                                            styles.dayCell,
                                            isSelected && styles.dayCellSelected,
                                        ]}
                                        onPress={() => onDayPress(key)}
                                    >
                                        <AppText
                                            style={[
                                                styles.dateNumber,
                                                isToday && styles.todaysCell,
                                            ]}
                                        >
                                            {date.getDate()}
                                        </AppText>

                                        {occs.map((occ) => (
                                            <View
                                                key={occ.id}
                                                style={[
                                                    styles.choreBar,
                                                    {
                                                        backgroundColor: occ.chore?.color || DEFAULT_COLOR,
                                                        opacity: occ.completed ? 0.4 : 1,
                                                    },
                                                ]}
                                            />
                                        ))}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    ))}
                </Animated.View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: "row",
        alignItems: "center",
        width: "100%",
        paddingHorizontal: 10,
        marginBottom: 8,
    },
    arrow: {
        width: 40,
        alignItems: "center",
    },
    monthHeader: {
        flex: 1,
        textAlign: "center",
        fontSize: 20,
        fontWeight: "bold",
    },
    weekRow: {
        flexDirection: "row",
    },
    dayHeader: {
        flex: 1,
        textAlign: "center",
        fontWeight: "bold",
        marginBottom: 5,
    },
    dayCell: {
        width: `${100 / 7}%`,
        minHeight: 36,
        padding: 4,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "transparent",
    },
    dayCellSelected: {
        borderColor: colors.border,
        backgroundColor: colors.surfaceRaised,
        borderRadius: 6,
    },
    dateNumber: {
        fontWeight: "600",
        marginBottom: 4,
    },
    choreBar: {
        width: "100%",
        height: 6,
        borderRadius: 3,
        marginVertical: 2,
    },
    todaysCell: {
        backgroundColor: "#666",
        color: "#fff",
        borderRadius: 4,
        paddingHorizontal: 3,
    },
});
