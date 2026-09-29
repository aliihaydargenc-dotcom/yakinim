const TITCK_BASE_URL = 'https://www.turkiye.gov.tr/saglik-titck-nobetci-eczane-sorgulama';
const TITCK_SUBMIT_URL = `${TITCK_BASE_URL}?submit`;
const TITCK_RESULTS_URL = `${TITCK_BASE_URL}?nobetci=Eczaneler`;
const LEGACY_ENDPOINT = 'https://eczaneadresi.com/api/public/v1/nearest-pharmacies';
const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/reverse';
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_LIMIT = 120;
const cache = new Map();

const PROVINCE_CODES = Object.freeze({
  adana:'01',adiyaman:'02',afyonkarahisar:'03',agri:'04',amasya:'05',ankara:'06',antalya:'07',artvin:'08',aydin:'09',balikesir:'10',bilecik:'11',bingol:'12',bitlis:'13',bolu:'14',burdur:'15',bursa:'16',canakkale:'17',cankiri:'18',corum:'19',denizli:'20',diyarbakir:'21',edirne:'22',elazig:'23',erzincan:'24',erzurum:'25',eskisehir:'26',gaziantep:'27',giresun:'28',gumushane:'29',hakkari:'30',hatay:'31',isparta:'32',mersin:'33',istanbul:'34',izmir:'35',kars:'36',kastamonu:'37',kayseri:'38',kirklareli:'39',kirsehir:'40',kocaeli:'41',konya:'42',kutahya:'43',malatya:'44',manisa:'45',kahramanmaras:'46',mardin:'47',mugla:'48',mus:'49',nevsehir:'50',nigde:'51',ordu:'52',rize:'53',sakarya:'54',samsun:'55',siirt:'56',sinop:'57',sivas:'58',tekirdag:'59',tokat:'60',trabzon:'61',tunceli:'62',sanliurfa:'63',usak:'64',van:'65',yozgat:'66',zonguldak:'67',aksaray:'68',bayburt:'69',karaman:'70',kirikkale:'71',batman:'72',sirnak:'73',bartin:'74',ardahan:'75',igdir:'76',yalova:'77',karabuk:'78',kilis:'79',osmaniye:'80',duzce:'81'
});

function normalizeText(value='') {
  return String(value)
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function decodeHtml(value='') {
  const entities = { amp:'&', lt:'<', gt:'>', quot:'"', apos:"'", nbsp:' ' };
  return String(value)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n,16)))
    .replace(/&([a-z]+);/gi, (m, name) => entities[name.toLowerCase()] ?? m);
}

function htmlToText(value='') {
  return decodeHtml(String(value).replace(/<br\s*\/?\s*>/gi, ' ').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizePhone(value='') {
  const digits = String(value).replace(/\D/g, '');
  if (digits.length === 10) return `0${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return digits;
  return String(value).trim();
}

function getAttr(tag, name) {
  const match = String(tag).match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i'));
  return match ? decodeHtml(match[1]) : '';
}

function turkeyDate() {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone:'Europe/Istanbul', day:'2-digit', month:'2-digit', year:'numeric' }).formatToParts(new Date());
  const pick = type => parts.find(part => part.type === type)?.value || '';
  return `${pick('day')}/${pick('month')}/${pick('year')}`;
}

function distanceMeters(lat1, lon1, lat2, lon2) {
  const toRad = v => v * Math.PI / 180;
  const r = 6371000;
  const dLat = toRad(lat2-lat1), dLon = toRad(lon2-lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return 2*r*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function cacheKey(lat,lng,radius,limit) {
  return `${lat.toFixed(3)}:${lng.toFixed(3)}:${Math.round(radius/500)*500}:${limit}`;
}
function getCached(key) {
  const row = cache.get(key);
  if (!row) return null;
  if (Date.now()-row.savedAt > CACHE_TTL_MS) { cache.delete(key); return null; }
  return row.value;
}
function setCached(key,value) {
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value);
  cache.set(key,{savedAt:Date.now(),value});
}

function cookieHeader(jar) {
  return [...jar.entries()].map(([k,v]) => `${k}=${v}`).join('; ');
}
function absorbCookies(headers, jar) {
  const setCookies = typeof headers.getSetCookie === 'function'
    ? headers.getSetCookie()
    : (headers.get('set-cookie') ? [headers.get('set-cookie')] : []);
  for (const raw of setCookies) {
    for (const cookie of String(raw).split(/,(?=\s*[^;,=]+=[^;,]+)/g)) {
      const first = cookie.split(';',1)[0];
      const eq = first.indexOf('=');
      if (eq > 0) jar.set(first.slice(0,eq).trim(), first.slice(eq+1).trim());
    }
  }
}

async function requestText(url, { method='GET', body=null, jar=null, timeout=6500, headers={} }={}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const requestHeaders = {
    'User-Agent':'Mozilla/5.0 (compatible; Yakinim/1.0; +https://yakinim.vercel.app/)',
    'Accept-Language':'tr-TR,tr;q=0.9,en;q=0.7',
    'Accept':'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
    'Referer':TITCK_BASE_URL,
    ...headers,
  };
  if (jar?.size) requestHeaders.Cookie = cookieHeader(jar);
  try {
    const response = await fetch(url,{ method, body, headers:requestHeaders, signal:controller.signal, redirect:'follow' });
    absorbCookies(response.headers, jar || new Map());
    if (!response.ok) throw new Error(`upstream_${response.status}`);
    return await response.text();
  } finally { clearTimeout(timer); }
}

function parsePageContext(html) {
  const bodyTag = html.match(/<body\b[^>]*>/i)?.[0] || '';
  const token = getAttr(bodyTag,'data-token');
  const dates = [...html.matchAll(/<input\b[^>]*>/gi)]
    .map(m => m[0])
    .filter(tag => getAttr(tag,'name') === 'nobetTarihi' && getAttr(tag,'type').toLowerCase() === 'radio')
    .map(tag => getAttr(tag,'value'))
    .filter(Boolean);
  return { token, dates };
}

function parseRows(html) {
  const table = html.match(/<table\b[^>]*id=["']searchTable["'][^>]*>([\s\S]*?)<\/table>/i)?.[1] || '';
  const tbody = table.match(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i)?.[1] || table;
  const rows=[];
  let rowIndex=0;
  for (const match of tbody.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells=[...match[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>htmlToText(m[1]));
    if (cells.length < 4) continue;
    rows.push({ rowIndex, district:cells[0], name:cells[1], address:cells[2], phone:normalizePhone(cells[3]) });
    rowIndex += 1;
  }
  return rows;
}

function parseCoordinates(html) {
  const lat = html.match(/var\s+latti\s*=\s*parseFloat\(([\d.]+)\)/i);
  const lng = html.match(/var\s+longi\s*=\s*parseFloat\(([\d.]+)\)/i);
  if (!lat || !lng) return null;
  const latitude=Number(lat[1]), longitude=Number(lng[1]);
  return Number.isFinite(latitude)&&Number.isFinite(longitude) ? {latitude,longitude} : null;
}

async function mapLimit(items, limit, mapper) {
  const results=new Array(items.length);
  let index=0;
  async function worker(){
    while(index<items.length){
      const current=index++;
      try { results[current]=await mapper(items[current],current); }
      catch { results[current]=null; }
    }
  }
  await Promise.all(Array.from({length:Math.min(limit,items.length)},()=>worker()));
  return results;
}

async function reverseLocation(lat,lng) {
  const url=new URL(NOMINATIM_ENDPOINT);
  url.searchParams.set('format','jsonv2');
  url.searchParams.set('lat',String(lat));
  url.searchParams.set('lon',String(lng));
  url.searchParams.set('zoom','10');
  url.searchParams.set('addressdetails','1');
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),4500);
  try {
    const response=await fetch(url,{signal:controller.signal,headers:{'User-Agent':'Yakinim/1.0 (https://yakinim.vercel.app/)','Accept-Language':'tr-TR,tr;q=0.9','Accept':'application/json'}});
    if(!response.ok) throw new Error(`reverse_${response.status}`);
    const payload=await response.json();
    const address=payload.address||{};
    const isoValue=Object.entries(address).find(([key,value])=>/^ISO3166-2-lvl\d+$/i.test(key)&&/^TR-\d{2}$/i.test(String(value)))?.[1];
    let plate=isoValue ? String(isoValue).slice(-2) : '';
    const province=address.province||address.state||address.region||'';
    if(!plate) plate=PROVINCE_CODES[normalizeText(province).replace(/ /g,'')]||'';
    const district=address.town||address.county||address.city_district||address.municipality||'';
    return { plate, province, district };
  } finally { clearTimeout(timer); }
}

async function fetchOfficial({lat,lng,radius,limit}) {
  const location=await reverseLocation(lat,lng);
  if(!/^\d{2}$/.test(location.plate)) throw new Error('province_unresolved');
  const jar=new Map();
  const page=await requestText(TITCK_BASE_URL,{jar});
  const context=parsePageContext(page);
  const date=turkeyDate();
  if(!context.token || !context.dates.includes(date)) throw new Error('official_context_unavailable');
  const form=new URLSearchParams({ilkod:location.plate,'ilkod-address-il':location.plate,'ilkod-address-ilce':'',nobetTarihi:date,token:context.token,btn:'Sorgula'});
  await requestText(TITCK_SUBMIT_URL,{method:'POST',body:form.toString(),jar,headers:{'Content-Type':'application/x-www-form-urlencoded'}});
  const resultsHtml=await requestText(TITCK_RESULTS_URL,{jar});
  const rows=parseRows(resultsHtml);
  if(!rows.length) return { pharmacies:[], source:'turkiye.gov.tr', province:location.province, district:location.district };

  const targetDistrict=normalizeText(location.district);
  const districtRows=targetDistrict ? rows.filter(row => {
    const rowDistrict=normalizeText(row.district);
    return rowDistrict===targetDistrict || rowDistrict.includes(targetDistrict) || targetDistrict.includes(rowDistrict);
  }) : [];
  const candidates=districtRows.length ? districtRows : rows;

  const withCoordinates=await mapLimit(candidates,6,async row=>{
    const url=`${TITCK_BASE_URL}?harita=Goster&index=${row.rowIndex}`;
    const body=new URLSearchParams({harita:'Goster',index:String(row.rowIndex)}).toString();
    const html=await requestText(url,{method:'POST',body,jar,timeout:4200,headers:{'Content-Type':'application/x-www-form-urlencoded'}});
    const point=parseCoordinates(html);
    if(!point) return null;
    const distance_m=Math.round(distanceMeters(lat,lng,point.latitude,point.longitude));
    return {
      id:`titck:${location.plate}:${normalizeText(row.name).replace(/\s+/g,'-')}:${row.rowIndex}`,
      name:row.name,
      address:row.address,
      phone:row.phone,
      latitude:point.latitude,
      longitude:point.longitude,
      distance_m,
      district:row.district,
      source:'turkiye.gov.tr'
    };
  });

  const pharmacies=withCoordinates.filter(Boolean).filter(item=>item.distance_m<=radius).sort((a,b)=>a.distance_m-b.distance_m).slice(0,limit);
  if(rows.length && !withCoordinates.some(Boolean)) throw new Error('official_coordinates_unavailable');
  return { pharmacies, source:'turkiye.gov.tr', province:location.province, district:location.district };
}

async function fetchLegacy({lat,lng,radius,limit}) {
  const url=new URL(LEGACY_ENDPOINT);
  url.searchParams.set('lat',lat.toFixed(6));
  url.searchParams.set('lng',lng.toFixed(6));
  url.searchParams.set('radius',String(radius));
  url.searchParams.set('limit',String(limit));
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),5000);
  try {
    const response=await fetch(url,{signal:controller.signal,headers:{Accept:'application/json'}});
    if(!response.ok) throw new Error(`legacy_${response.status}`);
    const payload=await response.json();
    const rows=payload.pharmacies||payload.data||[];
    const pharmacies=rows.map((row,index)=>({
      id:row.id??row.slug??`legacy:${index}`,
      name:row.name||row.pharmacy_name||'Nöbetçi Eczane',
      address:row.address||row.address_text||'Adres bilgisi yok',
      phone:row.phone||row.phone_number||'',
      latitude:Number(row.latitude??row.lat??row.location?.lat),
      longitude:Number(row.longitude??row.lng??row.lon??row.location?.lng??row.location?.lon),
      distance_m:Number(row.distance_m) || Math.round((Number(row.distance_km??row.distanceKm??row.distance)||0)*1000),
      source:'legacy-fallback'
    })).filter(item=>Number.isFinite(item.latitude)&&Number.isFinite(item.longitude));
    return {pharmacies,source:'legacy-fallback'};
  } finally { clearTimeout(timer); }
}

module.exports=async function handler(req,res){
  if(req.method!=='GET'){
    res.setHeader('Allow','GET');
    res.setHeader('Cache-Control','no-store');
    return res.status(405).json({error:'method_not_allowed'});
  }
  const params=new URL(req.url,'https://yakinim.vercel.app').searchParams;
  const lat=Number(params.get('lat')),lng=Number(params.get('lng'));
  const radius=Math.min(25000,Math.max(500,Number(params.get('radius')||7000)));
  const limit=Math.min(50,Math.max(1,Number(params.get('limit')||25)));
  if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180){
    res.setHeader('Cache-Control','no-store');
    return res.status(400).json({error:'invalid_location'});
  }
  const key=cacheKey(lat,lng,radius,limit);
  const cached=getCached(key);
  if(cached){
    res.setHeader('X-Yakinim-Cache','HIT');
    res.setHeader('X-Yakinim-Duty-Source',cached.source||'unknown');
    res.setHeader('Cache-Control','public, max-age=0, s-maxage=300, stale-while-revalidate=900');
    return res.status(200).json(cached);
  }
  try{
    let payload;
    try{ payload=await fetchOfficial({lat,lng,radius,limit}); }
    catch(error){ console.warn('Official duty source unavailable:',error.message); payload=await fetchLegacy({lat,lng,radius,limit}); }
    setCached(key,payload);
    res.setHeader('X-Yakinim-Cache','MISS');
    res.setHeader('X-Yakinim-Duty-Source',payload.source||'unknown');
    res.setHeader('Cache-Control','public, max-age=0, s-maxage=300, stale-while-revalidate=900');
    return res.status(200).json(payload);
  }catch(error){
    console.error('Duty providers unavailable:',error.message);
    res.setHeader('Cache-Control','no-store');
    return res.status(503).json({error:'duty_unavailable'});
  }
};

module.exports._private={parsePageContext,parseRows,parseCoordinates,normalizeText,distanceMeters,reverseLocation,fetchOfficial,fetchLegacy};