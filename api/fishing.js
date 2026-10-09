'use strict';
const {query}=require('../lib/fishing.cjs');
module.exports=async(req,res)=>{if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'method_not_allowed'});}res.setHeader('Cache-Control','no-store');try{return res.status(200).json(await query(new URL(req.url,'https://yakinim.local').searchParams));}catch(e){return res.status(e.message.startsWith('invalid_')?400:503).json({error:e.message.startsWith('invalid_')?e.message:'fishing_unavailable'});}};
