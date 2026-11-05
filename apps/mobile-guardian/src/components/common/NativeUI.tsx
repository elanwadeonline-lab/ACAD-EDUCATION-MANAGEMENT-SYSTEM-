import React,{useEffect,useState,useCallback} from 'react';
import {View,Text,Pressable,StyleSheet,ScrollView,ActivityIndicator,Image,RefreshControl} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {ChevronLeft,ChevronRight,RefreshCw} from 'lucide-react-native';
import {Colors as C} from '../../theme/tokens';
import {API_BASE_URL,requestData} from '../../api/client';

export function useRemote<T>(path:string|null,identity:string|number=''){
  const [data,setData]=useState<T|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(!!path),[revision,setRevision]=useState(0);
  useEffect(()=>{let active=true;const controller=new AbortController();setData(null);setError('');setLoading(!!path);
    if(path)void requestData<T>(path,{signal:controller.signal}).then(v=>{if(active)setData(v);}).catch(e=>{if(active)setError(e.message||'Could not load records.');}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;controller.abort();};
  },[path,identity,revision]);
  return {data,error,loading,reload:useCallback(()=>setRevision(n=>n+1),[])};
}
export function Button({label,onPress,disabled=false,quiet=false}:{label:string;onPress:()=>void;disabled?:boolean;quiet?:boolean}){
  return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={({pressed})=>[ui.button,quiet&&ui.quiet,disabled&&{opacity:.45},pressed&&{opacity:.8}]}><Text style={[ui.buttonText,quiet&&{color:C.primary}]}>{label}</Text></Pressable>;
}
export function Feedback({loading,error,onRetry,empty}:{loading?:boolean;error?:string;onRetry?:()=>void;empty?:string}){
  if(loading)return <View style={ui.feedback} accessibilityLiveRegion="polite"><ActivityIndicator color={C.primary}/><Text style={ui.muted}>Loading school records…</Text></View>;
  if(error)return <View style={ui.feedback} accessibilityRole="alert"><Text style={ui.muted}>{error}</Text>{onRetry&&<Button label="Try again" onPress={onRetry} quiet/>}</View>;
  return empty?<View style={ui.feedback}><Text style={ui.muted}>{empty}</Text></View>:null;
}
export function Page({title,children,onBack,right,refreshing,onRefresh}:{title?:string;children:React.ReactNode;onBack?:()=>void;right?:React.ReactNode;refreshing?:boolean;onRefresh?:()=>void}){
  return <SafeAreaView edges={['top','left','right']} style={ui.safe}>{title&&<View style={ui.header}>{onBack&&<Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={ui.iconButton}><ChevronLeft color={C.ink} size={23}/></Pressable>}<Text style={ui.pageTitle}>{title}</Text>{right}</View>}<ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={ui.content} refreshControl={onRefresh?<RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={C.primary}/>:undefined}>{children}</ScrollView></SafeAreaView>;
}
export function Section({title,action,onPress}:{title:string;action?:string;onPress?:()=>void}){return <View style={ui.section}><Text style={ui.sectionTitle}>{title}</Text>{action&&<Pressable onPress={onPress} accessibilityRole="button" style={{paddingVertical:8}}><Text style={ui.actionText}>{action}</Text></Pressable>}</View>;}
export function Avatar({name,uri,size=44}:{name:string;uri?:string;size?:number}){
  const [failed,setFailed]=useState(false);useEffect(()=>setFailed(false),[uri]);
  const url=uri&&(uri.startsWith('/')?API_BASE_URL+uri:uri);
  return <View style={[ui.avatar,{width:size,height:size,borderRadius:size/2}]}>{url&&!failed?<Image source={{uri:url}} accessibilityLabel={`${name} profile photograph`} onError={()=>setFailed(true)} style={{width:size,height:size,borderRadius:size/2}}/>:<Text style={{color:C.primary,fontWeight:'700',fontSize:size*.32}}>{name.trim().split(/\s+/).slice(0,2).map(n=>n[0]).join('')}</Text>}</View>;
}
export function Row({title,detail,icon,onPress,right}:{title:string;detail?:string;icon?:React.ReactNode;onPress?:()=>void;right?:React.ReactNode}){
  const body=<>{icon&&<View style={ui.rowIcon}>{icon}</View>}<View style={{flex:1,gap:4}}><Text style={ui.rowTitle}>{title}</Text>{detail&&<Text style={ui.small}>{detail}</Text>}</View>{right}{onPress&&<ChevronRight size={17} color={C.muted}/>}</>;
  return onPress?<Pressable style={ui.row} onPress={onPress} accessibilityRole="button">{body}</Pressable>:<View style={ui.row}>{body}</View>;
}
export function Pill({text,positive=false}:{text:string;positive?:boolean}){return <View style={[ui.pill,positive&&{backgroundColor:C.successBg}]}><Text style={{fontSize:11,fontWeight:'600',color:positive?C.success:C.primary}}>{text}</Text></View>;}
export const ui=StyleSheet.create({
  safe:{flex:1,backgroundColor:C.canvas},content:{paddingHorizontal:20,paddingTop:12,paddingBottom:28,gap:16},header:{minHeight:54,paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:4},pageTitle:{fontSize:19,fontWeight:'700',color:C.ink,flex:1,letterSpacing:-.4},iconButton:{width:44,height:44,alignItems:'center',justifyContent:'center'},
  button:{backgroundColor:C.primary,borderRadius:24,minHeight:46,paddingVertical:12,paddingHorizontal:20,alignItems:'center',justifyContent:'center'},buttonText:{color:'#fff',fontSize:14,fontWeight:'700'},quiet:{backgroundColor:C.primaryLight,borderWidth:1,borderColor:C.primaryTint},
  feedback:{paddingVertical:28,gap:14,alignItems:'center'},muted:{fontSize:13,color:C.muted,lineHeight:20},small:{fontSize:11,color:C.muted,lineHeight:17},section:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',minHeight:28},sectionTitle:{fontSize:15,fontWeight:'700',color:C.ink,letterSpacing:-.3},actionText:{fontSize:12,color:C.primary,fontWeight:'600'},
  card:{backgroundColor:C.card,borderRadius:16,padding:16,borderWidth:1,borderColor:C.cardBorder,gap:12},row:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:14,minHeight:64,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:C.divider},rowTitle:{fontSize:13,fontWeight:'600',color:C.ink},rowIcon:{width:38,height:38,borderRadius:12,backgroundColor:C.primaryLight,alignItems:'center',justifyContent:'center'},avatar:{backgroundColor:C.primaryTint,alignItems:'center',justifyContent:'center',overflow:'hidden'},pill:{alignSelf:'flex-start',borderRadius:20,paddingVertical:5,paddingHorizontal:9,backgroundColor:C.primaryTint},
  input:{minHeight:46,borderWidth:1,borderColor:C.cardBorder,borderRadius:12,paddingHorizontal:14,paddingVertical:10,backgroundColor:C.card,color:C.ink,fontSize:16},metric:{fontSize:32,fontWeight:'700',color:C.ink,letterSpacing:-1},label:{fontSize:12,color:C.muted},divider:{height:1,backgroundColor:C.divider},
});
