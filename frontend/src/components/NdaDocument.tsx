import {
  applyYears,
  coverPageLinkValues,
  fillCoverPageLinks,
  type FieldValue,
} from "@/lib/mnda/document";
import type {
  CoverPageSection,
  CoverPageTemplate,
  StandardTermsTemplate,
} from "@/lib/mnda/types";
import type { NdaValues, PartyValues } from "@/lib/mnda/values";

/**
 * Signature-table rows that draw from the form. Rows absent from this map
 * ("Signature", "Date") are intentionally left blank to be completed by hand.
 */
const PARTY_CELL: Record<string, (party: PartyValues) => string> = {
  "print-name": (party) => party.signatoryName,
  title: (party) => party.signatoryTitle,
  company: (party) => party.company,
  "notice-address": (party) => party.noticeAddress,
};

function Value({ value }: { value: FieldValue }) {
  return (
    <span className={value.filled ? "mnda-value" : "mnda-value mnda-unfilled"}>
      {value.text}
    </span>
  );
}

function Options({
  options,
  selected,
}: {
  options: string[];
  selected: number;
}) {
  return (
    <ul className="not-prose mt-2 space-y-1.5">
      {options.map((option, index) => (
        <li key={option} className="flex gap-2 text-neutral-800">
          <span aria-hidden className="font-mono">
            {index === selected ? "☒" : "☐"}
          </span>
          <span className={index === selected ? "" : "text-neutral-400"}>
            {option}
          </span>
        </li>
      ))}
    </ul>
  );
}

function SectionBody({
  section,
  values,
  fields,
}: {
  section: CoverPageSection;
  values: NdaValues;
  fields: Record<string, FieldValue>;
}) {
  switch (section.slug) {
    case "purpose":
      return (
        <p>
          <Value value={fields.Purpose} />
        </p>
      );

    case "effective-date":
      return (
        <p>
          <Value value={fields["Effective Date"]} />
        </p>
      );

    // The template lists "expires after N years" first and the open-ended
    // alternative second, in both duration sections.
    case "mnda-term":
      return (
        <Options
          options={section.options.map((option, index) =>
            index === 0 ? applyYears(option, values.termYears) : option,
          )}
          selected={values.termMode === "expires" ? 0 : 1}
        />
      );

    case "term-of-confidentiality":
      return (
        <Options
          options={section.options.map((option, index) =>
            index === 0
              ? applyYears(option, values.confidentialityYears)
              : option,
          )}
          selected={values.confidentialityMode === "years" ? 0 : 1}
        />
      );

    case "governing-law-jurisdiction":
      return (
        <>
          <p>
            Governing Law: <Value value={fields["Governing Law"]} />
          </p>
          <p>
            Jurisdiction: <Value value={fields.Jurisdiction} />
          </p>
        </>
      );

    case "mnda-modifications":
      return values.modifications.trim() ? (
        <p className="whitespace-pre-line">{values.modifications.trim()}</p>
      ) : (
        <p>
          <span className="mnda-value mnda-unfilled">None.</span>
        </p>
      );

    default:
      return (
        <>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </>
      );
  }
}

function SignatureTable({
  template,
  values,
}: {
  template: CoverPageTemplate;
  values: NdaValues;
}) {
  const parties = [values.party1, values.party2];

  return (
    <table className="not-prose mt-6 w-full table-fixed border-collapse text-sm">
      <thead>
        <tr>
          <th className="w-44 border border-neutral-300 bg-neutral-50 p-2 text-left font-semibold">
            <span className="sr-only">Field</span>
          </th>
          {template.partyHeadings.map((heading) => (
            <th
              key={heading}
              className="border border-neutral-300 bg-neutral-50 p-2 text-center font-semibold"
            >
              {heading}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {template.signatureRows.map((row) => (
          <tr key={row.slug}>
            <th className="border border-neutral-300 p-2 text-left align-top font-medium">
              {row.label}
              {row.note ? (
                <span className="block text-xs font-normal text-neutral-500">
                  {row.note}
                </span>
              ) : null}
            </th>
            {parties.map((party, index) => {
              const cell = PARTY_CELL[row.slug]?.(party).trim() ?? "";
              return (
                <td
                  key={template.partyHeadings[index] ?? index}
                  className="h-10 border border-neutral-300 p-2 text-center align-middle whitespace-pre-line"
                >
                  {cell}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function NdaDocument({
  coverPage,
  standardTerms,
  values,
}: {
  coverPage: CoverPageTemplate;
  standardTerms: StandardTermsTemplate;
  values: NdaValues;
}) {
  const fields = coverPageLinkValues(coverPage, values);

  return (
    <article
      id="mnda-document"
      className="prose prose-neutral prose-headings:font-semibold max-w-none bg-white px-8 py-10 text-[15px] sm:px-12"
    >
      <h1 className="mb-8 text-center">{coverPage.title}</h1>

      <h2 className="text-base tracking-wide uppercase">
        {coverPage.usingHeading}
      </h2>
      <p dangerouslySetInnerHTML={{ __html: coverPage.usingBodyHtml }} />

      {coverPage.sections.map((section) => (
        <section key={section.slug} className="mt-6">
          <h3 className="mb-0">{section.title}</h3>
          {section.label ? (
            <p className="mt-0 text-sm text-neutral-500">{section.label}</p>
          ) : null}
          <SectionBody section={section} values={values} fields={fields} />
        </section>
      ))}

      {coverPage.signatureIntro ? (
        <p className="mt-8">{coverPage.signatureIntro}</p>
      ) : null}
      <SignatureTable template={coverPage} values={values} />

      <p
        className="mt-6 text-xs text-neutral-500"
        dangerouslySetInnerHTML={{ __html: coverPage.attributionHtml }}
      />

      <div className="mnda-page-break mt-12 border-t border-neutral-200 pt-10">
        <h2>{standardTerms.title}</h2>
        <div
          dangerouslySetInnerHTML={{
            __html: fillCoverPageLinks(standardTerms.bodyHtml, fields),
          }}
        />
      </div>
    </article>
  );
}
