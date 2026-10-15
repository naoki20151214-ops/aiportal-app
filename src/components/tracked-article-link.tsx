"use client";

import Link from "next/link";
import type {ReactNode} from "react";
import type {ReaderContext} from "@/lib/reader-research";
import {recordReaderNext} from "@/lib/reader-analytics";

type Props={
  sourceSlug:string;
  targetSlug:string;
  context:ReaderContext;
  placement:"related"|"news-learning"|"news-index";
  children:ReactNode;
  className?:string;
};
export default function TrackedArticleLink({
  sourceSlug,targetSlug,context,placement,children,className,
}:Props){
  // Navigate normally whether or not the visitor consented to GA.
  return <Link href={"/articles/"+targetSlug} className={className}
    onClick={()=>{recordReaderNext(sourceSlug,targetSlug,context,placement);}}>
      {children}
    </Link>;
}
