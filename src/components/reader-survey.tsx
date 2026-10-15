"use client";

import {useEffect, useId, useRef, useState} from "react";
import {
  readerIntentChoices, readerOutcomeChoices, type ReaderContext, type ReaderStage,
} from "@/lib/reader-research";
import {recordReaderSurvey} from "@/lib/reader-analytics";
import ReaderFreeComment from "@/components/reader-free-comment";

// A compact, fixed, non-modal reader survey. The article itself has no inserted survey card.
type Props={slug:string;context:ReaderContext};
type AnswerStatus={intent:null|boolean;outcome:null|boolean};

export default function ReaderSurvey({slug,context}:Props){
  const [open,setOpen]=useState(false);
  const [stage,setStage]=useState<ReaderStage>("intent");
  const [commentOpen,setCommentOpen]=useState(false);
  const [status,setStatus]=useState<AnswerStatus>({intent:null,outcome:null});
  const panelId=useId();
  const headingId=useId();
  const triggerRef=useRef<HTMLButtonElement>(null);
  const closeRef=useRef<HTMLButtonElement>(null);

  useEffect(()=>{
    if(!open)return;
    closeRef.current?.focus();
    const onKeyDown=(event:KeyboardEvent)=>{
      if(event.key==="Escape"){
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown",onKeyDown);
    return ()=>document.removeEventListener("keydown",onKeyDown);
  },[open]);

  const choices=stage==="intent"?readerIntentChoices:readerOutcomeChoices;
  const title=stage==="intent"
    ?"この記事を開いた一番の理由は？"
    :"この記事を読んで、どんな変化がありましたか？";
  const answered=status[stage]!==null;
  const submitted=status[stage]===true;

  function answer(code:string){
    if(answered)return;
    const sent=recordReaderSurvey(stage,code,slug,context);
    setStatus(previous=>({...previous,[stage]:sent}));
  }

  return (
    <div data-reader-survey-dock="true"
      className="fixed right-3 z-[40] flex flex-col items-end gap-2 sm:right-5"
      style={{bottom:"calc(0.75rem + env(safe-area-inset-bottom))"}}>
      {open && (
        <section id={panelId} role="dialog" aria-modal="false"
          aria-labelledby={headingId}
          className="max-h-[min(68dvh,31rem)] w-[min(23rem,calc(100vw-1.5rem))] overflow-y-auto overscroll-contain rounded-2xl border border-sky-200 bg-white p-4 text-gray-900 shadow-2xl sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-blue-700">任意の読者アンケート</p>
              <h2 id={headingId} className="mt-1 text-base font-bold">この記事について</h2>
            </div>
            <button type="button" ref={closeRef}
              onClick={()=>{setOpen(false);triggerRef.current?.focus();}}
              aria-label="アンケートを閉じる"
              className="min-h-10 rounded-lg px-3 text-sm text-gray-600 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-blue-700">
              閉じる
            </button>
          </div>
          <div role="group" aria-label="質問を選ぶ" className="mt-3 grid grid-cols-3 gap-2">
            {([
              {value:"intent" as const,label:"読んだ理由"},
              {value:"outcome" as const,label:"読後の感想"},
            ]).map(option=>(
              <button type="button" key={option.value} onClick={()=>{setCommentOpen(false);setStage(option.value);}}
                aria-pressed={!commentOpen&&stage===option.value}
                className={"min-h-10 rounded-lg border px-2 py-2 text-xs font-bold sm:text-sm "+
                  (!commentOpen&&stage===option.value
                    ?"border-blue-700 bg-blue-700 text-white"
                    :"border-gray-200 bg-gray-50 text-gray-700 hover:border-blue-300")}>
                {option.label}{status[option.value]!==null?" ✓":""}
              </button>
            ))}
            <button type="button" onClick={()=>setCommentOpen(true)}
              aria-pressed={commentOpen}
              className={"min-h-10 rounded-lg border px-2 py-2 text-xs font-bold sm:text-sm "+
                (commentOpen?"border-blue-700 bg-blue-700 text-white"
                  :"border-gray-200 bg-gray-50 text-gray-700 hover:border-blue-300")}>
              自由記述
            </button>
          </div>
          {commentOpen ? (
            <ReaderFreeComment slug={slug} />
          ) : (
          <>
          <h3 className="mt-4 text-sm font-bold leading-6">{title}</h3>
          {answered ? (
            <div className="mt-3 rounded-lg bg-sky-50 p-3 text-sm leading-6" role="status">
              ご回答ありがとうございます。
              {submitted
                ?" 同意済みのアクセス解析へ回答を送信しました。"
                :" アクセス解析への同意がない、または計測が使えないため、この回答は送信していません。"}
            </div>
          ) : (
            <div className="mt-3 grid gap-2" role="group" aria-label={title}>
              {choices.map(choice=>(
                <button type="button" key={choice.code}
                  onClick={()=>answer(choice.code)}
                  className="min-h-11 rounded-xl border border-gray-200 bg-white px-3 py-2 text-left text-sm font-medium text-gray-800 hover:border-blue-500 hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-blue-700">
                  {choice.label}
                </button>
              ))}
            </div>
          )}
          <p className="mt-4 text-xs leading-5 text-gray-500">
            選択式の回答は任意です。名前やメールアドレスは求めません。
            アクセス解析に同意した場合だけ選択肢を計測します。
            <a href="/privacy" className="ml-1 text-blue-700 underline">プライバシー</a>
          </p>
          </>
          )}
        </section>
      )}
      <button type="button" ref={triggerRef} aria-expanded={open}
        aria-controls={panelId}
        onClick={()=>setOpen(value=>!value)}
        className="flex min-h-11 items-center gap-2 rounded-full border border-blue-700 bg-blue-700 px-4 py-2 text-sm font-bold text-white shadow-lg hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
        <span aria-hidden="true">✎</span> 感想・アンケート
      </button>
    </div>
  );
}
