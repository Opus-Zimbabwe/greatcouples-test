// Manual workflow diagnostics for the exact public sources used by the website.
import {resolveChannelId} from '../src/lib/youtube-feed.mjs';
const note=message=>console.log(`::notice title=Video source check::${message.replaceAll('%','%25').replaceAll('\r','%0D').replaceAll('\n','%0A')}`);
async function inspect(url,parse){
 try{const r=await fetch(url,{signal:AbortSignal.timeout(12000),headers:{'User-Agent':'GreatCouplesWebsite/1.0',Accept:'application/json,text/html,application/atom+xml'}});const text=await r.text();let extra='';if(r.ok&&parse)try{extra=parse(text)}catch(e){extra=e.message}note(`${url} — HTTP ${r.status}; ${extra}`)}catch(e){note(`${url} — ${e.name}: ${e.message}`)}
}
await inspect('https://www.youtube.com/@greatcouples',text=>`resolved channel: ${resolveChannelId(text)}`);
await inspect('https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=q5FlDKsrzQk&format=json',text=>{const x=JSON.parse(text);return JSON.stringify({author_url:x.author_url,author_name:x.author_name,title:x.title})});
for(const id of ['7707735777718930706','7662832812252204308']){
 await inspect(`https://www.tiktok.com/oembed?url=${encodeURIComponent(`https://www.tiktok.com/@greatcouplestrust/video/${id}`)}`,text=>{const x=JSON.parse(text);return JSON.stringify({author_url:x.author_url,title:x.title,thumbnail:!!x.thumbnail_url,error:x.message||x.error})});
 await inspect(`https://www.tiktok.com/player/v1/${id}`);
}
