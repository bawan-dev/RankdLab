"""Doubles eligibility: the sole supporting teammate matters explicitly."""

from app.sequence_detectors import LastCoverAdvance, RecoveryDrift


class SecondManAdvance(LastCoverAdvance):
    mode = "2v2"
    role = "second_man"
    category = "doubles_second_man_advance"


class UncoveredRecovery(RecoveryDrift):
    mode = "2v2"
    category = "doubles_uncovered_recovery"
