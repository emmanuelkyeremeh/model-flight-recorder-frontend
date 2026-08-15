const NUMBER = new Intl.NumberFormat("en-US");

/**
 * The opening card. It states what the field actually is, because the scale of
 * the choice is the whole point: a model picks one token out of tens of
 * thousands, several times a second, and calls the result a sentence.
 */
export function FlightBrief({ model, drawnTokens, phaseName, detail }) {
  const vocabulary = model?.vocabTokens ?? null;
  const drawn = drawnTokens ?? null;
  const partial = vocabulary !== null && drawn !== null && drawn < vocabulary;

  return (
    <section className="brief">
      <p className="brief__eyebrow">{phaseName}</p>
      <h1 className="brief__title">
        Every point out there is a word
        {" "}
        {model?.label ?? "the model"}
        {" "}
        can choose next.
      </h1>
      <p className="brief__body">
        {vocabulary === null ? (
          "Load a model, send it a prompt, and fly the route it takes through its own vocabulary."
        ) : (
          <>
            {partial
              ? `You are looking at ${NUMBER.format(drawn)} of its ${NUMBER.format(vocabulary)} tokens.`
              : `You are looking at all ${NUMBER.format(vocabulary)} of them.`}
            {" It picks one, then does it again. Send a prompt and follow the route."}
          </>
        )}
      </p>
      <p className="brief__detail">{detail}</p>
    </section>
  );
}
