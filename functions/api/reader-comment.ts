import {validateReaderComment} from "../../src/lib/reader-comment-schema";
import {publishedArticleSlugById} from "../../src/generated/published-article-slugs";

type D1RunResult={success:boolean;meta?:{changes?:number}};
type ReaderDatabase={
  prepare(sql:string):{
    first():Promise<Record<string,unknown>|null>;
    bind(...args:string[]):{run():Promise<D1RunResult>};
  };
};
type ReaderEnvironment={
  AI_PORTAL_READER_COMMENTS_ENABLED?:string;
  AI_PORTAL_FEEDBACK_DB?:ReaderDatabase;
  TURNSTILE_SECRET_KEY?:string;
};
type ReaderContext={request:Request;env:ReaderEnvironment};
const json=(status:number,data:Record<string,unknown>)=>Response.json(data,{
  status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"},
});
const publishedSlugs=new Set<string>(Object.values(publishedArticleSlugById));

/**
 * Cloudflare Pages Function for opt-in free-text editorial feedback.
 * Distinct from GA4 and original article-feedback API.
 * Requires provisioned D1 migration, Turnstile and the explicit production enable flag.
 */
export async function onRequest({request,env}:ReaderContext):Promise<Response>{
  if(request.method!=="GET"&&request.method!=="POST")
    return json(405,{ok:false,error:"method_not_allowed"});
  if(env.AI_PORTAL_READER_COMMENTS_ENABLED!=="1"||!env.AI_PORTAL_FEEDBACK_DB||!env.TURNSTILE_SECRET_KEY)
    return json(503,{ok:false,error:"comments_unavailable"});

  const db=env.AI_PORTAL_FEEDBACK_DB;
  if(request.method==="GET"){
    try{
      await db.prepare("SELECT 1 AS ready FROM reader_comments LIMIT 1").first();
      return json(200,{ok:true,available:true});
    }catch{return json(503,{ok:false,error:"storage_unavailable"});}
  }
  const pageUrl=new URL(request.url);
  if(request.headers.get("Origin")!==pageUrl.origin)
    return json(403,{ok:false,error:"origin_rejected"});
  if(!(request.headers.get("Content-Type")||"").toLowerCase().startsWith("application/json"))
    return json(415,{ok:false,error:"json_required"});
  let source:unknown;
  try{
    const body=await request.text();
    if(body.length>4500)return json(413,{ok:false,error:"payload_too_large"});
    source=JSON.parse(body);
  }catch{return json(400,{ok:false,error:"invalid_json"});}
  const parsed=validateReaderComment(source);
  if(!parsed.ok)return json(422,{ok:false,error:parsed.error});
  const comment=parsed.value;
  if(!publishedSlugs.has(comment.slug))
    return json(422,{ok:false,error:"article_not_published"});

  let result:{success?:boolean;hostname?:string;action?:string};
  try{
    const response=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{
      method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},
      body:new URLSearchParams({secret:env.TURNSTILE_SECRET_KEY,response:comment.turnstileToken}),
      signal:AbortSignal.timeout(7500),
    });
    if(!response.ok)return json(502,{ok:false,error:"verification_unavailable"});
    result=await response.json() as typeof result;
  }catch{return json(502,{ok:false,error:"verification_unavailable"});}
  if(result.success!==true||result.hostname!==pageUrl.hostname||result.action!=="reader_comment")
    return json(403,{ok:false,error:"verification_rejected"});

  try{
    // An identical requestId is idempotent; never rewrite a different comment.
    const inserted=await db.prepare(
      "INSERT INTO reader_comments (id, slug, prompt_code, note) VALUES (?, ?, ?, ?) "+
      "ON CONFLICT(id) DO UPDATE SET note = excluded.note "+
      "WHERE reader_comments.slug = excluded.slug "+
      "AND reader_comments.prompt_code = excluded.prompt_code "+
      "AND reader_comments.note = excluded.note"
    ).bind(comment.requestId,comment.slug,comment.promptCode,comment.note).run();
    if(inserted.success!==true)throw new Error("D1 insert failure");
    if(!inserted.meta?.changes)return json(409,{ok:false,error:"receipt_conflict"});
    return json(201,{ok:true,receipt:comment.requestId});
  }catch{return json(503,{ok:false,error:"storage_unavailable"});}
}
