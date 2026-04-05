import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "EchoMind — сценарии роста",
  description:
    "Визуализация маркетинговых сценариев: таблицы и графики прироста",
};

export default function EchoMindLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
