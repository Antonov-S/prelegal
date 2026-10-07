# Testing the Mutual NDA creator

## Automated

```bash
npm test          # vitest run
npm run test:watch
npm run lint
npm run build     # type-checks as part of the build
```

80 tests across seven files. They run against the **real** templates in
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
| `src/components/NdaDocument.test.tsx` | What the document renders for empty and filled values: placeholder fallbacks, that no duration is ticked until chosen, which checkbox is ticked, the eleven clauses, each party's signature column, and the rows deliberately left blank to sign. |
| `src/components/SignIn.test.tsx` | The placeholder sign-in navigates to the creator once both fields are filled in, and not before. |
| `src/components/NdaCreator.test.tsx` | End to end with `fetch` mocked: the conversation and current values are sent each turn, replies appear, extracted values reach the document (escaped), the missing-fields and complete statuses show, a failed turn keeps the message for retry, Reset clears chat and document, and the page is renamed for printing then restored. |

The backend's chat logic is tested separately: `uv run pytest` in `../backend`.

## Manual

These need a real browser and a real print pipeline, which jsdom cannot stand in
for. Run `npm run dev` and work through them.

### 1. Print output — the important one

Complete the conversation until every field is filled, then **Download PDF**.

- [ ] The chat, status, header and buttons are absent from the printed pages.
- [ ] The cover page ends and the **Standard Terms begin on a fresh sheet**.
- [ ] Margins are even on every page, including continuation pages.
- [ ] No clause is split awkwardly across a page break, and no heading is left
      stranded at the foot of a page.
- [ ] Signature rows are not broken across sheets.
- [ ] Clause numbers stay in the margin, with the text block aligned under
      itself, on every page.
- [ ] Links are black and unlaid, not blue and underlined.
- [ ] No browser date, title, URL or page numbers on any page, even with
      **More settings → Headers and footers** switched on.
- [ ] The suggested filename is the agreement's name — "Mutual NDA — Acme, Inc.
      and Globex Corp" once both companies are filled in, otherwise "Mutual
      Non-Disclosure Agreement".
- [ ] After the dialog closes, the browser tab is called "Prelegal — Mutual NDA
      creator" again.

Repeat with **nothing** filled in: the placeholders should print greyed and in
brackets, and the document should still be a coherent, complete agreement.

### 2. Appearance

- [ ] The agreement is set in a serif face; the chat and header are not.
- [ ] The cover page reads as a term sheet — field names in the left column,
      answers beside them, ruled between rows.
- [ ] Unanswered fields are visibly muted against answered ones — but still
      legible: they and the attribution footers should clear 4.5:1 against
      white.
- [ ] Values substituted into the Standard Terms are underlined, so it is clear
      which words came from the chat.
- [ ] The attribution footers are quiet: small, grey, links not underlined.

### 3. Layout

- [ ] At a desktop width the chat and document sit side by side; the chat
      fills the viewport height and its messages scroll inside it.
- [ ] Below the `lg` breakpoint they stack, and nothing overflows sideways.
- [ ] A very long Purpose, a long company name, and a multi-line notice address
      all wrap rather than breaking the layout or the signature table.

### 4. Keyboard and assistive technology

- [ ] The message box and Send are reachable by Tab with a visible focus ring;
      Enter sends and Shift+Enter starts a new line.
- [ ] A screen reader announces new assistant replies (the log is a live
      region) and the status line as it changes.
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
      restart the dev server, and confirm the change appears in the document.
- [ ] Restore the file afterwards.

### 8. Conversation quality

Needs `OPENROUTER_API_KEY` in the repository's `.env`.

- [ ] Giving several details in one message fills all of them.
- [ ] Nothing is filled that was not said; vague answers prompt a question.
- [ ] Changing an earlier answer ("make it 3 years instead") updates it and
      keeps everything else.
- [ ] Once nothing is missing, the status says the agreement is complete.

### 9. Console

- [ ] No errors or hydration warnings on load or while typing.
