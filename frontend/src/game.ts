// One game configuration, shared account/navigation infrastructure. No plugin runtime.
export const rocketLeague = {
  id: "rocket-league",
  name: "Rocket League",
  playlists: [
    {
      id: "1v1",
      name: "Duel",
      focus: "Own the next decision",
      detail: "Recovery, exposure and the space between you and your goal.",
    },
    {
      id: "2v2",
      name: "Doubles",
      focus: "Make room for two",
      detail: "Challenge together with purpose. Keep a supporting position.",
    },
    {
      id: "3v3",
      name: "Standard",
      focus: "See the whole team",
      detail: "Defensive lanes, team spacing and coverage under pressure.",
    },
  ],
} as const;
export type Playlist = (typeof rocketLeague.playlists)[number]["id"];
