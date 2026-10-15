"use client";

import {useCallback,useEffect,useRef,useState,type FormEvent} from "react";
import Script from "next/script";
import {readerCommentPrompts,validateReaderComment,type ReaderCommentPrompt} from "@/lib/reader-comment-schema";

const siteKey=process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY||"";
const contact="https://docs.google.com/forms/d/e/1FAIpQLSdP1r0fWxEinCVDqNuMT2nKvCX__2epeWHoxUWc623oxKCAvQ/viewform";
type Pending={requestId:string;slug:string;promptCode:ReaderCommentPrompt;note:string};
type Props={slug:string};

export default function ReaderFreeComment({slug}:Props){
  const [topic,setTopic]=useState<ReaderCommentPrompt>("helpful_part");
  const [note,setNote]=useState("");
  const [availability,setAvailability]=useState<"checking"|"ready"|"unavailable">("checking");
  const [busy,setBusy]=useState(false);
  const [sent,setSent]=useState(false);
  const [error,setError]=useState("");
  const widgetBox=useRef<HTMLDivElement>(null);
  const widgetId=useRef<string|null>(null);
  const token=useRef("");
  const pending=useRef<Pending|null>(null);
  const inFlight=useRef(false);
  const receipt=useRef<string|null>(null);
  const timeout=useRef<ReturnType<typeof setTimeout>|null>(null);

  useEffect(()=>{
    if(!siteKey){queueMicrotask(()=>setAvailability("unavailable"));return;}
    const controller=new AbortController();
    void (async()=>{
      try{
        const response=await fetch("/api/reader-comment",{
          method:"GET",cache:"no-store",credentials:"same-origin",signal:controller.signal,
        });
        const body=await response.json() as {ok?:boolean;available?:boolean};
        if(!controller.signal.aborted)
          setAvailability(response.ok&&body.ok===true&&body.available===true?"ready":"unavailable");
      }catch{
        if(!controller.signal.aborted)setAvailability("unavailable");
      }
    })();
    return ()=>controller.abort();
  },[]);

  const send=useCallback(()=>{
    const job=pending.current;
    if(!job||!token.current||inFlight.current)return;
    const challenge=token.current;
    token.current="";
    pending.current=null;
    inFlight.current=true;
    if(timeout.current)clearTimeout(timeout.current);
    timeout.current=null;
    void (async()=>{
      try{
        const response=await fetch("/api/reader-comment",{
          method:"POST",headers:{"Content-Type":"application/json"},
          credentials:"same-origin",cache:"no-store",
          body:JSON.stringify({...job,turnstileToken:challenge}),
          signal:AbortSignal.timeout(12000),
        });
        const result=await response.json() as {ok?:boolean;receipt?:string};
        if(!response.ok||result.ok!==true||result.receipt!==job.requestId)
          throw new Error("The server did not acknowledge saved feedback");
        setSent(true);
        setError("");
      }catch{
        setError("保存できませんでした。通信状態を確認して再試行してください。");
      }finally{
        inFlight.current=false;
        setBusy(false);
        if(widgetId.current)try{window.turnstile?.reset(widgetId.current);}catch{/* retry remains possible */}
      }
    })();
  },[]);

  const failChallenge=useCallback(()=>{
    token.current="";
    if(timeout.current)clearTimeout(timeout.current);
    timeout.current=null;
    pending.current=null;
    setBusy(false);
    setError("送信の安全確認を完了できませんでした。再試行してください。");
  },[]);

  const renderChallenge=useCallback(()=>{
    if(availability!=="ready"||!widgetBox.current||widgetId.current!==null||!window.turnstile)return;
    try{
      widgetId.current=window.turnstile.render(widgetBox.current,{
        sitekey:siteKey,action:"reader_comment",
        appearance:"interaction-only",execution:"render",language:"ja",
        callback:(value)=>{token.current=value;send();},
        "expired-callback":()=>{token.current="";},
        "error-callback":failChallenge,
      });
    }catch{failChallenge();}
  },[availability,send,failChallenge]);

  useEffect(()=>{if(availability==="ready")renderChallenge();},[availability,renderChallenge]);
  useEffect(()=>()=>{if(timeout.current)clearTimeout(timeout.current);
    if(widgetId.current)try{window.turnstile?.remove(widgetId.current);}catch{/* cleanup */}},[]);

  function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(availability!=="ready"||busy||sent)return;
    const requestId=receipt.current||crypto.randomUUID();
    const draft={requestId,slug,promptCode:topic,note:note.trim()};
    // Validate without sending any free-text to analytics.
    const parsed=validateReaderComment({...draft,turnstileToken:"pending"});
    if(!parsed.ok){
      setError(parsed.error==="personal_details_or_links"
        ?"メールアドレス・電話番号・URLは入力せず、内容だけを教えてください。"
        :"8〜300文字で具体的にご記入ください。");
      return;
    }
    receipt.current=requestId;
    pending.current=draft;
    setBusy(true);setError("");
    timeout.current=setTimeout(failChallenge,15000);
    send();
  }

  const selected=readerCommentPrompts.find(x=>x.code===topic)!;
  return (
    <section data-reader-free-comment="true" aria-label="記事について自由に伝える"
      className="mt-3 border-t border-gray-100 pt-4">
      <h3 className="text-sm font-bold text-gray-900">もう少し詳しく教えてください</h3>
      <p className="mt-1 text-xs leading-6 text-gray-600">ご回答に合わせて、具体的な質問を表示します。入力は任意です。</p>
      <label htmlFor="reader-comment-topic" className="mt-3 block text-xs font-bold text-gray-700">
        どんな感想に近いですか？
      </label>
      <select id="reader-comment-topic" value={topic} disabled={busy||sent}
        onChange={event=>{setTopic(event.target.value as ReaderCommentPrompt);setError("");receipt.current=null;}}
        className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900">
        {readerCommentPrompts.map(x=><option key={x.code} value={x.code}>{x.label}</option>)}
      </select>
      <p className="mt-3 text-sm font-semibold leading-6 text-gray-900">{selected.question}</p>
      {sent?(
        <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
          ありがとうございます。感想を受け付けました。
        </p>
      ):(
        <form onSubmit={submit} className="mt-2">
          <label htmlFor="reader-comment-note" className="sr-only">{selected.question}</label>
          <textarea id="reader-comment-note" rows={3} maxLength={300}
            value={note} disabled={busy||availability!=="ready"}
            placeholder={availability==="ready"?"8〜300文字で教えてください":"現在、感想の受付準備をしています"}
            onChange={event=>{setNote(event.target.value);setError("");receipt.current=null;}}
            className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm text-gray-900 disabled:bg-gray-100 disabled:text-gray-500" />
          <p className="mt-1 text-xs text-gray-500">{note.length}/300文字。名前・連絡先などは書かないでください。</p>
          {availability==="ready"&&(
            <>
              <button type="submit" disabled={busy||note.trim().length<8}
                className="mt-3 min-h-11 w-full rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                {busy?"安全確認・送信中…":"感想を送信する"}
              </button>
              <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
                strategy="afterInteractive" onReady={renderChallenge}
                onError={()=>setAvailability("unavailable")} />
              <div ref={widgetBox} aria-label="不正投稿防止の確認" />
            </>
          )}
          {availability!=="ready"&&(
            <p className="mt-3 text-xs leading-6 text-gray-600">
              {availability==="checking"?"保存先の接続を確認しています。":"自由記述の保存機能はまだ利用できません。"}
              <a href={contact} target="_blank" rel="noopener noreferrer"
                className="ml-1 font-bold text-blue-700 underline">お問い合わせフォームで伝える（外部サイト）</a>
            </p>
          )}
          {error&&<p role="alert" className="mt-2 text-xs leading-6 text-red-700">{error}</p>}
        </form>
      )}
      <p className="mt-3 text-xs leading-5 text-gray-500">
        自由記述はGA4には送らず、受付が有効な場合のみCloudflareへ保存します。
        <a href="/privacy" className="ml-1 text-blue-700 underline">プライバシー</a>
      </p>
    </section>
  );
}
