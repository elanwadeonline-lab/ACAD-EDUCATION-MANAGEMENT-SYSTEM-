import React,{useEffect,useState,useCallback} from 'react';
import {Text,Pressable,StyleSheet,ScrollView,RefreshControl,type TextInputProps} from 'react-native';
import {Box as View} from '../ui/box';
import {Button as GluestackButton,ButtonText} from '../ui/button';
import {Avatar as GluestackAvatar,AvatarFallbackText,AvatarImage} from '../ui/avatar';
import {Badge,BadgeText} from '../ui/badge';
import {Input,InputField} from '../ui/input';
import {Link,LinkText} from '../ui/link';
import {Toast,ToastTitle,useToast} from '../ui/toast';
export {Card} from '../ui/card';
import {SafeAreaView} from 'react-native-safe-area-context';
import {AlertCircle,ChevronLeft,ChevronRight,Inbox,RefreshCw} from 'lucide-react-native';
import {Colors as C} from '../../theme/tokens';
import {API_BASE_URL,requestData} from '../../api/client';
import {BaseSkeleton} from '../base-skeleton';
import {BaseHeader} from '../base-header';
import {BaseListRow} from '../base-list-row';
import {BaseEmptyState} from '../base-empty-state';
import {BaseAlert} from '../base-alert';
export {BaseEmptyState} from '../base-empty-state';
export {BaseAlert} from '../base-alert';
export {BaseSeparator} from '../base-separator';
export {BaseSlidingNumber} from '../base-sliding-number';
export {BaseSelect} from '../base-select';
export {BaseDialog} from '../base-dialog';
export {BaseToggleGroup} from '../base-toggle-group';

export function useRemote<T>(path:string|null,identity:string|number=''){
  const [data,setData]=useState<T|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(!!path),[revision,setRevision]=useState(0);
  useEffect(()=>{let active=true;const controller=new AbortController();setData(null);setError('');setLoading(!!path);
    if(path)void requestData<T>(path,{signal:controller.signal}).then(v=>{if(active)setData(v);}).catch(e=>{if(active)setError(e.message||'Could not load records.');}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;controller.abort();};
  },[path,identity,revision]);
  return {data,error,loading,reload:useCallback(()=>setRevision(n=>n+1),[])};
}
export function Button({label,onPress,disabled=false,quiet=false}:{label:string;onPress:()=>void;disabled?:boolean;quiet?:boolean}){
  return <GluestackButton accessibilityLabel={label} isDisabled={disabled} variant={quiet?'outline':'default'} onPress={onPress} style={[ui.button,quiet&&ui.quiet]}><ButtonText style={[ui.buttonText,quiet&&{color:C.primary}]}>{label}</ButtonText></GluestackButton>;
}
export function SchoolInput({style,...props}:TextInputProps){return <Input isDisabled={props.editable===false} style={{borderRadius:12,minHeight:48,backgroundColor:C.card,borderColor:C.cardBorder}}><InputField {...props} style={[{fontSize:16,color:C.ink,fontFamily:'Geist_400Regular',minHeight:46},style,{borderWidth:0,backgroundColor:'transparent'}]}/></Input>;}
export function useNotice(){
  const toast=useToast();
  return (message:string)=>toast.show({placement:'top',duration:3000,render:({id})=><Toast nativeID={`guardian-toast-${id}`} action="success" style={{margin:16,borderRadius:14,backgroundColor:C.card,borderColor:C.cardBorder,borderWidth:1,padding:16}}><ToastTitle style={{color:C.ink,fontFamily:'Geist_500Medium',fontSize:14}}>{message}</ToastTitle></Toast>});
}
export function Feedback({loading,error,onRetry,empty,emptyTitle='No records available',emptyIcon}:{loading?:boolean;error?:string;onRetry?:()=>void;empty?:string;emptyTitle?:string;emptyIcon?:React.ReactNode}){
  if(loading)return <View style={{gap:12,paddingVertical:16}} accessibilityLiveRegion="polite" accessibilityLabel="Loading school records"><BaseSkeleton width="72%" height={18}/><BaseSkeleton width="100%" height={64} radius={14}/><BaseSkeleton width="88%" height={16}/><Text style={ui.small}>Loading school records…</Text></View>;
  if(error)return <BaseAlert variant="destructive" icon={<AlertCircle size={18} color={C.danger}/>} title="Unable to load school records" description={error} action={onRetry?<Button label="Try again" onPress={onRetry} quiet/>:undefined}/>;
  return empty?<BaseEmptyState icon={emptyIcon||<Inbox size={26} color={C.primary}/>} title={emptyTitle} description={empty}/>:null;
}
export function Page({title,children,onBack,right,refreshing,onRefresh}:{title?:string;children:React.ReactNode;onBack?:()=>void;right?:React.ReactNode;refreshing?:boolean;onRefresh?:()=>void}){
  return <SafeAreaView edges={['top','left','right']} style={ui.safe}>{title&&<BaseHeader title={title} onBack={onBack} actions={right} align="left"/>}<ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={ui.content} refreshControl={onRefresh?<RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={C.primary}/>:undefined}>{children}</ScrollView></SafeAreaView>;
}
export function Section({title,action,onPress}:{title:string;action?:string;onPress?:()=>void}){return <View style={ui.section}><Text style={ui.sectionTitle}>{title}</Text>{action&&<Link onPress={onPress} accessibilityLabel={action} style={{minHeight:44,justifyContent:'center'}}><LinkText style={ui.actionText}>{action}</LinkText></Link>}</View>;}
export function Avatar({name,uri,size=44}:{name:string;uri?:string;size?:number}){
  const [failed,setFailed]=useState(false);useEffect(()=>setFailed(false),[uri]);
  const url=uri&&(uri.startsWith('/')?API_BASE_URL+uri:uri);
  return <GluestackAvatar accessibilityLabel={name} style={[ui.avatar,{width:size,height:size,borderRadius:size/2}]}><AvatarFallbackText style={{color:C.primary,fontWeight:'700',fontSize:size*.32}}>{name}</AvatarFallbackText>{url&&!failed&&<AvatarImage source={{uri:url}} accessibilityLabel={`${name} profile photograph`} onError={()=>setFailed(true)} style={{width:size,height:size,borderRadius:size/2}}/>}</GluestackAvatar>;
}
export function Row({title,detail,icon,onPress,right}:{title:string;detail?:string;icon?:React.ReactNode;onPress?:()=>void;right?:React.ReactNode}){
  return <BaseListRow title={title} description={detail} leading={icon?<View style={ui.rowIcon}>{icon}</View>:undefined} trailing={<View style={{flexDirection:'row',alignItems:'center',gap:8}}>{right}{onPress&&<ChevronRight size={17} color={C.muted}/>}</View>} onPress={onPress} style={{borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:C.divider,paddingHorizontal:0,minHeight:68}}/>;
}
export function Pill({text,positive=false}:{text:string;positive?:boolean}){return <Badge variant="secondary" style={[ui.pill,positive&&{backgroundColor:C.successBg}]}><BadgeText className="normal-case" style={{fontSize:12,fontWeight:'600',color:positive?C.success:C.primary}}>{text}</BadgeText></Badge>;}
export const ui=StyleSheet.create({
  safe:{flex:1,backgroundColor:C.canvas},content:{paddingHorizontal:20,paddingTop:12,paddingBottom:28,gap:16},header:{minHeight:54,paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:4},pageTitle:{fontSize:19,fontWeight:'700',color:C.ink,flex:1,letterSpacing:-.4},iconButton:{width:44,height:44,alignItems:'center',justifyContent:'center'},
  button:{backgroundColor:C.primary,borderRadius:24,minHeight:46,paddingVertical:12,paddingHorizontal:20,alignItems:'center',justifyContent:'center'},buttonText:{color:'#fff',fontSize:14,fontWeight:'700'},quiet:{backgroundColor:C.primaryLight,borderWidth:1,borderColor:C.primaryTint},
  feedback:{paddingVertical:28,gap:14,alignItems:'center'},muted:{fontSize:13,color:C.muted,lineHeight:20},small:{fontSize:11,color:C.muted,lineHeight:17},section:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',minHeight:28},sectionTitle:{fontSize:15,fontWeight:'700',color:C.ink,letterSpacing:-.3},actionText:{fontSize:12,color:C.primary,fontWeight:'600'},
  card:{backgroundColor:C.card,borderRadius:16,padding:16,borderWidth:1,borderColor:C.cardBorder,gap:12},row:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:14,minHeight:64,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:C.divider},rowTitle:{fontSize:13,fontWeight:'600',color:C.ink},rowIcon:{width:38,height:38,borderRadius:12,backgroundColor:C.primaryLight,alignItems:'center',justifyContent:'center'},avatar:{backgroundColor:C.primaryTint,alignItems:'center',justifyContent:'center',overflow:'hidden'},pill:{alignSelf:'flex-start',borderRadius:20,paddingVertical:5,paddingHorizontal:9,backgroundColor:C.primaryTint},
  input:{minHeight:46,borderWidth:1,borderColor:C.cardBorder,borderRadius:12,paddingHorizontal:14,paddingVertical:10,backgroundColor:C.card,color:C.ink,fontSize:16},metric:{fontSize:32,fontWeight:'700',color:C.ink,letterSpacing:-1},label:{fontSize:12,color:C.muted},divider:{height:1,backgroundColor:C.divider},
});
