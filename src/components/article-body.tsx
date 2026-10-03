import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ArticleMetadata } from "@/types/article";
import { createArticleAdsPlugin } from "@/lib/article-ad-placement";
import { getMonetizationFlags, selectAffiliateCampaign } from "@/lib/monetization";
import { monetizationConfig } from "@/config/monetization";
import AdSlot from "./monetization/ad-slot";
import AffiliateSlot from "./monetization/affiliate-slot";

export default function ArticleBody({ content, article }: { content: string; article?: ArticleMetadata }) {
  const flags = getMonetizationFlags();
  const advertising = article && flags.adsEnabled && article.adPolicy !== "off";
  const hasEndCampaign = advertising && flags.affiliatesEnabled &&
    selectAffiliateCampaign(article, monetizationConfig.affiliateCampaigns, "article-end");
  return (
    <div className="article-body">
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={advertising ? [createArticleAdsPlugin(article.adPolicy)] : []}
        components={{
          aside: ({ node, children, ...props }) => {
            const position = node?.properties.dataAdPosition;
            if (position === "article-after-intro" || position === "article-middle" || position === "article-end") {
              return position === "article-end" && hasEndCampaign && article
                ? <AffiliateSlot article={article} position="article-end" />
                : <AdSlot position={position} />;
            }
            return <aside {...props}>{children}</aside>;
          },
        }}
        skipHtml
      >{content}</Markdown>
    </div>
  );
}
