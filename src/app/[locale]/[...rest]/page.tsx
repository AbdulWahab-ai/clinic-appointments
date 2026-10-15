import { notFound } from "next/navigation";

/** Routes every unknown localized path to the localized not-found page. */
export default function CatchAll() {
  notFound();
}
