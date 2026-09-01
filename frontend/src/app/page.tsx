import NdaCreator from "@/components/NdaCreator";
import { loadMndaTemplate } from "@/lib/mnda/source";

/**
 * The templates are read from disk here, in a server component, so the parsing
 * happens once when this statically rendered page is built rather than on every
 * request or in the browser.
 */
const template = loadMndaTemplate();

export default function Home() {
  return <NdaCreator template={template} />;
}
