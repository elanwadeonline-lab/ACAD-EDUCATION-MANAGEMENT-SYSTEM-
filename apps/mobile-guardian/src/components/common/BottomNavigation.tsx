import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import {
  SolidHome,
  SolidGraduationCap,
  SolidWallet,
  SolidGrid,
} from "./SolidIcons";
import { Colors } from "../../theme/tokens";

export type TabName = "Home" | "Academics" | "Payments" | "More";

interface BottomNavigationProps {
  activeTab: TabName;
  onTabPress: (tab: TabName) => void;
}

export function BottomNavigation({ activeTab, onTabPress }: BottomNavigationProps) {
  const tabs = [
    {
      name: "Home" as TabName,
      label: "Home",
      renderIcon: () => (
        <SolidHome
          size={22}
          color="#000000"
          secondaryColor="#000000"
        />
      ),
    },
    {
      name: "Academics" as TabName,
      label: "Academics",
      renderIcon: () => (
        <SolidGraduationCap
          size={22}
          color="#000000"
          secondaryColor="#000000"
        />
      ),
    },
    {
      name: "Payments" as TabName,
      label: "Payments",
      renderIcon: () => (
        <SolidWallet
          size={22}
          color="#000000"
          secondaryColor="#000000"
        />
      ),
    },
    {
      name: "More" as TabName,
      label: "More",
      renderIcon: () => (
        <SolidGrid
          size={22}
          color="#000000"
          secondaryColor="#000000"
        />
      ),
    },
  ];

  return (
    <View style={styles.tabBar}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.name;

        return (
          <TouchableOpacity
            key={tab.name}
            activeOpacity={0.75}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: isActive }}
            onPress={() => onTabPress(tab.name)}
            style={[styles.tabItem, !isActive && styles.tabItemInactive]}
          >
            {tab.renderIcon()}
            <Text style={styles.tabLabel}>
              {tab.label}
            </Text>
            {isActive && <View style={styles.activeDot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const MANROPE_MEDIUM =
  Platform.OS === 'web' ? 'Manrope_500Medium, Manrope, sans-serif' : 'Manrope_500Medium';

const styles = StyleSheet.create({
  tabBar: {
    height: 64,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingBottom: 4,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 8,
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 -4px 16px -2px rgba(15, 23, 42, 0.05)',
        }
      : {}),
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    flex: 1,
    paddingVertical: 6,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : {}),
  },
  tabItemInactive: {
    opacity: 0.5,
  },
  tabLabel: {
    fontSize: 11,
    letterSpacing: -0.1,
    color: "#000000",
    fontWeight: "500",
    fontFamily: MANROPE_MEDIUM,
  },
  activeDot: {
    width: 14,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: "#000000",
    marginTop: 1,
  },
});

