# QuizAgaci

A real-time multiplayer quiz platform built for Evrim Ağacı İzmir community events. The host shows the questions on a big screen, and players join from their phones with a game code or a QR code.

Live site: [quizagaci.com.tr](https://www.quizagaci.com.tr)

It was used at a live Evrim Ağacı İzmir event with 32 players.

## Features

- **Live game over SignalR.** Players joining, questions starting, the timer, answers and the leaderboard update on every screen without a page reload.
- **Question types:** multiple choice, multiple select, true/false and open-ended. Questions can include an image.
- **Manual review:** the host approves or rejects open-ended answers during the game.
- **Host controls:** pause, resume or extend the timer, show the results of a question, hide the question image, and finish the game.
- **Reconnect:** a player who loses the connection or refreshes the page can return to the same game with a session token.
- **Results export:** scores can be downloaded as a CSV file.
- **Accounts:** hosts log in with JWT access and refresh tokens and create and edit their own quizzes.

## Tech stack

| Part | Technologies |
|---|---|
| Backend | .NET 8 Web API, ASP.NET Core SignalR, Entity Framework Core (Pomelo MySQL), JWT, BCrypt, Cloudinary for question images |
| Frontend | React 19, TypeScript, Vite, Zustand, React Router, Tailwind CSS, Framer Motion, `@microsoft/signalr` |
| Hosting | Backend on Railway (Docker), frontend on Vercel |

## Project structure

```text
backend/
  src/
    QuizPlatform.API             controllers, SignalR hub (GameHub), startup
    QuizPlatform.Application     services, DTOs, interfaces
    QuizPlatform.Domain          entities and enums
    QuizPlatform.Infrastructure  EF Core DbContext, migrations, external services
  Dockerfile
frontend/
  src/
    pages        host, player, lobby, dashboard and quiz editor pages
    components   host and player game views
    services     REST (axios) and SignalR clients
    stores       Zustand stores
```

## Running locally

### Backend

Requirements: .NET 8 SDK and a MySQL server.

1. Set these values in `backend/src/QuizPlatform.API/appsettings.json`. Environment variables also work, for example `Jwt__Secret`.
   - `ConnectionStrings:DefaultConnection`: your MySQL connection string
   - `Jwt:Issuer`, `Jwt:Audience`
   - `Jwt:Secret`: leave it empty in the file and set it with the `Jwt__Secret` environment variable (a random string of at least 32 characters). The app will not start without it.
   - `Cors:AllowedOrigins`: the frontend URL, for example `http://localhost:5173`
   - `Cloudinary:*`: only needed for question image uploads
2. Run the API. Database migrations are applied when the app starts.

```bash
cd backend/src/QuizPlatform.API
dotnet run
```

The SignalR hub is served at `/gamehub`.

### Frontend

Requirements: Node.js.

1. Create `frontend/.env` with:

```text
VITE_API_BASE_URL=http://localhost:5294/api
VITE_SIGNALR_HUB_URL=http://localhost:5294/gamehub
```

2. Install and start:

```bash
cd frontend
npm install
npm run dev
```

## Known issues

At the live event, 4 of 32 players could not join, and 4 players who lost the connection after the first question could not rejoin with the same name. Rejoining with a session token was added to fix the rejoin problem. The cause of the join failures has not been found yet.
