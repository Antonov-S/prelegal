/** The answers a user gives in the form, and the empty state they start from. */

export type PartyValues = {
  company: string;
  signatoryName: string;
  signatoryTitle: string;
  noticeAddress: string;
};

/**
 * How long something lasts. The cover page asks this twice — for the agreement
 * and for the confidentiality obligation — and offers the same shape of answer
 * both times: a fixed number of years, or an open-ended alternative.
 */
export type Duration = {
  fixed: boolean;
  years: number;
};

export type NdaValues = {
  purpose: string;
  /** ISO `yyyy-mm-dd`, as produced by `<input type="date">`. */
  effectiveDate: string;
  term: Duration;
  confidentiality: Duration;
  governingLaw: string;
  jurisdiction: string;
  modifications: string;
  party1: PartyValues;
  party2: PartyValues;
};

const emptyParty: PartyValues = {
  company: "",
  signatoryName: "",
  signatoryTitle: "",
  noticeAddress: "",
};

/**
 * Deliberately empty rather than pre-filled with today's date: the page is
 * statically rendered, so a server-computed date would go stale and could
 * disagree with the client on hydration.
 */
export const emptyValues: NdaValues = {
  purpose: "",
  effectiveDate: "",
  term: { fixed: true, years: 1 },
  confidentiality: { fixed: true, years: 1 },
  governingLaw: "",
  jurisdiction: "",
  modifications: "",
  party1: { ...emptyParty },
  party2: { ...emptyParty },
};
