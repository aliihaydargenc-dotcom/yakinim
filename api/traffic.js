const {query}=require('../lib/traffic.cjs');
module.exports=async(req,res)=>{
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'method_not_allowed'});}
 const params=new URL(req.url,'https://yakinim.local').searchParams;
 if(!params.get('lat')?.trim()||!params.get('lng')?.trim())return res.status(400).json({error:'invalid_location'});
 res.setHeader('Cache-Control','no-store');
 try{return res.status(200).json(await query(Number(params.get('lat')),Number(params.get('lng'))));}
 catch(error){return res.status(error.message==='invalid_location'?400:503).json({error:error.message==='invalid_location'?'invalid_location':'traffic_unavailable'});}
};
