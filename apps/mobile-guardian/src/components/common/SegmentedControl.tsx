import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Colors, Spacing, Radii } from "../../theme/tokens";

interface SegmentedControlProps {
  options: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
}

export function SegmentedControl({
  options,
  selectedIndex,
  onChange,
}: SegmentedControlProps) {
  return (
    <View style={styles.container}>
      {options.map((option, index) => {
        const isSelected = selectedIndex === index;
        return (
          <TouchableOpacity
            key={option}
            activeOpacity={0.8}
            accessibilityRole="tab"
            accessibilityState={{selected:isSelected}}
            onPress={() => onChange(index)}
            style={[styles.tab, isSelected && styles.tabActive]}
          >
            <Text style={[styles.tabText, isSelected && styles.tabTextActive]}>
              {option}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "rgba(230, 230, 233, 0.65)",
    borderRadius: Radii.pill,
    padding: 3,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radii.pill,
  },
  tabActive: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.slate,
  },
  tabTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});

