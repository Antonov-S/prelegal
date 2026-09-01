/** The answers a user gives in the form, and the empty state they start from. */

export type PartyValues = {
  company: string;
  signatoryName: string;
  signatoryTitle: string;
  noticeAddress: string;
};

export type TermMode = "expires" | "until-terminated";
export type ConfidentialityMode = "years" | "perpetuity";

export type NdaValues = {
  purpose: string;
  /** ISO `yyyy-mm-dd`, as produced by `<input type="date">`. */
  effectiveDate: string;
  termMode: TermMode;
  termYears: number;
  confidentialityMode: ConfidentialityMode;
  confidentialityYears: number;
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
  termMode: "expires",
  termYears: 1,
  confidentialityMode: "years",
  confidentialityYears: 1,
  governingLaw: "",
  jurisdiction: "",
  modifications: "",
  party1: { ...emptyParty },
  party2: { ...emptyParty },
};
