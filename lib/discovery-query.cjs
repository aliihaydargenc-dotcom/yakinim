const categories=require('./discovery-categories.json');
function discoveryQuery(area){
 const groups=new Map();for(const c of categories){if(!groups.has(c.tag))groups.set(c.tag,[]);groups.get(c.tag).push(c.value);}
 return [...groups].map(([tag,values])=>`nwr(${area})["${tag}"~"^(${values.join('|')})$"];`).join('');
}
module.exports={discoveryQuery};
