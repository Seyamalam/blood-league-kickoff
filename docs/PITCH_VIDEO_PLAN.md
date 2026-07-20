# Blood League: Kickoff — Pitch Video Plan

This is the recording and edit plan for a three-minute manual-gameplay pitch. Trailer Mode does not automate the game or change its balance. It only starts the production build with capture-oriented presentation settings; the player retains complete control.

## Required submission rules

The following requirements come directly from the GameJam rulebook and jam page:

- Create a short gameplay video that explains the game's mechanics, design/features, and connection to the theme.
- Upload the video to YouTube and provide the link.
- Use the rulebook naming format `TeamName_GameName`.
- Include `IUT_ICT_FEST_2026` in the YouTube title.
- Add `#IUT_ICT_FEST_2026_GAMEJAM` to the YouTube description.
- Submit the video by **July 21, 2026 at 11:59 PM**.
- Add the YouTube link to itch.io under **Gameplay Video / Trailer** after uploading.
- The organizers may use the video to showcase the game on social media.
- Implementation details are not required.
- The pitch contributes **10%** of judging and is scored on how clearly it explains mechanics, features, and theme adaptation.

The rules call the video “short” but do not state a hard duration limit. The production target is **2:50–3:00**.

Use this title:

`Huntrix_Blood League Kickoff | IUT_ICT_FEST_2026`

Start the description with:

`#IUT_ICT_FEST_2026_GAMEJAM`

## Capture settings

- Record the game itself at 1920×1080 fullscreen, 60 fps.
- Use the production build through `npm run desktop:trailer`; do not use the dev server.
- Set Render Quality to Quality, FPS Limit to 60 or 120, and disable the performance overlay.
- Keep game music around 45–55% and SFX around 80–100% so the edit has clean game sound beneath narration.
- Hide notifications, close unrelated windows, and keep the mouse captured during gameplay.
- Record each requested moment for longer than the final edit needs. Hold every menu or establishing shot still for at least five seconds.

## What to play and record

Record these as separate clips. The recording numbers are source footage targets, not final edit durations.

| Clip | Where to record             | What to do manually                                                                                                                        | Record |
| ---- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -----: |
| A    | Title screen                | Hold on the logo and animated stadium. Do not move the pointer.                                                                            |  8–10s |
| B    | Character Select / Creator  | Rotate through the roster, show traits, open the creator, change kit colors and one visual option.                                         | 20–25s |
| C    | Guided Kickoff              | Start the tutorial. Follow movement, aim, kick, recall, and dash guidance naturally.                                                       | 35–45s |
| D    | Enter the Pitch — fresh run | Start a normal run. Show the kickoff, controlled movement, the red aim line, two clean kicks, curve, recall, and a dash.                   | 45–60s |
| E    | Enter the Pitch — combat    | Keep playing the same run. Herd a group, kick through several enemies, show distinct enemy silhouettes and combat effects.                 | 45–60s |
| F    | Upgrade draft               | When a level-up appears, pause briefly on the choices, select an active or passive upgrade, then show its result in play.                  | 20–30s |
| G    | Goal and keeper             | Attack the goal, show the special keeper defending, then score a clean goal. Try twice if needed so the editor has both the save and goal. | 30–45s |
| H    | High-intensity run          | Continue until enemy density rises. Trigger an ultimate or strongest ability and capture a large clear.                                    | 45–60s |
| I    | Stadium/field montage       | From menus or separate runs, show two or three visibly different stadiums/fields. Hold each view for five seconds.                         | 20–30s |
| J    | Career/progression          | Show the tournament bracket, saved progression, unlocks, and leaderboard/profile surfaces. Scroll slowly.                                  | 20–30s |
| K    | Closing shot                | Capture the strongest goal, boss encounter, celebration, or high-density clear, then return to the title screen.                           | 15–20s |

Use **Guided Kickoff only for Clip C**. Use **Enter the Pitch for Clips D–H and K** because it is the authentic core game. Menus provide Clips A, B, I, and J. Do not spend trailer time showing settings, credits, technical diagnostics, or implementation details.

## Three-minute edit structure

### 0:00–0:12 — Hook

Visual: strongest one-second flashes—charged kick, enemy clear, keeper save, goal—then the title.

Voice-over:

> One ball. One survivor. An entire blood league standing between you and the final whistle. This is Blood League: Kickoff.

### 0:12–0:34 — Theme and premise

Visual: kickoff, wide stadium shot, player entering the field, first enemies approaching.

Voice-over:

> We interpreted “Kickoff” as more than the start of a football match. Every kickoff begins a new survival run, launches the ball into combat, and sets a chain of escalating events in motion. Football meets horde survival in a third-person roguelite built by Team Huntrix.

### 0:34–1:12 — Core mechanic

Visual: aiming line follows the player, kick, curve, recall, dash, multi-enemy hit.

Voice-over:

> You control both player and camera, aim directly across a full-sized football field, charge your shot, add curve, and kick through enemy formations. The ball is your weapon—but once it leaves your feet, you are exposed. Recall it through the crowd, reposition with a dash, and turn every return path into another attack. Simple football actions create a fast loop of aim, risk, movement, and impact.

### 1:12–1:43 — Roguelite depth

Visual: upgrade cards, passive choice, evolved attack, denser wave, ultimate.

Voice-over:

> Each run builds differently. Active weapons, passive boosts, evolutions, curses, and character traits change your damage, health, pickup range, ball control, and survival strategy. As the match intensifies, new enemy types and stronger formations force you to adapt before the field is overwhelmed.

### 1:43–2:08 — Football identity

Visual: keeper blocks a shot, player creates an opening, scores, celebration.

Voice-over:

> The goal is not decoration. A dedicated keeper guards it, shots can be denied, and scoring becomes a tactical objective inside the survival fight. The result is recognizably football, but every familiar rule has been transformed into combat.

### 2:08–2:34 — Breadth and progression

Visual: characters, creator, tournament bracket, unlocks, stadium montage.

Voice-over:

> Six heroes offer distinct play styles, while the character creator lets players build their own block-style footballer. Multiple stadiums, persistent progression, unlocks, challenges, leaderboards, and a tournament career give each kickoff a larger purpose beyond a single run.

### 2:34–2:52 — Polish and accessibility

Visual: clean HUD, different field lighting, strong VFX/SFX moments, short tutorial prompt.

Voice-over:

> A guided first-timer mode teaches the mechanics in play, scalable visual settings support different hardware, and responsive effects, music, and stadium atmosphere make every hit and goal feel decisive.

### 2:52–3:00 — Close

Visual: best final hit or goal, logo, team name.

Voice-over:

> The match starts with a kickoff. The survival story starts with yours. Blood League: Kickoff, by Team Huntrix.

## Editing notes

- Favor real uninterrupted actions over rapid cuts. The judges must understand what is happening.
- Put short labels on screen: `KICK • CURVE • RECALL`, `BUILD YOUR RUN`, `BREAK THE KEEPER`, and `EVERY KICKOFF IS A NEW START`.
- Keep UI readable; do not crop the HUD.
- Use music under the whole edit, but duck it beneath narration. Preserve kick, hit, recall, upgrade, keeper, and goal sounds.
- Export one narrated master and one music/game-audio-only backup.
- Recommended deliverable: H.264 MP4, 1920×1080, 60 fps, AAC audio.

## Final upload checklist

- [ ] The video is no longer than three minutes.
- [ ] Gameplay, mechanics/features, and theme connection are all explicitly explained.
- [ ] Only footage from the submitted/frozen game build is shown.
- [ ] YouTube title contains both the team/game naming format and `IUT_ICT_FEST_2026`.
- [ ] Description contains `#IUT_ICT_FEST_2026_GAMEJAM`.
- [ ] YouTube visibility allows judges to watch it (Public or Unlisted).
- [ ] The YouTube link is added to the itch.io Gameplay Video / Trailer field.
- [ ] Team Huntrix keeps a local copy of the final MP4 and narration-free backup.
