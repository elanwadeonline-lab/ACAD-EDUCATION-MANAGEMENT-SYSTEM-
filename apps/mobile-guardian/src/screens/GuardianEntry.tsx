import React,{useState} from 'react';
import {View,Text,Image,StyleSheet,Pressable,Platform,ActivityIndicator} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Redirect,type Href} from 'expo-router';
import {GraduationCap,ShieldCheck} from 'lucide-react-native';
import {BrandLogo} from '../components/common/OfficialMark';
import {Page,Button,ui,SchoolInput as TextInput} from '../components/common/NativeUI';
import {BaseSignInBlock} from '../components/base-sign-in-block';
import {BaseSheet} from '../components/base-sheet';
import {useGuardianAuth} from '../context/GuardianAuthContext';
import {Colors as C} from '../theme/tokens';

export function GuardianEntry(){
  const {user,isLoading,error,signIn,server}=useGuardianAuth();
  const [signing,setSigning]=useState(false),[address,setAddress]=useState(server),[help,setHelp]=useState(false);
  const insets=useSafeAreaInsets(),image=process.env.EXPO_PUBLIC_ONBOARDING_IMAGE_URL;
  if(user)return <Redirect href={'/(main)/home' as Href}/>;
  if(signing)return <><BaseSignInBlock
    copy={{title:'ACQAD Guardian',heading:'Welcome back.',description:'A closer connection to your child’s school day.',email:'Guardian email',emailPlaceholder:'Email or registration identifier',forgot:'Need help signing in?',registerHint:'Accounts and child links are approved by your school.',register:'Contact your school office'}}
    brand={<View style={{paddingVertical:18}}><BrandLogo size={42}/></View>}
    providers={[]} showRemember={false} insets={insets} onBack={()=>setSigning(false)} loading={isLoading} error={error}
    validate={v=>({email:v.email.trim()?undefined:'Enter your school account.',password:v.password?undefined:'Enter your password.'})}
    onSubmit={v=>void signIn(v.email.trim(),v.password,address).catch(()=>{})}
    onForgotPassword={()=>setHelp(true)} onRegister={()=>setHelp(true)}
    formAccessory={(!process.env.EXPO_PUBLIC_API_URL||address)?<View style={{gap:8}}><Text style={ui.label}>School server {Platform.OS==='web'?'(leave blank for this preview)':''}</Text><TextInput accessibilityLabel="School server address" value={address} onChangeText={setAddress} editable={!isLoading} autoCapitalize="none" keyboardType="url" style={ui.input} placeholder="https://your-school.example"/></View>:undefined}
  /><BaseSheet visible={help} onVisibleChange={setHelp} title="Your school can help" bottomInset={insets.bottom} closeLabel="Close sign-in help" footer={<Button label="Back to sign in" onPress={()=>setHelp(false)}/>}><Text style={[ui.muted,{paddingBottom:20}]}>Contact your school office for a guardian account, a password reset or your school’s server address. The school verifies your identity before granting access to student records.</Text></BaseSheet></>;
  return <Page><View style={s.logo}><BrandLogo size={44}/></View><View style={s.hero}>{image?<Image source={{uri:image}} resizeMode="cover" style={StyleSheet.absoluteFill} accessibilityLabel="School-approved family photograph"/>:<View style={s.photoMissing}><GraduationCap size={84} color={C.primary} strokeWidth={1}/><Text style={s.heroCaption}>Connected to their school day.</Text></View>}<View style={s.heroCaptionBox}><Text style={s.eyebrow}>YOUR FAMILY. THEIR FUTURE.</Text><Text style={s.heroTitle}>Be part of your child’s academic journey.</Text><Text style={s.heroText}>Their progress, school messages and important moments. Together in one place.</Text></View></View><Button label="Get started" disabled={isLoading} onPress={()=>setSigning(true)}/><Pressable style={{padding:14,alignItems:'center'}} onPress={()=>setSigning(true)} accessibilityRole="button"><Text style={ui.muted}>Already have a school account? <Text style={{color:C.primary,fontWeight:'700'}}>Sign in</Text></Text></Pressable><View style={s.trust}><ShieldCheck size={16} color={C.primary}/><Text style={ui.small}>School-approved access to your child’s records.</Text></View>{isLoading&&<ActivityIndicator color={C.primary}/>}</Page>;
}
const s=StyleSheet.create({logo:{alignItems:'center',paddingVertical:18},hero:{minHeight:370,backgroundColor:C.primaryTint,borderRadius:24,overflow:'hidden',justifyContent:'flex-end'},photoMissing:{alignItems:'center',paddingTop:28,paddingBottom:30,gap:12},heroCaption:{fontSize:13,color:C.primary,fontFamily:'Geist_500Medium'},heroCaptionBox:{padding:24,backgroundColor:C.primary},eyebrow:{fontFamily:'Geist_500Medium',fontSize:10,letterSpacing:1.5,color:'#FEF3C7',marginBottom:12},heroTitle:{fontFamily:'Geist_600SemiBold',fontSize:28,lineHeight:34,letterSpacing:-.6,color:'#fff'},heroText:{fontFamily:'Geist_400Regular',fontSize:14,lineHeight:22,color:'#FEF3C7',marginTop:12},trust:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:7}});
