'use strict';
const {query}=require('../lib/location.cjs');
module.exports=async(req,res)=>{if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'method_not_allowed'});}try{const data=await query(new URL(req.url,'https://yakinim.local').searchParams);res.setHeader('Cache-Control','public, s-maxage=86400, stale-while-revalidate=86400');return res.status(200).json(data);}catch(e){res.setHeader('Cache-Control','no-store');return res.status(e.message==='invalid_location'?400:503).json({error:e.message==='invalid_location'?e.message:'location_unavailable'});}};
