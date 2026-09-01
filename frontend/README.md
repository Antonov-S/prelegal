# Prelegal frontend — Mutual NDA creator

A prototype web app (KAN-8) that turns the repository's Common Paper Mutual NDA
templates into a completed, downloadable agreement. The user fills in a cover
page, the document updates live beside the form, and **Download PDF** prints it.

## Running it

```bash
npm install
npm run dev     # http://localhost:3000
```

Run the commands from this directory — the app reads the agreement text from
`../templates/` at build time, resolved relative to the working directory.

```bash
npm run build   # production build (also type-checks)
npm run lint
npm test        # vitest run
npm run start   # serve the production build
```

## How it works

The agreement's wording is never restated in the UI. `src/lib/mnda/source.ts`
reads the two markdown templates in a server component at module scope, so
parsing happens once when the statically rendered page is built:

| File | Role |
| --- | --- |
| `templates/mutual-nda-coverpage.md` | The fill-in cover page: section headings, `<label>` hints, the bracketed placeholders used as form placeholders, the checkbox alternatives, and the signature table. |
| `templates/mutual-nda.md` | The Standard Terms, rendered to HTML with its `<span class="coverpage_link">` cross-reference markers left intact. |

The parsed template is handed to a client component that owns the form state.
On every keystroke, `fillCoverPageLinks` swaps those markers for the user's
answers — so §5 reads "expires at the end of the 2-year term" rather than
pointing back at the cover page. Values are HTML-escaped before they are spliced
into the Standard Terms markup.

Fields the user has not answered fall back to the template's own bracketed hint
(`[Fill in state]`), shown greyed and italic, so the preview always reads as a
plausible document.

### Layout

```
src/
  app/page.tsx              server component; loads and parses the templates
  components/NdaCreator.tsx client shell; form state, print button, two-pane layout
  components/NdaForm.tsx    the inputs
  components/NdaDocument.tsx the document, and the print target
  lib/mnda/
    source.ts               reads ../templates (server only)
    coverPage.ts            cover page parser
    standardTerms.ts        standard terms parser
    document.ts             display formatting and cross-reference filling
    values.ts               the form's value type and empty state
    types.ts                parsed template shapes
```

## Download

**Download PDF** calls `window.print()`. The print stylesheet in
`src/app/globals.css` hides the app chrome, drops the layout to a single column,
sets A4 margins, and starts the Standard Terms on a fresh sheet — so the PDF
matches the document on screen. Choosing "Save as PDF" in the browser's print
dialog writes the file locally.

Before printing, the page title is swapped for the agreement's name (and the two
companies, once both are filled in) and restored on `afterprint`. Chrome puts
the page title in its print header and uses it for the suggested filename, so
this keeps the name of the tool off the document.

The browser also prints its own address, date and page numbers along the page
edge unless the person printing switches off **More settings → Headers and
footers**. A page cannot suppress that from CSS — `@page { margin: 0 }` does
hide it in Chrome, but only by giving up every page margin. The form links to
the setting in its print hint. Generating the PDF in-process (jsPDF, pdf-lib)
is the way to stop depending on it.

## Testing

`npm test` runs Vitest against the real templates, so markdown the parsers
cannot handle fails the suite. [TESTING.md](TESTING.md) lists what the automated
tests cover and carries the manual checklist for everything a browser has to
answer — print output above all, plus layout, keyboard access and other
browsers.

## Scope

This is a prototype. There is no backend and nothing is persisted.

The templates are Common Paper's, licensed CC BY 4.0; see
`../templates/LICENSE.txt`.
