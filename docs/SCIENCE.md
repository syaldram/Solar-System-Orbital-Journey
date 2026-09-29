# Scientific Model

## Planet positions

Planet positions use [NASA/JPL Approximate Positions of the Planets](https://ssd.jpl.nasa.gov/planets/approx_pos.html), Table 2a and the required Table 2b periodic corrections for Jupiter through Neptune.

For each UTC simulation instant, the application approximates the Julian ephemeris date, evaluates the six time-varying Keplerian elements in centuries from J2000, solves Kepler’s equation, and rotates the orbital-plane vector into J2000 ecliptic coordinates. The published model is valid from 3000 BC through AD 3000; the application journey begins on the visitor’s current UTC date and ends 165 Julian years later.

The model is lower accuracy than JPL Horizons. Earth is the Earth–Moon barycenter. The interface therefore says “calculated from JPL approximate orbital elements,” never “real-time NASA tracking.” Unit tests compare J2000 results with independent JPL Horizons vectors using the published approximation error scale.

## Planet rotation and physical values

Mean radii, sidereal rotation periods, and sidereal orbital periods come from [JPL Planetary Physical Parameters](https://ssd.jpl.nasa.gov/planets/phys_par.html). Obliquities come from the [NASA/NSSDC Planetary Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/).

Venus and Uranus use their full published physical-pole obliquities. Their globe meshes rotate positively about those poles using the absolute period magnitude; the signed source values remain in metadata. This avoids applying the retrograde convention twice. Giant-planet periods are adopted body/reference rotations because their visible atmospheres rotate differentially.

At year-per-second and decade-per-second playback, surface rotation is visually stabilized to avoid temporal aliasing. Orbital positions always remain derived from simulation time.

## Reference frames

**Travel with Sun** renders heliocentric J2000 ecliptic coordinates.

**Watch from Space** converts heliocentric vectors to a J2000 galactic frame and adds a simplified local Sun translation. The transform first rotates from ecliptic to equatorial coordinates using the J2000 obliquity and then applies the standard J2000 equatorial-to-galactic matrix. This preserves the approximately 60.19° inclination and its line of nodes.

The local Sun model adopts 220 km/s. Across 165 Julian years the Sun travels about 7,657 AU (about 0.121 light-years), while traversing only about 0.000258° of a roughly 230-million-year galactic orbit. The local path is therefore drawn as a straight tangent. The rolling view uses an abstract coordinate grid rather than pretending nearby stars are fixed.

**Galaxy Overview** is explicitly schematic. It places the Sun about 26,000 light-years from the center on a simplified circular path and omits vertical and radial oscillations. The rendered spiral is not a star-by-star map and does not assert exact spiral-arm geometry.

## Display scale

Relative semi-major-axis distances and eccentricities are preserved in Solar-System views. Planet radii and the Sun are enhanced independently for legibility. Wide views replace tiny bodies with visible markers and labels. The full local journey keeps the true distance ratio and represents the Solar System as a compact marker.
