'use strict';
const local=require('../lib/events.cjs'),general=require('../lib/general-events.cjs');
module.exports=async(req,res)=>{
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'method_not_allowed'});}
 const params=new URL(req.url,'https://yakinim.local').searchParams,city=params.get('city')||'all';
 if(city!=='all'&&!general.cities.some(c=>c.id===city)){res.setHeader('Cache-Control','no-store');return res.status(400).json({error:'invalid_city'});}
 try{
  const results=await Promise.allSettled([general.query(city),...(city==='8'?[local.query()]:[])]),success=results.filter(r=>r.status==='fulfilled');
  if(!success.length)throw Error('events_unavailable');
  const base=success[0].value,data={...base,items:local.deduplicate(success.flatMap(r=>r.value.items)),partial:success.length<results.length||success.some(r=>r.value.partial)};
  res.setHeader('Cache-Control','public, max-age=0, s-maxage=300');return res.status(200).json(data);
 }catch{res.setHeader('Cache-Control','no-store');return res.status(503).json({error:'events_unavailable'});}
};
