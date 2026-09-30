# Separate Solar-System and galactic clocks

Solar-System views use the 165-Julian-year simulated UTC date for JPL-based planetary calculations, while Galaxy Overview uses a separate Galactic elapsed time from zero to one approximately 230-million-year schematic orbit. The clocks never advance each other because 165 years produces no legible galactic rotation, while feeding millions of years into the planetary model would exceed its validity and falsely present schematic galactic motion as an ephemeris.

## Consequences

Galaxy Overview owns distinct playback speeds and reset/completion language. Switching views preserves the inactive Solar-System date and speed, while Galactic progress is retained only in memory for the current browser session. Shared URLs and local storage intentionally omit Galactic elapsed time.
