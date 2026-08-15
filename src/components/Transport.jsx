import { InfoButton } from "./InfoButton.jsx";

/**
 * Scrubbing a recording, not driving a simulation. The slider walks the tokens
 * in the order they were produced; the findings fly the camera to the moments
 * worth arguing about.
 */
export function Transport({
  total,
  selected,
  onSelect,
  events,
  onFly,
  follow,
  onFollow,
  recording,
}) {
  if (total === 0) {
    return null;
  }

  return (
    <section className="transport" aria-label="Flight transport">
      <div className="transport__row">
        <button
          type="button"
          className={follow ? "btn btn--quiet is-active" : "btn btn--quiet"}
          aria-pressed={follow}
          onClick={() => onFollow(!follow)}
        >
          {recording ? "Follow live" : "Follow"}
        </button>

        <input
          className="transport__scrub"
          type="range"
          min="0"
          max={Math.max(0, total - 1)}
          value={Math.min(selected, Math.max(0, total - 1))}
          aria-label="Scrub through the recorded tokens"
          onChange={(event) => onSelect(Number(event.target.value))}
        />

        <span className="transport__count num">
          {String(Math.min(selected + 1, total)).padStart(3, "0")}
          <span className="transport__of">
            /
            {total}
          </span>
        </span>
        <InfoButton label="how to read the scene">
          Three kinds of node. The line strung between the bright ones is the
          route: every token the model actually produced, cyan where it was
          confident and yellow where it was not. The smaller nodes spurred off
          each one are the candidates it weighed at that step and rejected —
          click any node to read its numbers, and the candidates for that step
          light up and name themselves. The haze behind everything is the rest of
          the vocabulary — one point per word the model could have reached, drawn
          to scale and left unlabelled on purpose: the engine reports nothing
          about the words it did not shortlist, so no point out there is claimed
          to be any particular word.
        </InfoButton>
      </div>

      {events.length > 0 ? (
        <ul className="transport__events">
          {events.map((event) => (
            <li key={event.kind}>
              <button
                type="button"
                className={`chip chip--${event.kind}`}
                onClick={() => onFly(event.index)}
              >
                {event.title}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
