const fs = require('fs');

// 1. Fix SignalRNotifier.cs
let signalrFile = 'backend/src/QuizPlatform.API/Services/SignalRNotifier.cs';
let signalrText = fs.readFileSync(signalrFile, 'utf8');
signalrText = signalrText.replace(
    /await _hubContext\.Clients\.Group\(sessionId\.ToString\(\)\)\.SendAsync\("QuestionStarted", new \{ questionDto, timeLimit, startedAt = DateTime\.UtcNow \}\);/,
    `await _hubContext.Clients.Group(sessionId.ToString()).SendAsync("QuestionStarted", questionDto, timeLimit);`
);
fs.writeFileSync(signalrFile, signalrText);

// 2. Fix gameHubService.ts
let hubFile = 'frontend/src/services/signalr/gameHubService.ts';
let hubText = fs.readFileSync(hubFile, 'utf8');
hubText = hubText.replace(
    /public onQuestionStarted\(callback: \(data: any\) => void\) \{/,
    `public onQuestionStarted(callback: (question: any, timeLimit: number) => void) {`
);
fs.writeFileSync(hubFile, hubText);

// 3. Fix HostGamePage.tsx
let hostFile = 'frontend/src/pages/HostGamePage.tsx';
let hostText = fs.readFileSync(hostFile, 'utf8');
hostText = hostText.replace(
    /gameHubService\.onQuestionStarted\(\(data\) => \{\s*setCurrentQuestion\(data,\s*data\.timeLimit\s*\|\|\s*30\);/g,
    `gameHubService.onQuestionStarted((question, timeLimit) => {\n        setCurrentQuestion(question, timeLimit || 30);`
);

const hostHandlers = `
  const handlePause = async () => {
    if (!id) return;
    try { await api.post(\`/gamesessions/\${id}/pause\`); } catch (e) { console.error(e); }
  };
  const handleResume = async () => {
    if (!id) return;
    try { await api.post(\`/gamesessions/\${id}/resume\`); } catch (e) { console.error(e); }
  };
  const handleExtend = async () => {
    if (!id) return;
    try { await api.post(\`/gamesessions/\${id}/extend\`, 10, { headers: { 'Content-Type': 'application/json' } }); } catch (e) { console.error(e); }
  };
`;
hostText = hostText.replace(/const handleHideImage = async \(\) => \{/, hostHandlers + '\n  const handleHideImage = async () => {');

const hostButtons = `
          {viewState === 'question' && isQuestionActive && (
            <>
              <button onClick={handlePause} className="bg-yellow-500 text-white px-4 py-2 rounded font-bold hover:bg-yellow-600">
                Pause
              </button>
              <button onClick={handleResume} className="bg-green-500 text-white px-4 py-2 rounded font-bold hover:bg-green-600">
                Resume
              </button>
              <button onClick={handleExtend} className="bg-purple-500 text-white px-4 py-2 rounded font-bold hover:bg-purple-600">
                +10s
              </button>
            </>
          )}
`;
hostText = hostText.replace(/\{viewState === 'question' && isQuestionActive && \(\s*<button onClick=\{handleHideImage\}/, hostButtons + '\n          {viewState === \'question\' && isQuestionActive && (\n            <button onClick={handleHideImage}');

fs.writeFileSync(hostFile, hostText);

// 4. Fix PlayerGamePage.tsx
let playerFile = 'frontend/src/pages/PlayerGamePage.tsx';
let playerText = fs.readFileSync(playerFile, 'utf8');
playerText = playerText.replace(
    /gameHubService\.onQuestionStarted\(\(data\) => \{\s*setCurrentQuestion\(data,\s*data\.timeLimit\s*\|\|\s*30\);/g,
    `gameHubService.onQuestionStarted((question, timeLimit) => {\n      setCurrentQuestion(question, timeLimit || 30);`
);
fs.writeFileSync(playerFile, playerText);

// 5. Fix GameLobbyPage.tsx
let lobbyFile = 'frontend/src/pages/GameLobbyPage.tsx';
let lobbyText = fs.readFileSync(lobbyFile, 'utf8');
lobbyText = lobbyText.replace(
    /gameHubService\.onQuestionStarted\(\(data\) => \{\s*setCurrentQuestion\(data\.questionDto,\s*data\.timeLimit\);/g,
    `gameHubService.onQuestionStarted((question, timeLimit) => {\n          setCurrentQuestion(question, timeLimit);`
);
fs.writeFileSync(lobbyFile, lobbyText);

console.log("Patch applied correctly");
