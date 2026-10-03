import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function ArticleBody({ content }: { content: string }) {
  return (
    <div className="article-body">
      <Markdown remarkPlugins={[remarkGfm]} skipHtml>{content}</Markdown>
    </div>
  );
}
