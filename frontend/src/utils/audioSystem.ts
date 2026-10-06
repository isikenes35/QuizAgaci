let audioCtx: AudioContext | null = null;

const getAudioContext = () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // Resume context if suspended (common browser policy)
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
};

// Simple short pop/beep for button clicks
export const playPop = () => {
    try {
        const ctx = getAudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.05);

        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
        console.error("Audio error", e);
    }
};

// Success chime sequence
export const playCorrect = () => {
    try {
        const ctx = getAudioContext();
        // Play three rapid ascending notes
        const playNote = (freq: number, startTime: number, duration: number = 0.15) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'triangle';
            osc.frequency.value = freq;
            
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(startTime);
            osc.stop(startTime + duration);
        };
        
        const now = ctx.currentTime;
        playNote(440, now);          // A4
        playNote(554.37, now + 0.1); // C#5
        playNote(659.25, now + 0.2, 0.4); // E5 (longer)
    } catch (e) {
        console.error("Audio error", e);
    }
};

// Low discordant buzz
export const playWrong = () => {
    try {
        const ctx = getAudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        // Descending frequency for a "fail" feel
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.3);

        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
        console.error("Audio error", e);
    }
};

// Start chord/swoosh
export const playStart = () => {
    try {
        const ctx = getAudioContext();
        // Play a major chord
        const freqs = [392.00, 523.25, 659.25]; // G4, C5, E5
        const now = ctx.currentTime;
        
        freqs.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'square';
            osc.frequency.value = freq;
            
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.1, now + 0.05 + (idx * 0.02));
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            
            // Add a lowpass filter for a smoother "swoosh" effect
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(2000, now);
            filter.frequency.exponentialRampToValueAtTime(200, now + 0.5);
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(now);
            osc.stop(now + 0.5);
        });
    } catch (e) {
        console.error("Audio error", e);
    }
};

// Celebration fanfare
export const playCelebration = () => {
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;
        
        const playNote = (freq: number, startTime: number, duration: number) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'square';
            osc.frequency.value = freq;
            
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.15, startTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(startTime);
            osc.stop(startTime + duration);
        };
        
        // C Major arpeggio fanfare
        playNote(523.25, now, 0.2); // C5
        playNote(659.25, now + 0.15, 0.2); // E5
        playNote(783.99, now + 0.3, 0.2); // G5
        playNote(1046.50, now + 0.45, 0.6); // C6
    } catch (e) {
        console.error("Audio error", e);
    }
};

// Metronome click for time warning
export const playTick = () => {
    try {
        const ctx = getAudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(800, ctx.currentTime); // High pitch brief click

        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.05);
    } catch (e) {
        console.error("Audio error", e);
    }
};
