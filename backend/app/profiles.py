"""Self-reported Rocket League profile. No external rank verification."""

from typing import Literal

from pydantic import BaseModel, Field, model_validator

Playlist = Literal["1v1", "2v2", "3v3"]
TIERS = ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Champion", "Grand Champion"]
RANKS = [
    "Unranked",
    *[f"{tier} {level}" for tier in TIERS for level in ("I", "II", "III")],
    "Supersonic Legend",
]


class RankInput(BaseModel):
    rank: str
    division: int | None = Field(default=None, ge=1, le=4, strict=True)
    mmr: int | None = Field(default=None, ge=0, le=5000, strict=True)

    @model_validator(mode="after")
    def valid_rank(self):
        if self.rank not in RANKS:
            raise ValueError("Choose a supported competitive rank")
        if self.rank in ("Unranked", "Supersonic Legend") and self.division is not None:
            raise ValueError("Unranked and Supersonic Legend do not have divisions")
        return self


class RocketProfileInput(BaseModel):
    display_name: str = Field(default="", max_length=60)
    platform: Literal["", "PC", "PlayStation", "Xbox", "Switch"] = ""
    onboarding_complete: bool = True


def rank_dict(record):
    return {
        "rank": record.rank,
        "division": record.division,
        "mmr": record.mmr,
        "playlist": record.playlist,
        "source": "user-entered",
        "updated_at": record.created_at,
    }
