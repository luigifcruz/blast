import 'audioworklet-polyfill';

import * as zmq from 'jszmq';

import OpusWorkletProcessor from 'worklet-loader!./OpusWorkletProcessor.jsx';
import libopus from 'libopus';

const Decoder = {
    Opus: 1,
}

class Radio {
    constructor() {
        this.libopus = null;
        this.zmq = zmq.socket('sub');

        this.config = {
            receiver: {},
            decoder: {},
        };

        return new Promise((resolve) => {
            (async () => {
                this.audioCtx = new (window.AudioContext || window.webkitAudioContext)({
                    latencyHint: 'playback',
                    sampleRate: 48000
                });

                this.audioSource = this.audioCtx.createBufferSource();
                await this.audioCtx.audioWorklet.addModule(OpusWorkletProcessor);
                this.decoder = new AudioWorkletNode(this.audioCtx, 'opus-decoder', {
                    numberOfInputs: 1,
                    outputChannelCount: [2]
                });
                this.audioSource.connect(this.decoder).connect(this.audioCtx.destination);
                this.decoder.connect(this.audioCtx.destination)
                resolve(this);
            })();
        });
    }

    tune(config) {
        const { decoder, receiver } = config;

        if (receiver.host !== this.config.receiver.host) {
            console.log("[RADIO:TUNE] Chaging the host.");
            this.zmq.connect(receiver.host);
        }

        if (receiver.frequency !== this.config.receiver.frequency) {
            if (this.config.receiver.frequency !== undefined) {
                console.log("[RADIO:TUNE] Unsubscribing from the old frequency.");
                this.zmq.unsubscribe(this.config.receiver.frequency);
            }
            console.log("[RADIO:TUNE] Chaging the frequency.");
            this.zmq.subscribe(receiver.frequency);
            this.audioSource.start();
            this.zmq.on('message', (frequency, data) => {
                frequency = new TextDecoder("utf-8").decode(frequency);
                if (this.config.receiver.frequency === frequency) {
                    this.decoder.port.postMessage(data);
                }
            });
        }

        this.config = config;
    }
};

export { Radio, Decoder };