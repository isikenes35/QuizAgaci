const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/HostGamePage.tsx', 'utf8');

code = code.replace(
  'gameHubService.onQuestionFinished(() => {',
  `gameHubService.onAnswerSubmitted(() => {
        useGameStore.getState().incrementAnswerCount();
      });
      gameHubService.onImageHidden(() => {
        useGameStore.getState().setIsImageHidden(true);
      });
      gameHubService.onQuestionFinished(() => {`
);

code = code.replace(
  '<div className="flex justify-between w-full mb-8 items-center px-4">\r\n               <span className="text-gray-500 font-bold text-xl uppercase tracking-wider">\r\n                  Question {currentQuestionIndex + 1} of {totalQuestions || \'?\'}\r\n               </span>',
  `<div className="flex justify-between w-full mb-8 items-center px-4">
               <div className="flex flex-col">
                 <span className="text-gray-500 font-bold text-xl uppercase tracking-wider">
                    Question {currentQuestionIndex + 1} of {totalQuestions || '?'}
                 </span>
                 <span className="text-primary-600 font-bold text-lg mt-2">
                    Answers: {useGameStore.getState().answersCount} / {participants.length}
                    {useGameStore.getState().answersCount === participants.length && participants.length > 0 && " (All Answered!)"}
                 </span>
               </div>`
);
// Fallback if \r\n wasn't matched
code = code.replace(
  /<div className="flex justify-between w-full mb-8 items-center px-4">\s*<span className="text-gray-500 font-bold text-xl uppercase tracking-wider">\s*Question \{currentQuestionIndex \+ 1\} of \{totalQuestions \|\| '\?'\}\s*<\/span>/,
  `<div className="flex justify-between w-full mb-8 items-center px-4">
               <div className="flex flex-col">
                 <span className="text-gray-500 font-bold text-xl uppercase tracking-wider">
                    Question {currentQuestionIndex + 1} of {totalQuestions || '?'}
                 </span>
                 <span className="text-primary-600 font-bold text-lg mt-2 mb-2">
                    Answers: {useGameStore.getState().answersCount} / {participants.length}
                    {useGameStore.getState().answersCount === participants.length && participants.length > 0 && " (All Answered!)"}
                 </span>
               </div>`
);

code = code.replace(
  /\{\(currentQuestion\.options \|\| currentQuestion\.Options\) && \(currentQuestion\.type \|\| currentQuestion\.Type\) !== 'OpenEnded' && \(/,
  `{((currentQuestion.options || currentQuestion.Options) || []).length > 0 && String(currentQuestion.type || currentQuestion.Type || '').toLowerCase() !== 'openended' && (`
);

fs.writeFileSync('frontend/src/pages/HostGamePage.tsx', code);
