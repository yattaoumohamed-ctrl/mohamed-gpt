// Serveur Cloudflare Worker pour Mohamed GPT. Garder la clé API dans les secrets.
const ALLOWED_ORIGIN = "https://yattaoumohamed-ctrl.github.io";
export default {
 async fetch(request, env) {
  const origin=request.headers.get("Origin")||"", allowed=origin===ALLOWED_ORIGIN;
  const cors={"Access-Control-Allow-Origin":allowed?origin:"","Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type","Vary":"Origin"};
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
  if(new URL(request.url).pathname!=="/chat")return out({error:"Route introuvable."},404,cors);
  if(request.method!=="POST")return out({error:"Utilise POST."},405,cors);
  if(!allowed)return out({error:"Origine non autorisée."},403,cors);
  if(!env.GEMINI_API_KEY)return out({error:"Ajoute GEMINI_API_KEY dans les secrets du Worker."},500,cors);
  let body;try{body=await request.json()}catch{return out({error:"JSON invalide."},400,cors)}
  if(!Array.isArray(body.messages)||!body.messages.length)return out({error:"Aucun message reçu."},400,cors);
  const messages=body.messages.slice(-16).map(m=>({role:m.role==="assistant"?"model":"user",parts:[{text:String(m.content||"").slice(0,6000)}]})).filter(m=>m.parts[0].text.trim());
  if(!messages.length||messages[messages.length-1].role!=="user")return out({error:"Le dernier message doit être une question."},400,cors);
  const model=env.GEMINI_MODEL||"gemini-2.5-flash";
  try{
   const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":env.GEMINI_API_KEY},body:JSON.stringify({systemInstruction:{parts:[{text:"Tu es Mohamed GPT, un assistant utile, honnête et chaleureux qui répond principalement en français. Explique clairement, étape par étape quand c'est utile. Si tu ne sais pas, dis-le. Aide l'utilisateur à comprendre les raisonnements. Ne prétends pas être ChatGPT ou un produit OpenAI."}]},contents:messages,generationConfig:{temperature:0.7,maxOutputTokens:1800}})});
   const data=await r.json();if(!r.ok)return out({error:data?.error?.message||"Erreur API : vérifie la clé, le modèle et le quota."},r.status,cors);
   const reply=data?.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("").trim();if(!reply)return out({error:"Aucune réponse reçue. Vérifie le modèle ou le quota."},502,cors);return out({reply},200,cors);
  }catch{return out({error:"Impossible de joindre le service IA."},502,cors)}
 }
};
function out(data,status,headers={}){return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8",...headers}})}
