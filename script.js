const startButton = document.getElementById('start-button');
const stopButton = document.getElementById('stop-button');
const statusMessage = document.getElementById('status-message');

let audioContext;
let analyser;
let stream; // We need to store the stream to stop it later
let isVibrating = false;
let isRunning = false; // This flag controls the main loop

// The threshold for detecting a "loud" sound (like an inhale or exhale)
const amplitudeThreshold = 20;

startButton.addEventListener('click', async () => {
    // Check for Vibration API support
    if (!('vibrate' in navigator)) {
        statusMessage.textContent = 'Your device does not support the Vibration API.';
        return;
    }

    statusMessage.textContent = 'Requesting microphone permission...';

    try {
        // Get the microphone audio stream
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        statusMessage.textContent = 'Microphone access granted. Listening...';
        startButton.disabled = true;
        stopButton.disabled = false;
        isRunning = true;

        // Create an AudioContext and connect the microphone stream
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const microphone = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();

        // Connect the microphone to the analyser
        microphone.connect(analyser);

        // Start the real-time processing loop
        processAudio();

    } catch (error) {
        statusMessage.textContent = `Error: ${error.message}. Please allow microphone access.`;
        console.error('Microphone access denied:', error);
    }
});

stopButton.addEventListener('click', () => {
    isRunning = false;
    statusMessage.textContent = 'Stopped.';
    startButton.disabled = false;
    stopButton.disabled = true;

    // Stop the microphone stream
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }

    // Close the audio context
    if (audioContext) {
        audioContext.close();
    }
});

function processAudio() {
    // Only run the loop if the isRunning flag is true
    if (!isRunning) {
        return;
    }

    // Create an array to hold the audio data
    const dataArray = new Uint8Array(analyser.fftSize);

    // Get the current audio data (waveform)
    analyser.getByteTimeDomainData(dataArray);

    // Find the average amplitude of the sound
    let sum = 0;
    for (const value of dataArray) {
        // Data is from 0-255, so we shift it to -128 to 127
        const normalizedValue = value - 128;
        sum += normalizedValue * normalizedValue;
    }
    const averageAmplitude = Math.sqrt(sum / dataArray.length);

    // Check if the average amplitude is above the threshold
    if (averageAmplitude > amplitudeThreshold) {
        if (!isVibrating) {
            // Vibrate if the sound is loud and we're not already vibrating
            navigator.vibrate(200);
            isVibrating = true;
            console.log('Vibrating');
        }
    } else {
        isVibrating = false; // Reset the flag when the sound is quiet
    }

    // Continue the loop
    requestAnimationFrame(processAudio);
}
