import React from "react";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GuardianAuthProvider } from "../src/context/GuardianAuthContext";
import { ActiveWardProvider } from "../src/context/ActiveWardContext";
import { ChildSwitcherModal } from "../src/components/common/ChildSwitcherModal";
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {BottomSheetModalProvider} from '@gorhom/bottom-sheet';
import {Colors} from '../src/theme/tokens';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{flex:1,backgroundColor:Colors.canvas}}><SafeAreaProvider>
      <GuardianAuthProvider>
        <ActiveWardProvider>
          <BottomSheetModalProvider><Stack screenOptions={{ headerShown: false,contentStyle:{backgroundColor:Colors.canvas},animation:'slide_from_right' }} />
          <ChildSwitcherModal />
          </BottomSheetModalProvider>
        </ActiveWardProvider>
      </GuardianAuthProvider>
    </SafeAreaProvider></GestureHandlerRootView>
  );
}

