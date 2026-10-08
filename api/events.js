'use strict';
const {query}=require('../lib/events.cjs');
module.exports=async(req,res)=>{if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'method_not_allowed'});}try{const data=await query();res.setHeader('Cache-Control','public, max-age=0, s-maxage=300');return res.status(200).json(data);}catch{res.setHeader('Cache-Control','no-store');return res.status(503).json({error:'events_unavailable'});}};
