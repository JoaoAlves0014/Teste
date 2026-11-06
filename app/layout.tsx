import './globals.css';
import ThemeToggle from './theme-toggle';
const themeInit = `(function(){try{var t=localStorage.getItem('clareza-theme');document.documentElement.dataset.theme=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light'}catch(e){document.documentElement.dataset.theme=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}})()`;
export const metadata = { title: 'Clareza • Seu dinheiro, com direção', description: 'Controle financeiro pessoal' };
export default function Layout({children}:{children:React.ReactNode}) { return <html lang="pt-BR" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:themeInit}}/></head><body>{children}<ThemeToggle/></body></html> }
