"use client";

import {useState} from "react";
import {
  readerIntentChoices, readerOutcomeChoices, type ReaderContext, type ReaderStage,
} from "@/lib/reader-research";
import {recordReaderSurvey} from "@/lib/reader-analytics";

type Props = {stage:ReaderStage;slug:string;context:ReaderContext};

export default function ReaderSurvey({stage,slug,context}:Props){
  const [answered,setAnswered]=useState(false);
  const [dismissed,setDismissed]=useState(false);
  const [sent,setSent]=useState(false);
  const choices=stage==="intent"?readerIntentChoices:readerOutcomeChoices;
  const title=stage==="intent"?"この記事を開いた一番の理由は？":"この記事を読んで、どんな変化がありましたか？";
  if(dismissed)return null;
  return (
    <aside data-reader-survey={stage} aria-label={title}
      className="my-7 rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-4 sm:px-5">
      {answered?(
        <p role="status" className="text-sm leading-7 text-gray-700">
          ご回答ありがとうございます。
          {sent
            ?" 記事改善のため、同意に基づくアクセス解析イベントを送信しました。"
            :" アクセス解析への同意がない、または計測を利用できないため、回答内容は送信していません。"}
        </p>
      ):(
        <>
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-base font-bold leading-7 text-gray-900">{title}</h2>
            <button type="button" onClick={()=>setDismissed(true)} aria-label="この質問を閉じる"
              className="rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-white focus-visible:outline-2 focus-visible:outline-blue-700">
              閉じる
            </button>
          </div>
          <p className="mt-1 text-xs leading-6 text-gray-600">
            任意の1問です。回答しなくても記事はそのまま読めます。
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2" role="group" aria-label={title}>
            {choices.map(choice=>(
              <button type="button" key={choice.code}
                onClick={()=>{setSent(recordReaderSurvey(stage,choice.code,slug,context));setAnswered(true);}}
                className="min-h-11 rounded-xl border border-sky-200 bg-white px-3 py-2 text-left text-sm font-medium text-gray-800 transition-colors hover:border-blue-500 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
                {choice.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs leading-6 text-gray-500">
            名前・メールアドレス・自由記述は求めません。アクセス解析に同意した場合だけ選択肢を計測します。
            <a href="/privacy" className="ml-1 text-blue-700 underline">プライバシー</a>
          </p>
        </>
      )}
    </aside>
  );
}
