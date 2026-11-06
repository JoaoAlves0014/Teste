'use client';
import {useEffect,useState} from 'react';
import {reportCategories} from '../lib/statement-types';
export default function ReportCategorySelect({value,onChange,label='Categoria',name='category',known=[],allowEmpty=false}:{value:string;onChange:(value:string)=>void;label?:string;name?:string;known?:string[];allowEmpty?:boolean}){
 const options=[...new Set([...reportCategories,...known])];const [custom,setCustom]=useState(!!value&&!options.includes(value));
 useEffect(()=>{if(options.includes(value))setCustom(false)},[value]);
 return <><label>{label}<select name={custom?undefined:name} aria-label={label} value={custom?'__custom__':value} onChange={e=>{if(e.target.value==='__custom__'){setCustom(true);onChange('')}else{setCustom(false);onChange(e.target.value)}}}>{allowEmpty&&<option value="">Manter categoria atual</option>}{options.map(c=><option key={c}>{c}</option>)}<option value="__custom__">+ Criar outra categoria</option></select></label>{custom&&<label>Nome da nova categoria<input name={name} aria-label="Nome da nova categoria" maxLength={80} value={value} onChange={e=>onChange(e.target.value)} required autoFocus placeholder="Ex.: Cuidados pessoais"/></label>}</>;
}
