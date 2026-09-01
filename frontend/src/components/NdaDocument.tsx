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
 * ("Signature", "Date") are intentionally left blank, and given room to be
 * completed by hand.
 */
const PARTY_CELL: Record<string, (party: PartyValues) => string> = {
  "print-name": (party) => party.signatoryName,
  title: (party) => party.signatoryTitle,
  company: (party) => party.company,
  "notice-address": (party) => party.noticeAddress,
};

/** Small-caps label styling, borrowed from the UI typeface for contrast. */
const eyebrow =
  "font-sans text-[11px] font-semibold tracking-[0.14em] text-neutral-900 uppercase";

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
    <ul className="space-y-2">
      {options.map((option, index) => (
        <li
          key={option}
          className={
            "flex gap-3 " +
            (index === selected ? "text-neutral-900" : "text-neutral-500")
          }
        >
          <span aria-hidden className="shrink-0 font-sans text-sm leading-7">
            {index === selected ? "☒" : "☐"}
          </span>
          <span>
            {/* The glyph is decorative, and colour alone cannot carry which
                alternative the parties chose. */}
            <span className="sr-only">
              {index === selected ? "Selected: " : "Not selected: "}
            </span>
            {option}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** A "Governing Law: Delaware" style line inside a section. */
function SubField({ label, value }: { label: string; value: FieldValue }) {
  return (
    <div className="flex flex-wrap gap-x-2">
      <span className="font-sans text-xs tracking-wide text-neutral-500 uppercase">
        {label}
      </span>
      <Value value={value} />
    </div>
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
        <p className="mnda-justify">
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
        <div className="space-y-2">
          <SubField label="Governing Law" value={fields["Governing Law"]} />
          <SubField label="Jurisdiction" value={fields.Jurisdiction} />
        </div>
      );

    case "mnda-modifications":
      return values.modifications.trim() ? (
        <p className="mnda-justify whitespace-pre-line">
          {values.modifications.trim()}
        </p>
      ) : (
        <p>
          <span className="mnda-value mnda-unfilled">None.</span>
        </p>
      );

    default:
      return (
        <>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph} className="mnda-justify">
              {paragraph}
            </p>
          ))}
        </>
      );
  }
}

function SignatureBlock({
  template,
  values,
}: {
  template: CoverPageTemplate;
  values: NdaValues;
}) {
  const parties = [values.party1, values.party2];

  return (
    <table className="mt-8 w-full table-fixed border-collapse">
      <thead>
        <tr>
          <th className="w-40 border-b-2 border-neutral-900 pb-2 text-left">
            <span className="sr-only">Field</span>
          </th>
          {template.partyHeadings.map((heading) => (
            <th
              key={heading}
              className="border-b-2 border-neutral-900 px-4 pb-2 text-left font-sans text-[11px] font-semibold tracking-[0.2em] text-neutral-700 uppercase"
            >
              {heading}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {template.signatureRows.map((row) => {
          // Rows with nothing to fill in are left tall and empty to sign.
          const isBlank = !(row.slug in PARTY_CELL);
          return (
            <tr key={row.slug} className="align-top">
              <th
                scope="row"
                className={`border-b border-neutral-200 py-3 pr-4 text-left font-sans text-[11px] font-medium tracking-[0.08em] text-neutral-500 uppercase ${
                  isBlank ? "h-16" : ""
                }`}
              >
                {row.label}
                {row.note ? (
                  <span className="mt-1 block text-[10px] tracking-normal text-neutral-500 normal-case">
                    {row.note}
                  </span>
                ) : null}
              </th>
              {parties.map((party, index) => (
                <td
                  key={template.partyHeadings[index] ?? index}
                  className="border-b border-l border-neutral-200 px-4 py-3 whitespace-pre-line"
                >
                  {PARTY_CELL[row.slug]?.(party).trim() ?? ""}
                </td>
              ))}
            </tr>
          );
        })}
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
      aria-label={coverPage.title}
      className="mx-auto max-w-[52rem] bg-white px-8 py-12 font-serif text-[15px] leading-7 text-neutral-900 sm:px-16 sm:py-16"
    >
      <header className="text-center">
        <p className="font-sans text-[11px] font-semibold tracking-[0.35em] text-neutral-500 uppercase">
          Cover Page
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance">
          {coverPage.title}
        </h2>
        <div className="mt-6 border-t-2 border-neutral-900" />
      </header>

      <section className="mt-8">
        <h3 className={eyebrow}>{coverPage.usingHeading}</h3>
        <p
          className="mnda-justify mt-3 text-[14px] leading-6 text-neutral-600"
          dangerouslySetInnerHTML={{ __html: coverPage.usingBodyHtml }}
        />
      </section>

      <dl className="mt-10 border-t border-neutral-300">
        {coverPage.sections.map((section) => (
          <div
            key={section.slug}
            className="grid gap-x-10 gap-y-2 border-b border-neutral-200 py-5 sm:grid-cols-[12rem_minmax(0,1fr)]"
          >
            <dt>
              <span className={eyebrow}>{section.title}</span>
              {section.label ? (
                <span className="mt-1 block font-sans text-xs leading-5 text-neutral-500">
                  {section.label}
                </span>
              ) : null}
            </dt>
            <dd>
              <SectionBody section={section} values={values} fields={fields} />
            </dd>
          </div>
        ))}
      </dl>

      {coverPage.signatureIntro ? (
        <p className="mnda-justify mt-10">{coverPage.signatureIntro}</p>
      ) : null}
      <SignatureBlock template={coverPage} values={values} />

      <p
        className="mnda-attribution"
        dangerouslySetInnerHTML={{ __html: coverPage.attributionHtml }}
      />

      <section className="mnda-page-break mt-16 border-t-2 border-neutral-900 pt-12">
        <h3 className="text-center font-sans text-[11px] font-semibold tracking-[0.35em] text-neutral-500 uppercase">
          {standardTerms.title}
        </h3>
        <div
          className="mnda-terms mt-8"
          dangerouslySetInnerHTML={{
            __html: fillCoverPageLinks(standardTerms.bodyHtml, fields),
          }}
        />
      </section>
    </article>
  );
}
