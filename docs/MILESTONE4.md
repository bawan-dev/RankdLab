# Milestone 4 implementation ledger

Working copy: C:/Code/RankdLab - backup, the existing backup directory. The path in
the brief did not exist. Original repository untouched. Branch:
feat/milestone4-intelligence. SQLite snapshot: ignored .research/pre-milestone4.db.
The two existing replay records and their files are preserved.

## A - tactical foundation

Plan: typed interpretation and bounded timestamp history around the existing parser.
Implemented tactical-1: recorded actors, nullable contextual features, provisional
depth-based roles, team symmetry, score/clock and explicit uncertainty.
TemporalWindow checks every frame for missing actors, gaps, duplicate timestamps,
clock resets and teleports. Travel time is an optimistic bound to the current ball
point, not an interception-order prediction. Low chassis is not grounded proof.
Touches, possession, demolition and boost-pad opportunities remain unavailable.
Five tactical and genuine-parser compatibility tests pass. No parser rewrite.
