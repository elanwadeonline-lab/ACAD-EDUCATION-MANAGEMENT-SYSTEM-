import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Home, BookOpen, CreditCard, LayoutGrid } from "lucide-react-native";
import { Colors, Spacing } from "../../theme/tokens";

export type TabName = "Home" | "Academics" | "Payments" | "More";

interface BottomNavigationProps {
  activeTab: TabName;
  onTabPress: (tab: TabName) => void;
}

export function BottomNavigation({ activeTab, onTabPress }: BottomNavigationProps) {
  const tabs: Array<{ name: TabName; label: string; icon: any }> = [
    { name: "Home", label: "Home", icon: Home },
    { name: "Academics", label: "Academics", icon: BookOpen },
    { name: "Payments", label: "Payments", icon: CreditCard },
    { name: "More", label: "More", icon: LayoutGrid },
  ];

  return (
    <View style={styles.tabBar}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.name;
        const IconComponent = tab.icon;

        return (
          <TouchableOpacity
            key={tab.name}
            activeOpacity={0.75}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{selected:isActive}}
            onPress={() => onTabPress(tab.name)}
            style={styles.tabItem}
          >
            <IconComponent
              size={22}
              color={isActive ? Colors.primary : Colors.muted}
              strokeWidth={isActive ? 2.4 : 1.8}
            />
            <Text
              style={[
                styles.tabLabel,
                isActive ? styles.tabLabelActive : styles.tabLabelInactive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 64,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
    paddingBottom: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 8,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    flex: 1,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  tabLabelActive: {
    color: Colors.primary,
    fontWeight: "700",
  },
  tabLabelInactive: {
    color: Colors.muted,
  },
});

