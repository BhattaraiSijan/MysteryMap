export type RoundState = {
  layerId: string;
  points: number;
  extremesBought: boolean;
  unitBought: boolean;
  numbersBought: string[];
  wrongGuesses: string[];
  status: "playing" | "solved";
};

export type Action =
  | { type: "buyExtremes" }
  | { type: "buyUnit" }
  | { type: "buyNumber"; code: string }
  | { type: "guess"; optionId: string };

export type Refusal = "solved" | "alreadyBought" | "noData" | "alreadyStruck" | "notAnOption";

export type Result = { ok: true; state: RoundState } | { ok: false; reason: Refusal };
