import type { Metadata } from "next";
import { ResultView } from "@/components/result/ResultView";

export const metadata: Metadata = {
  title: "What you told us",
  description: "Your six areas, the answers behind them, and three things to try.",
  robots: { index: false, follow: false },
};

export default function ResultPage() {
  return <ResultView />;
}
