# Prelegal frontend — Mutual NDA creator

Turns the repository's Common Paper Mutual NDA templates into a completed,
downloadable agreement. A placeholder sign-in at `/` leads to the creator at
`/nda/`, where the user chats with an assistant that fills in the cover page,
the document updates live beside the chat, and **Download PDF** prints it.

The sign-in does not authenticate: nothing is checked, stored or sent, and
`/nda/` can be opened directly. Real accounts arrive with the multi-user stage.

## Running it

```bash
npm install
npm run dev     # http://localhost:3000
```

Under `npm run dev`, `/api` is proxied to the backend at http://localhost:8000,
so start that too (see [../backend/README.md](../backend/README.md)) for the chat
to answer.

The app reads the agreement text from the repository's `templates/` at build
time, found by walking up from the working directory — so a build started from
the repository root works too.

```bash
npm run build   # static export to out/ (also type-checks)
npm run lint
npm test        # vitest run
```

## How it works

The agreement's wording is never restated in the UI. `src/lib/mnda/source.ts`
reads the two markdown templates in a server component at module scope, so
parsing happens once when the statically rendered page is built:

`loadMndaTemplate` then checks what it parsed against what this app can render
— the six cover-page sections and exactly two parties — and throws if they do
not match. An upstream heading rename would otherwise leave a section blank
while the Standard Terms went on citing it, producing a cover page that
contradicts its own agreement. The same reasoning applies to the signing
statement, which `parseCoverPage` locates by its wording rather than by its
position, so a template that stops carrying it fails the build instead of
yielding an agreement with no execution clause.

| File | Role |
| --- | --- |
| `templates/mutual-nda-coverpage.md` | The fill-in cover page: section headings, `<label>` hints, the bracketed placeholders, the checkbox alternatives, and the signature table. |
| `templates/mutual-nda.md` | The Standard Terms, rendered to HTML with its `<span class="coverpage_link">` cross-reference markers left intact. |

The parsed template is handed to a client component that owns the document
values. After every chat turn, `fillCoverPageLinks` swaps those markers for the user's
answers — so §5 reads "expires at the end of the 2-year term" rather than
pointing back at the cover page. Values are HTML-escaped before they are spliced
into the Standard Terms markup.

Fields the user has not answered fall back to the template's own bracketed hint
(`[Fill in state]`), shown greyed and italic, so the preview always reads as a
plausible document. The two durations start unanswered too: no alternative is
ticked until the user chooses one.

### Chat

`NdaChat` posts the whole conversation and the current values to
`POST /api/nda/chat` on every turn, along with the user's local date. The
backend asks the LLM for a reply plus the fields the user just stated, merges
those into the values, and returns the merged values, the required fields still
missing, and whether the agreement is complete. The creator shows that status
above the chat. Nothing is kept server-side, so a refresh starts over.

### Layout

```
src/
  app/page.tsx              placeholder sign-in
  app/nda/page.tsx          server component; loads and parses the templates
  components/SignIn.tsx     sign-in form; submitting navigates to /nda/
  components/NdaCreator.tsx client shell; values, status, print button, two-pane layout
  components/NdaChat.tsx    the conversation with the assistant
  components/NdaDocument.tsx the document, and the print target
  lib/mnda/
    source.ts               finds and reads templates/ (server only)
    markdown.ts             line endings, titles, markdown rendering
    coverPage.ts            cover page parser
    standardTerms.ts        standard terms parser
    document.ts             display formatting and cross-reference filling
    values.ts               the document's value type and empty state
    chat.ts                 the chat API call
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

Browsers print their own date, title, URL and page numbers inside the page
margin. The print stylesheet sets `@page { margin: 0 }`, which leaves them no
room, and makes the 18 mm margin from the document's padding instead, with
`box-decoration-break: clone` repeating it on every sheet. Verified in Chrome
with headers and footers switched on.

### Deploying

`next.config.ts` sets `output: "export"`, so `npm run build` writes plain files
to `out/` and the FastAPI backend serves them. The templates are read only at
build time, which is why the Docker build copies `templates/` beside
`frontend/`. `trailingSlash: true` emits `nda/index.html`, the layout the
backend's static file server resolves.

## Testing

`npm test` runs Vitest against the real templates, so markdown the parsers
cannot handle fails the suite. [TESTING.md](TESTING.md) lists what the automated
tests cover and carries the manual checklist for everything a browser has to
answer — print output above all, plus layout, keyboard access and other
browsers.

## Scope

Mutual NDA only. The conversation lives in the browser and is lost on refresh;
persistence arrives with the multi-user stage.

The templates are Common Paper's, licensed CC BY 4.0; see
`../templates/LICENSE.txt`.
