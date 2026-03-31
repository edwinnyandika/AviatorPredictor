const l = require('lucide-react');
console.log('--- LUCIDE ---');
['Zap','BrainCircuit','Activity','BellRing','Building2','Smartphone','LayoutDashboard','Gamepad2','Wrench','History','UserCircle','Settings'].forEach(n => console.log(n, !!l[n]));

const s = require('@icons-pack/react-simple-icons');
console.log('--- SIMPLE ICONS ---');
['SiStripe','SiAmazonaws','SiCloudflare','SiVercel','SiBinance','SiNextdotjs'].forEach(n => console.log(n, !!s[n]));
