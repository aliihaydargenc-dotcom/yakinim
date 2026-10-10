import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {mergeNewsItems}=require('../lib/news.cjs');
const fixtureTime=Date.now();
const items=source=>Array.from({length:4},(_,i)=>({source,title:source+i,url:`https://${source}.example/${i}`,publishedAt:new Date(fixtureTime-i*1000).toISOString()}));
const merged=mergeNewsItems([items('a'),items('b')]);
assert.equal(merged.length,8);
for(let i=1;i<merged.length;i++)assert.notEqual(merged[i-1].source,merged[i].source);
assert.equal(mergeNewsItems([[{...items('a')[0],publishedAt:new Date(Date.now()+3600000).toISOString()}]]).length,0);
const originalFetch=globalThis.fetch;const calls=[];
const today=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Istanbul'}).format(new Date());
globalThis.fetch=async url=>{
 calls.push(String(url));
 if(String(url).includes('nominatim'))return {ok:true,json:async()=>({address:{'ISO3166-2-lvl4':'TR-07',province:'Antalya',town:'Muratpaşa'}})};
 if(String(url).includes('eczaneadresi'))return {ok:true,json:async()=>({pharmacies:[{id:'fallback',name:'Test Eczane',latitude:36.884,longitude:30.704,phone:'02421234567'}]})};
 return {ok:true,headers:new Headers(),text:async()=>String(url).includes('?')?'<table id="searchTable"><tbody></tbody></table>':`<body data-token="abc"><input type="radio" name="nobetTarihi" value="${today}" /></body>`};
};
try{
 const handler=require('../api/duty.js');let payload,status;
 const res={setHeader(){},status(n){status=n;return this},json(p){payload=p;return p}};
 await handler({method:'GET',url:'/api/duty?lat=36.884&lng=30.704&radius=20000'},res);
 assert.equal(status,200);assert.equal(payload.source,'legacy-fallback');assert.equal(payload.pharmacies.length,1);assert.ok(calls.some(u=>u.includes('eczaneadresi')));assert.ok(calls.some(u=>u.includes('?nobetci=Eczaneler')));assert.equal(payload.queryDate,today);
}finally{globalThis.fetch=originalFetch;}
console.log('Model 1 data PASS: source balance, future dates, empty official duty fallback.');
const {parseRss,imageFromRss}=require('../lib/news.cjs');
const feed={id:'fixture',source:'Kaynak',url:'https://publisher.example/feed'};
const fixture=body=>`<rss><item><title>Görselli haber</title><link>https://publisher.example/story</link>${body}</item></rss>`;
for(const body of ['<media:thumbnail url="https://cdn.example/a.jpg"/>','<media:content url="https://cdn.example/a.jpg" type="image/jpeg"/>','<image>https://cdn.example/a.jpg</image>','<description><![CDATA[<img src="https://cdn.example/a.jpg"/>]]></description>'])assert.equal(parseRss(fixture(body),'gundem',feed)[0].imageUrl,'https://cdn.example/a.jpg');
assert.equal(imageFromRss('<enclosure type="audio/mp3" url="https://cdn.example/a.mp3"/>',feed.url),undefined);
assert.equal(imageFromRss('<media:content url="javascript:alert(1)"/>',feed.url),undefined);
assert.equal(imageFromRss('<media:content url="https://cdn.example/a.jpg?x=1&amp;y=2"/>',feed.url),'https://cdn.example/a.jpg?x=1&y=2');
console.log('RSS images PASS: media, image, CDATA and unsafe URL rejection');
