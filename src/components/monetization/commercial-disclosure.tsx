import { monetizationConfig } from "@/config/monetization";

export default function CommercialDisclosure({ kind }: { kind: "display" | "affiliate" }) {
  const policyUrl = monetizationConfig.disclosure.policyUrl;
  const localPolicy = policyUrl?.startsWith("/") && !policyUrl.startsWith("//") && !policyUrl.includes("\\");
  return (
    <p className="text-xs text-gray-500 mb-2">
      <span>{kind === "affiliate" ? "PR・アフィリエイト" : "広告"}</span>
      {kind === "affiliate" && <span>：紹介リンク経由の申込み等で運営者が報酬を受け取る場合があります。</span>}
      {localPolicy && <a href={policyUrl} className="ml-2 underline">広告掲載ポリシー</a>}
    </p>
  );
}
