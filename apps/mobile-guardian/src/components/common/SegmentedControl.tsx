import React from 'react';
import {View} from 'react-native';
import {BaseTabs} from '../base-tabs';

export function SegmentedControl({options,selectedIndex,onChange}:{options:string[];selectedIndex:number;onChange:(index:number)=>void}){
  return <View style={{marginHorizontal:20,marginVertical:8}}><BaseTabs tabs={options.map((label,index)=>({value:String(index),label}))} value={String(selectedIndex)} onValueChange={value=>onChange(Number(value))}/></View>;
}
