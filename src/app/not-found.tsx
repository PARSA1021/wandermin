"use client";
import Link from "next/link";
import { useI18n } from "@/i18n/react";

/** A wrong address still lands somewhere friendly, with a way back into the app. */
export default function NotFound() {
  const { t } = useI18n();
  return (
    <section className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <img src="/icons/icon-192.png" alt="" width={72} height={72} className="pixelated h-18 w-18 rounded-2xl" />
      <h1 className="text-2xl font-bold">{t("notFound.title")}</h1>
      <p className="text-ink-soft">{t("notFound.body")}</p>
      <Link href="/" className="tap mt-2 flex min-h-12 items-center rounded-xl bg-ink px-6 font-semibold text-paper">{t("notFound.home")}</Link>
    </section>
  );
}
