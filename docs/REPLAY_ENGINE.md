# Replay pipeline and contracts

The backend uses the actual `subtr-actor-py==1.5.1` native parser. The frontend
uses an original Three.js renderer rather than the optional upstream player.
There is no synthetic replacement for uploaded movement.

1. Authenticated multipart upload: binary `.replay`, 64 bytes–20 MiB, bounded
   total request, no path separators, UUID storage, 50 records/account.
2. SQL job transitions `queued -> processing -> ready | failed`. A background
   thread atomically claims jobs and runs native parsing in a subprocess.
   Abandoned claims become eligible after timeout + 60 seconds. Current intended
   deployment is one API process; horizontal scaling needs further soak testing.
3. Parser timeout 90s, Linux memory/CPU/output limits, max 108,000 frames,
   30 minutes and 8 players. Only Soccar is accepted. Windows has a timeout but
   lacks the Linux memory sandbox. Inputs are never executed as code.
4. Transport `schema_version:1` stores raw RL positions (Unreal units, Z up),
   quaternions, velocities, boost percent, null missing actors, source timestamps,
   relative time (first sample = 0), clock, metadata, scores and goal events.
5. Viewer conversion: `position = (x,z,y)/100`, quaternion `(x,z,y,-w)`.
   Cars face local +X. Linear positions and quaternion slerp interpolate only
   across contiguous states (<250ms, <1800 UU movement); gaps/teleports hold the
   previous sample until the next recorded frame. No interpolated fake cars
   appear in missing-data intervals.
6. Deterministic camera modes: whole-arena elevated, overhead, ball, selected
   player, aerial and coaching challenge framing. Transitions use exponential
   smoothing. A framing phase pauses before showing coaching text.
7. Coaching phases: watching -> framing -> review -> context/review or Continue.
   Context rewinds 3 seconds and returns to the selected moment, including when
   it was previously reviewed. Continue marks the moment reviewed and resumes.
   Red is recorded movement, green a proposed retreat/support arrow, gold the
   ball path. Proposed paths are illustrative decisions, not simulated futures.
8. Manual review notes and automatic rules use the same stored event contract.
   Reports and analytics are derived from those stored records. Manual notes do
   not count as automatic mistakes. Detections are kept when disputed; reports
   show feedback and raw trend counts include them.

## Initial detector coverage

`geometry-0.1.0`: potential double commits, defensive bunching, potential exposed
goal. See `backend/app/analysis.py` for exact thresholds and exceptions. Sustained
conditions, kickoff exclusion and cooldowns reduce repeated/transient flags.
Tests define positive and negative scenarios, not expert coaching ground truth.
No calibrated probabilities are emitted. Boost route efficiency, second-man
challenge interpretation and possession-aware tactical evaluation are future
work. Rates normalize active gameplay time; tactical opportunities are not yet
modelled, so rates must not be treated as a player skill score.

## Genuine replay verification

Run `python scripts/fetch-test-replay.py` before pytest or Playwright.
The script downloads a checksum-pinned public upstream test replay into ignored
`.research/`. It is not shipped in the app, used as coaching labels or advertised
as an SSL dataset. Verified doubles fixture: 9,530 frames, 4 players, final score
4–1, 347.947s recorded duration, approximately 305 active seconds.

The current rule thresholds emitted zero automatic findings on this fixture.
This is a compatibility result, not evidence of detector sensitivity or coaching
quality. Authored notes exercise coaching presentation on the same real frames.

No claim of compatibility with every replay version, custom arena or game mode.
