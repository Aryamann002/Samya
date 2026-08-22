import type { Metadata } from "next";
import { Wizard } from "@/components/wizard/Wizard";

export const metadata: Metadata = {
  title: "Your reflection",
  description:
    "Five short steps of tap-to-select questions about sleep, study, workload, mood, support and daily routine.",
  robots: { index: false, follow: true },
};

export default function AssessPage() {
  return <Wizard />;
}
