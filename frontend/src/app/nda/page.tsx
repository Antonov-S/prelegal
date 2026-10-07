import type { Metadata } from "next";

import NdaCreator from "@/components/NdaCreator";
import { loadMndaTemplate } from "@/lib/mnda/source";

export const metadata: Metadata = {
  title: "Prelegal — Mutual NDA creator",
  description:
    "Fill in a cover page and download a completed Common Paper Mutual NDA.",
};

/**
 * The templates are read from disk here, in a server component, so the parsing
 * happens once when this statically rendered page is built rather than on every
 * request or in the browser.
 */
const template = loadMndaTemplate();

export default function NdaPage() {
  return <NdaCreator template={template} />;
}
