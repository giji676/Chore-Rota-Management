import React, { useState, useMemo, useRef } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
} from "react-native";
import InfiniteScroller from "../InfiniteScroller";

export default function DayPicker({ onCancel, onSave, selectedDate, setSelectedDate }) {
    const todaysDate = new Date();

    const selectedYear = selectedDate.getFullYear();
    const selectedMonth = selectedDate.getMonth();
    const selectedDay = selectedDate.getDate();
    const selectedMonthStr = selectedDate.toLocaleString("default", { month: "long" });

    const [scrollView, setScrollView] = useState(false);
    const scrollY = useRef(new Animated.Value(0)).current;

    const monthDays = useMemo(() => {
        const firstDate = new Date(selectedYear, selectedMonth, 1);
        const lastDate = new Date(selectedYear, selectedMonth + 1, 0);

        let days = [];
        let startDay = firstDate.getDay();
        if (startDay === 0) startDay = 7;
        const emptyBefore = startDay - 1;

        for (let i = 0; i < emptyBefore; i++) days.push(null);
        for (let d = 1; d <= lastDate.getDate(); d++) {
            days.push(new Date(selectedYear, selectedMonth, d));
        }
        return days;
    }, [selectedYear, selectedMonth]);

    const rows = [];
    for (let i = 0; i < monthDays.length; i += 7) {
        rows.push(monthDays.slice(i, i + 7));
    }

    const handleViewToggle = () => setScrollView(prev => !prev);

    const currentYear = todaysDate.getFullYear();
    const startYear = currentYear - 100;
    const endYear = currentYear + 100;

    const yearsArray = Array.from(
        { length: endYear - startYear + 1 },
        (_, i) => startYear + i
    );
    const monthsArray = [
        "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
        "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
    ];
    const daysArray = Array.from({ length: 31 }, (_, i) => i + 1);

    return (
        <View style={styles.overlay}>
            <View style={styles.modal}>
                {/* Title */}
                <TouchableOpacity style={styles.titleRow} onPress={handleViewToggle}>
                    <Text style={styles.title}>{selectedMonthStr} {selectedYear}</Text>
                </TouchableOpacity>

                <View style={styles.div}/>

                {/* Body */}
                <View style={styles.body}>
                    {scrollView ? (
                        <View style={{flexDirection: "row", justifyContent: "space-between"}}>
                            <InfiniteScroller
                                inputArray={daysArray}
                                initialIndex={selectedDay - 1}
                                visibleCount={3}
                                onItemChange={(day) => {
                                    setSelectedDate(prev => new Date(
                                        prev.getFullYear(),
                                        prev.getMonth(),
                                        day,
                                        prev.getHours(),
                                        prev.getMinutes()
                                    ));
                                }}
                            />
                            <InfiniteScroller
                                inputArray={monthsArray}
                                initialIndex={selectedMonth}
                                visibleCount={3}
                                onItemChange={(_, index) => {
                                    setSelectedDate(prev => new Date(
                                        prev.getFullYear(),
                                        index,
                                        prev.getDate(),
                                        prev.getHours(),
                                        prev.getMinutes()
                                    ));
                                }}
                            />
                            <InfiniteScroller
                                inputArray={yearsArray}
                                initialIndex={yearsArray.indexOf(selectedYear)}
                                visibleCount={3}
                                onItemChange={(year) => {
                                    setSelectedDate(prev => new Date(
                                        year,
                                        prev.getMonth(),
                                        prev.getDate(),
                                        prev.getHours(),
                                        prev.getMinutes()
                                    ));
                                }}
                            />
                        </View>
                    ) : (
                            rows.map((week, rowIndex) => (
                                <View key={rowIndex} style={styles.weekRow}>
                                    {week.map((date, col) => {
                                        if (!date) return <View key={col} style={styles.dayCell} />;
                                        const key = date.toISOString().split("T")[0];
                                        const isSelected = date.getDate() === selectedDay;
                                        const isToday = key === todaysDate.toISOString().split("T")[0];

                                        return (
                                            <TouchableOpacity
                                                key={key}
                                                onPress={() => setSelectedDate(prev => new Date(
                                                    prev.getFullYear(),
                                                    prev.getMonth(),
                                                    date.getDate(),
                                                    prev.getHours(),
                                                    prev.getMinutes()
                                                ))}
                                                style={styles.dayCell}
                                            >
                                                <Text style={[
                                                    styles.dayText,
                                                    isSelected && styles.selectedCell,
                                                    isToday && styles.todaysCell
                                                ]}>
                                                    {date.getDate()}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            ))
                        )}
                </View>

                <View style={styles.div}/>

                {/* Footer */}
                <View style={styles.footerButtons}>
                    <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onCancel}>
                        <Text style={styles.buttonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={onSave}>
                        <Text style={styles.buttonText}>Done</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}
const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    modal: {
        width: "80%",
        maxWidth: 400,
        flexShrink: 0,
        backgroundColor: "#fff",
        borderRadius: 12,
    },
    titleRow: {
        flexDirection: "row",
        alignItems: "center",
        width: "100%",
        padding: 6,
        paddingVertical: 12,
    },
    title: {
        flex: 1,
        fontSize: 20,
        fontWeight: "bold",
        textAlign: "center",
    },
    body: {
        padding: 5,
    },
    weekRow: {
        flexDirection: "row",
    },
    dayCell: {
        padding: 3,
        width: `${100 / 7}%`,
        alignItems: "center",
        justifyContent: "center",
    },
    dayText: {
        padding: 5,
        aspectRatio: 1,
        borderWidth: 1,
        borderColor: "transparent",
        borderRadius: 50,
        textAlign: "center",
    },
    todaysCell: {
        backgroundColor: "#999",
        color: "#fff",
    },
    selectedCell: {
        borderColor: "#444",
    },
    footerButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 10,
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: "center",
        marginHorizontal: 5,
    },
    cancelButton: {
    },
    saveButton: {
    },
    buttonText: {
        fontSize: 18,
        color: "#444",
        fontWeight: "bold",
    },
    div: {
        height: StyleSheet.hairlineWidth,
        alignSelf: "stretch",
        backgroundColor: "#aaa",
        marginHorizontal: 10,
    },
});
