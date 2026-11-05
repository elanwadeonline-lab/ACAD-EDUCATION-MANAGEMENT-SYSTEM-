import React from 'react';
import {useLocalSearchParams,useRouter,Redirect,type Href} from 'expo-router';
import {View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {BottomNavigation,type TabName} from '../src/components/common/BottomNavigation';
import {Colors} from '../src/theme/tokens';
import {GuardianScreen} from '../src/screens/GuardianScreens';
import {useGuardianAuth} from '../src/context/GuardianAuthContext';
export default function GuardianDetail(){
  const {screen}=useLocalSearchParams<{screen:string}>(),{user}=useGuardianAuth(),router=useRouter(),insets=useSafeAreaInsets();
  const active:TabName=screen==='attendance'?'Academics':'More';
  const paths:Record<TabName,string>={Home:'home',Academics:'academics',Payments:'payments',More:'more'};
  return user?<View style={{flex:1}}><GuardianScreen screen={screen||'home'}/><View style={{paddingBottom:insets.bottom,backgroundColor:Colors.card}}><BottomNavigation activeTab={active} onTabPress={tab=>router.replace(`/(main)/${paths[tab]}` as Href)}/></View></View>:<Redirect href={'/' as Href}/>;
}
