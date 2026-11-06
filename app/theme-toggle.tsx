'use client';
import {useEffect,useState} from 'react';
import {Moon,Sun} from 'lucide-react';
const key='clareza-theme';
export default function ThemeToggle(){
 const [dark,setDark]=useState<boolean|null>(null);
 useEffect(()=>{
  const system=window.matchMedia('(prefers-color-scheme: dark)');
  const sync=()=>{let saved:string|null=null;try{saved=localStorage.getItem(key)}catch{}const isDark=saved==='dark'||(saved!=='light'&&system.matches);document.documentElement.dataset.theme=isDark?'dark':'light';setDark(isDark)};
  sync();system.addEventListener('change',sync);
  const changed=(event:StorageEvent)=>{if(event.key===key||event.key===null)sync()};window.addEventListener('storage',changed);
  return ()=>{system.removeEventListener('change',sync);window.removeEventListener('storage',changed)};
 },[]);
 const label=dark===null?'Alternar tema':dark?'Ativar modo claro':'Ativar modo escuro';
 return <button type="button" className="theme-toggle" aria-label={label} title={label} onClick={()=>{const next=document.documentElement.dataset.theme!=='dark';document.documentElement.dataset.theme=next?'dark':'light';setDark(next);try{localStorage.setItem(key,next?'dark':'light')}catch{}}}>{dark?<Sun size={17}/>:<Moon size={17}/>}<span>{dark?'Modo claro':'Modo escuro'}</span></button>;
}
