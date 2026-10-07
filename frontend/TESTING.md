# Testing the Mutual NDA creator

## Automated

```bash
npm test          # vitest run
npm run test:watch
npm run lint
npm run build     # type-checks as part of the build
```

93 tests across eight files. They run against the **real** templates in
`../templates/`, not fixtures, so a change to the source markdown that the
parsers cannot handle fails the suite. They also run through the React
Compiler, as `next build` does, so the components under test are the ones that
ship.

| File | Covers |
| --- | --- |
| `src/lib/mnda/coverPage.test.ts` | The cover-page parser, against a synthetic CRLF fixture exercising every shape (labels, bare and prefixed placeholders, checkbox options, the signature table, the signing statement that has no heading of its own) and against the real template. Includes the three malformed-template errors. |
| `src/lib/mnda/standardTerms.test.ts` | Title extraction, markdown rendering, and that the ten `coverpage_link` markers survive parsing — losing them would silently leave the agreement citing a cover page instead of real values. |
| `src/lib/mnda/source.test.ts` | The load-time contract: that a renamed cover-page section or a template naming other than two parties fails the build rather than rendering an empty row while the Standard Terms go on citing it. |
| `src/lib/mnda/document.test.ts` | Year pluralisation, time-zone-safe date formatting, placeholder lookup, and the phrasing of all six cross-references in both their fixed and open-ended forms. Includes the escaping check: markup typed into a field must arrive as text, since the result goes through `dangerouslySetInnerHTML`. |
| `src/components/NdaDocument.test.tsx` | What the document renders for empty and filled values: placeholder fallbacks, which checkbox is ticked, the eleven clauses, each party's signature column, and the rows deliberately left blank to sign. |
| `src/components/NdaForm.test.tsx` | That labels, help text and placeholders come from the template rather than hardcoded copy; the years field's editing behaviour. |
| `src/components/SignIn.test.tsx` | The placeholder sign-in navigates to the creator once both fields are filled in, and not before. |
| `src/components/NdaCreator.test.tsx` | End to end: typing updates the document, clearing restores the placeholder, a changed term reaches the clause citing it, Reset clears both panes, and the page is renamed for printing then restored. |

## Manual

These need a real browser and a real print pipeline, which jsdom cannot stand in
for. Run `npm run dev` and work through them.

### 1. Print output — the important one

Fill in every field, then **Download PDF**.

- [ ] The form, header and buttons are absent from the printed pages.
- [ ] The cover page ends and the **Standard Terms begin on a fresh sheet**.
- [ ] Margins are even on every page, including continuation pages.
- [ ] No clause is split awkwardly across a page break, and no heading is left
      stranded at the foot of a page.
- [ ] Signature rows are not broken across sheets.
- [ ] Clause numbers stay in the margin, with the text block aligned under
      itself, on every page.
- [ ] Links are black and unlaid, not blue and underlined.
- [ ] Switching off **More settings → Headers and footers** removes the browser's
      URL, date and page numbers. (The app cannot do this; see README.)
- [ ] The suggested filename is the agreement's name — "Mutual NDA — Acme, Inc.
      and Globex Corp" once both companies are filled in, otherwise "Mutual
      Non-Disclosure Agreement".
- [ ] After the dialog closes, the browser tab is called "Prelegal — Mutual NDA
      creator" again.

Repeat with **nothing** filled in: the placeholders should print greyed and in
brackets, and the document should still be a coherent, complete agreement.

### 2. Appearance

- [ ] The agreement is set in a serif face; the form and header are not.
- [ ] The cover page reads as a term sheet — field names in the left column,
      answers beside them, ruled between rows.
- [ ] Unanswered fields are visibly muted against answered ones — but still
      legible: they and the attribution footers should clear 4.5:1 against
      white.
- [ ] Values substituted into the Standard Terms are underlined, so it is clear
      which words came from the form.
- [ ] The attribution footers are quiet: small, grey, links not underlined.

### 3. Layout

- [ ] At a desktop width the form and document sit side by side, and the form
      column scrolls independently while the document stays put.
- [ ] Below the `lg` breakpoint they stack, and nothing overflows sideways.
- [ ] A very long Purpose, a long company name, and a multi-line notice address
      all wrap rather than breaking the layout or the signature table.

### 4. Keyboard and assistive technology

- [ ] Every field is reachable by Tab, in a sensible order, with a visible focus
      ring.
- [ ] Each input is announced with its label and its help text (automated, but
      worth hearing once in a real screen reader).
- [ ] The duration radio groups can be operated with arrow keys, and the years
      field is skipped when its alternative is not selected.
- [ ] In the document, a screen reader distinguishes the chosen alternative from
      the one not chosen, in both duration sections.
- [ ] A screen reader reads the signature block as a table with the party names
      as column headers.

### 5. Browsers

Chrome is the development target. Check at least one other, since the download
depends on the browser's print implementation:

- [ ] Chrome — layout and print.
- [ ] Firefox — print settings live under Page Setup → Margins & Header/Footer.
- [ ] Safari, if you have it — check the page break in particular.

### 6. Deployment

- [ ] `npm --prefix frontend run build` from the repository root succeeds — the
      templates are found by walking up, not by assuming the working directory.
- [ ] `scripts/start-*` builds the image, and at http://localhost:8000 the
      sign-in screen appears; submitting it with any email and password opens
      the creator at `/nda/`, and a hard refresh there reloads the creator.
- [ ] Submitting the sign-in with a field empty is blocked by the browser.

### 7. The templates are the source of truth

- [ ] Edit a heading or a `<label>` in `../templates/mutual-nda-coverpage.md`,
      restart the dev server, and confirm the change appears in both the form
      and the document.
- [ ] Restore the file afterwards.

### 8. Console

- [ ] No errors or hydration warnings on load or while typing.
