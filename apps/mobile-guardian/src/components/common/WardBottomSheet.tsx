import React,{useEffect,useMemo,useRef} from 'react';
import {View,Text,Pressable} from 'react-native';
import {useRouter,type Href} from 'expo-router';
import {BottomSheetModal,BottomSheetBackdrop,BottomSheetScrollView} from '@gorhom/bottom-sheet';
import {Circle,CheckCircle2,X,Users} from 'lucide-react-native';
import {useActiveWard} from '../../context/ActiveWardContext';
import {Avatar,Button,Feedback,BaseEmptyState,ui} from './NativeUI';
import {Colors as C} from '../../theme/tokens';

export function ChildSwitcherModal(){
  const {wards,activeWard,isSwitcherOpen,closeSwitcher,isLoadingWards,error,setActiveWard,refreshWards}=useActiveWard(),router=useRouter();
  const sheet=useRef<BottomSheetModal>(null),points=useMemo(()=>['65%'],[]);
  useEffect(()=>{if(isSwitcherOpen)sheet.current?.present();else sheet.current?.dismiss();},[isSwitcherOpen]);
  return <BottomSheetModal ref={sheet} snapPoints={points} enableDynamicSizing={false} enablePanDownToClose onDismiss={closeSwitcher} backgroundStyle={{backgroundColor:C.card}} handleIndicatorStyle={{backgroundColor:C.cardBorder,width:40}} backdropComponent={props=><BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close"/>}>
    <BottomSheetScrollView contentContainerStyle={{padding:20,paddingBottom:38,gap:12}}><View style={{flexDirection:'row',alignItems:'center'}}><Text accessibilityRole="header" style={{fontSize:19,fontWeight:'700',color:C.ink,flex:1}}>Your children</Text><Pressable style={ui.iconButton} accessibilityRole="button" accessibilityLabel="Close child selector" onPress={closeSwitcher}><X size={22} color={C.ink}/></Pressable></View><Text style={ui.small}>Choose a child. Their records follow your selection.</Text><Feedback loading={isLoadingWards} error={error} onRetry={()=>void refreshWards()}/>
      {wards.map(w=><Pressable key={w.id} accessibilityRole="radio" accessibilityState={{checked:activeWard?.id===w.id}} onPress={()=>setActiveWard(w)} style={[ui.row,{borderRadius:16,paddingHorizontal:12,backgroundColor:activeWard?.id===w.id?'rgba(245, 158, 11, 0.14)':C.canvas,borderWidth:0,borderColor:'transparent'}]}><Avatar name={w.name} uri={w.image_url} size={48}/><View style={{flex:1,gap:5}}><Text style={ui.rowTitle}>{w.name}</Text><Text style={ui.small}>{w.grade||'Class not recorded'}{w.school_name?` · ${w.school_name}`:''}</Text></View>{activeWard?.id===w.id?<CheckCircle2 size={23} color="#F59E0B"/>:<Circle size={23} color={C.muted}/>}</Pressable>)}
      {!wards.length&&!isLoadingWards&&!error&&<BaseEmptyState icon={<Users size={26} color={C.primary}/>} title="No approved child links yet" description="Request a child link using your child’s school registration number."/>}<Button label="+ Link another child" quiet onPress={()=>{closeSwitcher();router.push('/link' as Href);}}/>
    </BottomSheetScrollView>
  </BottomSheetModal>;
}
