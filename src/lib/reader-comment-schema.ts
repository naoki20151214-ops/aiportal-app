export const readerCommentPrompts = [
  { code: "helpful_part", label: "理解できた", question: "どの説明が、特に理解の助けになりましたか？" },
  { code: "confusing_part", label: "まだ分からない部分がある", question: "どの言葉や説明が分かりにくかったですか？" },
  { code: "practical_use", label: "仕事や勉強に役立ちそう", question: "どんな仕事や場面で、この知識を使いたいですか？" },
  { code: "next_question", label: "もっと知りたい", question: "次に、どんなことを詳しく知りたいですか？" },
] as const;

export type ReaderCommentPrompt = (typeof readerCommentPrompts)[number]["code"];
export type ReaderCommentInput = {
  requestId: string;
  slug: string;
  promptCode: ReaderCommentPrompt;
  note: string;
  turnstileToken: string;
};
export type ReaderCommentValidation = {ok:true;value:ReaderCommentInput}|{ok:false;error:string};
const ids=new Set<string>(readerCommentPrompts.map(x=>x.code));
const fields=new Set(["requestId","slug","promptCode","note","turnstileToken"]);
const slugRe=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const uuidRe=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

export function validateReaderComment(input:unknown): ReaderCommentValidation {
  const bad=(error:string):ReaderCommentValidation=>({ok:false,error});
  if(!input||typeof input!=="object"||Array.isArray(input))return bad("invalid_body");
  const x=input as Record<string,unknown>;
  if(Object.keys(x).some(key=>!fields.has(key)))return bad("unknown_field");
  if(typeof x.requestId!=="string"||!uuidRe.test(x.requestId))return bad("invalid_request_id");
  if(typeof x.slug!=="string"||x.slug.length>100||!slugRe.test(x.slug))return bad("invalid_slug");
  if(typeof x.promptCode!=="string"||!ids.has(x.promptCode))return bad("invalid_prompt");
  if(typeof x.turnstileToken!=="string"||x.turnstileToken.length<1||x.turnstileToken.length>2048)
    return bad("invalid_challenge_token");
  if(typeof x.note!=="string"||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(x.note))
    return bad("invalid_note");
  const note=x.note.trim();
  if(note.length<8||note.length>300)return bad("note_length");
  // Cautionary gate against obvious personal identifiers and unsolicited links;
  // authors should still periodically review any prose before using it.
  if(/(?:https?:\/\/|www\.|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,})/i.test(note) ||
    /(?:\+81|0\d{1,4}[-‐ー]?\d{2,4}[-‐ー]?\d{4})/.test(note))
    return bad("personal_details_or_links");
  return {ok:true,value:{
    requestId:x.requestId,slug:x.slug,promptCode:x.promptCode as ReaderCommentPrompt,
    note,turnstileToken:x.turnstileToken,
  }};
}
