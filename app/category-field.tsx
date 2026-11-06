import {categories} from '../lib/features';
export default function CategoryField({value}:{value?:string}){return <label>Categoria<select name="category" aria-label="Categoria" defaultValue={value??'Sem categoria'}>{[...new Set([...categories,...(value?[value]:[])])].map(c=><option key={c}>{c}</option>)}</select></label>}
