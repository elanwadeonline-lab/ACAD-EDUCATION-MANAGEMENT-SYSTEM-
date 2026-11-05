import React from 'react';
import {Tabs,Redirect,type Href} from 'expo-router';
import {View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {BottomNavigation,type TabName} from '../../src/components/common/BottomNavigation';
import {useGuardianAuth} from '../../src/context/GuardianAuthContext';
import {Colors} from '../../src/theme/tokens';
const names=['home','academics','payments','more'];
const labels:TabName[]=['Home','Academics','Payments','More'];
export default function GuardianTabs(){const {user}=useGuardianAuth(),insets=useSafeAreaInsets();if(!user)return <Redirect href={'/' as Href}/>;
  return <Tabs screenOptions={{headerShown:false}} tabBar={({state,navigation})=><View style={{paddingBottom:insets.bottom,backgroundColor:Colors.card}}><BottomNavigation activeTab={labels[state.index]} onTabPress={label=>navigation.navigate(names[labels.indexOf(label)])}/></View>}><Tabs.Screen name="home"/><Tabs.Screen name="academics"/><Tabs.Screen name="payments"/><Tabs.Screen name="more"/></Tabs>;
}
