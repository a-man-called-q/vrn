// Shared event lines — emitted from any command on common transitions
// (acknowledgement, navigation back, user cancel).

export const events = {
  ack: [
    "got it",
    "noted",
    "alright",
    "okay",
    "sounds good",
  ],
  back: [
    "okay, what would you like to change?",
    "sure, back to that one",
    "alright, let's revisit",
    "no problem, pick again",
  ],
  cancelled: "all good — nothing was written. see you when you're ready",
  revisit: (step: string) => `back to ${step} — sure`,
}
