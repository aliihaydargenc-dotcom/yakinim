const {query}=require('../lib/traffic.cjs');
const tiles=require('../lib/traffic-tiles.cjs');
module.exports=async(req,res)=>{
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'method_not_allowed'});}
 const params=new URL(req.url,'https://yakinim.local').searchParams;
 if(params.get('action')==='tile'){
  try{const image=await tiles.tile(params);res.setHeader('Content-Type','image/png');res.setHeader('Cache-Control','public, max-age=60, s-maxage=120');return res.status(200).send(image);}
  catch(error){res.setHeader('Cache-Control','no-store');return res.status(error.message==='invalid_tile'?400:error.message==='traffic_not_configured'?503:502).json({error:error.message==='invalid_tile'?'invalid_tile':error.message==='traffic_not_configured'?'traffic_not_configured':'traffic_unavailable'});}
 }
 if(params.has('action'))return res.status(400).json({error:'invalid_action'});
 if(!params.get('lat')?.trim()||!params.get('lng')?.trim())return res.status(400).json({error:'invalid_location'});
 res.setHeader('Cache-Control','no-store');
 try{const lat=Number(params.get('lat')),lng=Number(params.get('lng'));if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)throw Error('invalid_location');return res.status(200).json(tiles.configured()?tiles.metadata():await query(lat,lng));}
 catch(error){return res.status(error.message==='invalid_location'?400:503).json({error:error.message==='invalid_location'?'invalid_location':'traffic_unavailable'});}
};
