import type { Metadata } from "next"
import { HistoryApp } from "@/components/history-app"

export const metadata: Metadata = {
  title: "Task history — Tasks",
  description: "Find and restore completed or cancelled tasks.",
}

export default function HistoryPage() {
  return <HistoryApp />
}
