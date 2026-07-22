# CricScore (CS) - Platform Documentation

CricScore is in a real-time, full-stack live cricket scoring and broadcasting platform. It allows administrators to set up matches and log balls, while providing public viewers with live updates, scorecards, commentary, and points tables.

---

## 1. Tech Stack & Implementation

The application uses a client-server architecture split into two codebases:

### Frontend (`client/`)
- **React**: Renders the dynamic Single Page Application (SPA).
- **React Router DOM**: Manages client-side routing (e.g., dashboard, live matches, series, player profiles).
- **Axios**: Handles asynchronous REST API requests, configured with interceptors to automatically append JWT authentication headers.
- **Tailwind CSS**: Styling framework utilizing a dark dashboard theme with neon accent indicators.
- **Vite**: Super-fast bundler and hot-reloading development server.

### Backend (`server/`)
- **Node.js & Express**: Provides RESTful routing for user registration, match management, and career statistics.
- **Mongoose & MongoDB**: Object Data Modeling (ODM) layer interacting with a document-store database.
- **WebSockets (`ws`)**: Broadcasts real-time events to connected clients.
- **JSON Web Tokens (JWT)**: Manages secure admin authentication.

---

## 2. Architecture & Working Approach

CricScore utilizes two concurrent data patterns:

```
[ Admin Scorekeeper ]                 [ Public Fans / Viewers ]
       │                                        │
       ▼ (REST HTTP Requests)                   ▼ (WebSocket Subscriptions)
  Express API ─────────► [ MongoDB ] ◄──────── Express API
       │                      │
       ▼                      ▼ (Fetches data on page loads)
  WebSocket Broadcast ────────┴──────────────► Client Browser
  (Pushes updates to all subscribed fans)
```

1. **REST Operations**: Actions like user logins, match creation, or match finalization go through HTTP requests to the Express API.
2. **WebSocket Pub/Sub Operations**: Live scoring updates are pushed automatically to viewers. Viewers do not poll the server; instead, they establish a WebSocket connection and subscribe to a match's "room."

---

## 3. Data Models & MongoDB Schema

The database relies on four main Mongoose models:

1. **[User Schema](file:///Users/mdfaizan/Desktop/Projects/CricketScorecard/server/models/User.js)**: Stores admin credentials (`username`, `password`, `role`).
2. **[Player Schema](file:///Users/mdfaizan/Desktop/Projects/CricketScorecard/server/models/Player.js)**: Stores profiles and career-wide historical stats. Batting and bowling performance metrics are stored as sub-documents and incremented when a match is completed.
3. **[Match Schema](file:///Users/mdfaizan/Desktop/Projects/CricketScorecard/server/models/Match.js)**: The core engine of the database. It stores the match status, venue, date, teams, and an array of innings objects. Each innings contains detailed sub-documents:
   - `battingScorecard`: List of batsmen, runs, balls, strike-rate, and dismissal states.
   - `bowlingScorecard`: List of bowlers, overs, maidens, runs conceded, and wickets.
   - `fallOfWickets`: Sequential list tracking when and at what score wickets fell.
   - `overHistory`: Matrix representing every ball bowled in each over.
4. **[Series Schema](file:///Users/mdfaizan/Desktop/Projects/CricketScorecard/server/models/Series.js)**: Groups matches together into a tournament and calculates the standings, points, and Net Run Rate (NRR) for each team.

---

## 4. API Layer & Data Fetching

### Frontend API Client
- Configured in [client/src/api/index.js](file:///Users/mdfaizan/Desktop/Projects/CricketScorecard/client/src/api/index.js).
- **Request Interceptor**: Extracts the JWT token from browser `localStorage` and appends it to the `Authorization` header for all requests.
- **Response Interceptor**: Automatically intercepts `401 Unauthorized` responses (e.g., when a session expires) and redirects the user to the admin login page.

### Backend Adapter (Serialization)
- Located in [server/utils/serializers.js](file:///Users/mdfaizan/Desktop/Projects/CricketScorecard/server/utils/serializers.js).
- It acts as a translation layer. When a match document is fetched, the serializer shapes it into a front-end compatible structure, dynamically calculating values like:
  - Current Run Rate (CRR)
  - Required Run Rate (RRR)
  - Dismissal description strings (e.g., `"c & b Kumble"`)
  - Team flag emojis via the `getTeamFlag()` helper.

---

## 5. Real-Time Synchronization

Real-time scoring is managed using WebSockets:

1. **Room Management**: Implemented in [server/index.js](file:///Users/mdfaizan/Desktop/Projects/CricketScorecard/server/index.js). The server maintains a mapping of match IDs to sets of WebSocket clients:
   `const wsManager = new Map(); // Map<matchId, Set<ws>>`
2. **Subscription**: When a user opens a live scorecard in [LiveScorecard.jsx](file:///Users/mdfaizan/Desktop/Projects/CricketScorecard/client/src/pages/LiveScorecard.jsx), the frontend hooks into [client/src/hooks/useWebSocket.js](file:///Users/mdfaizan/Desktop/Projects/CricketScorecard/client/src/hooks/useWebSocket.js) and sends a subscription message:
   `{ type: "subscribe", matchId: "..." }`
   The backend registers the client under that match ID.
3. **Broadcasting**: When the administrator enters a ball on the scoring panel, the `/ball` route processes the details, updates the database, and calls `broadcastToMatch()`. This pushes a `score_update` message containing the updated match data directly to all subscribed sockets in the room, triggering the full-screen boundary/wicket animations instantly.

---

## 6. Page Routing, Connectivity, and Workings

CricScore contains nine main views that connect to form the public viewer experience and administrative scoring dashboard.

### 6.1 Public Viewer Views

#### 1. Home Dashboard ([Home.jsx](file:///Users/mdfaizan/Desktop/Projects/CricketScorecard/client/src/pages/Home.jsx))
- **Role**: The main landing page of the application showing active stats (Live/Upcoming/Completed counts) and categorizing matches.
- **Working**: Fetching is triggered on mount by sending a request to `GET /api/matches`. The page renders a list of match cards.
- **WebSocket Sync**: For matches that are currently `"live"`, the card opens a local WebSocket room subscription to display live run rates and target margins.
- **Connectivity**:
  - Clicking a live match card routes the user to the **Live Scorecard** (`/match/:id`).
  - Clicking a completed match card routes the user to the **Match Result** (`/match/:id/result`).
  - The Navbar links to the **Series Directory** (`/series`) and **Admin Login** (`/admin/login`).

#### 2. Live Scorecard ([LiveScorecard.jsx](file:///Users/mdfaizan/Desktop/Projects/CricketScorecard/client/src/pages/LiveScorecard.jsx))
- **Role**: A real-time hub for viewing live matches, structured with tabs for a Live Overview, detailed Batting/Bowling Scorecards, Over history, and Commentary logs.
- **Working**: Sends a `GET /api/matches/:id` query on load, then calls `useWebSocket()` to subscribe to updates. When a new ball event is received, it updates its state locally and flashes boundary or wicket animations.
- **Connectivity**:
  - Links to **Player Profiles** (`/player/:playerId`) from names in the scorecard tables.
  - Automatically redirects to the **Match Result** view if the match is completed.

#### 3. Match Result ([MatchResult.jsx](file:///Users/mdfaizan/Desktop/Projects/CricketScorecard/client/src/pages/MatchResult.jsx))
- **Role**: Displays the final stats of a completed match, summarizing margins, high scores, best bowling figures, and the Player of the Match.
- **Working**: Performs a single `GET /api/matches/:id` on mount to fetch the completed match history. Since the match status is `"completed"`, WebSockets are not initiated.
- **Connectivity**:
  - Links names in scorecard lists to the **Player Profile** view.
  - Offers a return button back to the **Home Dashboard**.

#### 4. Player Profile ([PlayerProfile.jsx](file:///Users/mdfaizan/Desktop/Projects/CricketScorecard/client/src/pages/PlayerProfile.jsx))
- **Role**: Displays career stats for bat and ball, including historical averages, strike rates, high scores, best figures, and 50s/100s tallies.
- **Working**: Fetches stats from the endpoint `GET /api/players/:id` on load.
- **Connectivity**:
  - Accessible from any scorecard (Live, Result, or Setup lists).

#### 5. Series Directory & Details ([SeriesList.jsx](file:///Users/mdfaizan/Desktop/Projects/CricketScorecard/client/src/pages/SeriesList.jsx) / [SeriesDetail.jsx](file:///Users/mdfaizan/Desktop/Projects/CricketScorecard/client/src/pages/SeriesDetail.jsx))
- **Role**: Allows users to browse active tournaments, schedules, and view the points table containing Net Run Rate (NRR) standings.
- **Working**:
  - `SeriesList.jsx` queries `GET /api/series` to list active series.
  - `SeriesDetail.jsx` queries `GET /api/series/:id` which populates matching tournament standings.
- **Connectivity**:
  - Clicking a series routes to `SeriesDetail.jsx`.
  - The series detail page links directly to individual matches (`/match/:id` or `/match/:id/result`).

---

### 6.2 Administrator Scoring Views (Protected)

#### 6. Scorer Login ([Login.jsx](file:///Users/mdfaizan/Desktop/Projects/CricketScorecard/client/src/pages/admin/Login.jsx))
- **Role**: Admin login and registration portal.
- **Working**: Submits usernames and passwords to `POST /api/auth/login`. On success, it stores the returned JWT token and user profile details in `localStorage`.
- **Connectivity**:
  - On authentication, redirects the user to the **Match Setup** page (`/admin/matches/new`).

#### 7. Match Setup ([MatchSetup.jsx](file:///Users/mdfaizan/Desktop/Projects/CricketScorecard/client/src/pages/admin/MatchSetup.jsx))
- **Role**: Form to initialize a new match, select team names, pick players, configure formats (T20/ODI/Test), specify venues, and record toss results.
- **Working**: Submits a match document to `POST /api/matches`. The server saves the match and automatically provisions opening batsmen and bowlers.
- **Connectivity**:
  - Redirects the scorer directly to the active **Score Entry** panel (`/admin/matches/:id/score`) upon submission.

#### 8. Score Entry Control Panel ([ScoreEntry.jsx](file:///Users/mdfaizan/Desktop/Projects/CricketScorecard/client/src/pages/admin/ScoreEntry.jsx))
- **Role**: The core control panel for logging runs, wickets, extras, bowler adjustments, and ending innings.
- **Working**:
  - Clicking run buttons submits inputs to `POST /api/matches/:id/ball`.
  - If a wicket falls, it prompts the **Wicket Modal** to select details and submits the wicket info.
  - At the end of an over, it prompts the **Bowler Selection Modal** to register the new bowler via `POST /api/matches/:id/bowler`.
  - If an innings is complete, it calls `POST /api/matches/:id/end-innings` to initialize target totals and swap batting sides.
  - Finishing the match triggers `POST /api/matches/:id/complete`, which updates historical player statistics.
- **Connectivity**:
  - Completing the match redirects the administrator to the **Match Result** view (`/match/:id/result`).

