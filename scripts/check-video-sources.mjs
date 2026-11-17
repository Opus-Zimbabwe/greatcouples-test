// Manual workflow diagnostics for the exact public sources used by the website.
import {resolveChannelId} from '../src/lib/youtube-feed.mjs';
const note=message=>console.log(`::notice title=Video source check::${message.replaceAll('%','%25').replaceAll('\r','%0D').replaceAll('\n','%0A')}`);
async function inspect(url,parse){
 try{const r=await fetch(url,{signal:AbortSignal.timeout(12000),headers:{'User-Agent':'GreatCouplesWebsite/1.0',Accept:'application/json,text/html,application/atom+xml'}});const text=await r.text();let extra='';if(r.ok&&parse)try{extra=parse(text)}catch(e){extra=e.message}note(`${url} — HTTP ${r.status}; ${extra}`)}catch(e){note(`${url} — ${e.name}: ${e.message}`)}
}
await inspect('https://www.youtube.com/@greatcouples',text=>`resolved channel: ${resolveChannelId(text)}`);
await inspect('https://www.youtube.com/feeds/videos.xml?channel_id=UCK7hBmLcGBOcz9TYun6jDAw', text=>JSON.stringify({channelIds:[...text.matchAll(/<yt:channelId>([^<]+)<\/yt:channelId>/g)].slice(0,3).map(x=>x[1]),title:text.match(/<title>([^<]+)<\/title>/)?.[1],prefix:text.slice(0,250)}));
await inspect('https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=q5FlDKsrzQk&format=json',text=>{const x=JSON.parse(text);return JSON.stringify({author_url:x.author_url,author_name:x.author_name,title:x.title})});
for(const id of ['7707735777718930706','7662832812252204308']){
 await inspect(`https://www.tiktok.com/oembed?url=${encodeURIComponent(`https://www.tiktok.com/@greatcouplestrust/video/${id}`)}`,text=>{const x=JSON.parse(text);return JSON.stringify(x).slice(0,900)});
 await inspect(`https://www.tiktok.com/player/v1/${id}`,text=>JSON.stringify({title:text.match(/<title>([^<]+)<\/title>/)?.[1],status:[...text.matchAll(/status(?:Code|_code|Msg|_msg)["']?\s*[:=]\s*([0-9]+|"[^"\n]{0,150}")/g)].slice(0,6).map(x=>x[0]),size:text.length}));
}
