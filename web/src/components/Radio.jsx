import * as zmq from 'jszmq';

import libopus from 'libopus';

const Decoder = {
    Opus: 1,
}

class RadioWorker {
    constructor() {
        this.libopus = null;
        this.decoder = null;
        this.buffers = [];
        this.zmq = zmq.socket('sub');

        this.config = {
            receiver: {},
            decoder: {},
        };

        return new Promise((resolve) => {
            libopus().then((opus) => {
                this.libopus = opus;
                this.declareMethods();

                console.log("[RADIO] Successfully Started.");
                console.log("[RADIO] Opus Version:", this.opusVersion());

                resolve(this);
            });
        });
    }

    declareMethods() {
        // Opus Methods
        this.opusVersion = this.libopus.cwrap('version', 'string', ['']);
        this.newOpusDecoder = this.libopus.cwrap('new_decoder', 'number', ['number', 'number']);
        this.destroyOpusDecoder = this.libopus.cwrap('destroy_decoder', '', ['number']);

        // Standard Methods
        this.free = this.libopus._free;
        this.malloc = this.libopus._malloc;
    }

    declareAudio(volume) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.gainNode = this.audioCtx.createGain();
        this.gainNode.gain.value = volume;
        this.gainNode.connect(this.audioCtx.destination);
        this.startTime = this.audioCtx.currentTime + 1.25;
    }

    exportUInt8Array(data) {
        const dataSize = data.length * data.BYTES_PER_ELEMENT;
        const dataPtr = this.malloc(dataSize);
        const dataHeap = new Uint8Array(this.libopus.HEAPU8.buffer, dataPtr, dataSize);
        dataHeap.set(new Uint8Array(data.buffer, data.byteOffset, dataSize));
        return { dataPtr, dataSize };
    }

    importFloat32Array(ptr, size) {
        return new Float32Array(this.libopus.HEAPF32.buffer, ptr, size);
    }

    opusDecodeFloat(data) {
        const audioSize = this.config.decoder.ofs * this.config.decoder.chs;
        const { dataPtr, dataSize } = this.exportUInt8Array(data);
        const audioPtr = this.libopus._decode_float(this.decoder, dataPtr, dataSize, audioSize);
        this.free(dataPtr);
        const audioHeap = this.importFloat32Array(audioPtr, audioSize);
        this.free(audioPtr);
        return audioHeap;
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

            switch (decoder.type) {
                case Decoder.Opus:
                    if (this.decoder !== null) {
                        console.log("[RADIO:TUNE] Destroying Opus decoder.");
                        this.destroyOpusDecoder(this.decoder);
                    }
                    console.log("[RADIO:TUNE] Creating new Opus decoder.")
                    this.decoder = this.newOpusDecoder(decoder.afs, decoder.chs);
            }

            this.declareAudio(config.decoder.volume);
            this.zmq.on('message', (frequency, data) => {
                frequency = new TextDecoder("utf-8").decode(frequency);
                if (this.config.receiver.frequency === frequency) {
                    this.play(data);
                }
            });
        }

        this.config = config;
    }

    play(data) {
        var pcmAudio = null;

        switch (this.config.decoder.type) {
            case Decoder.Opus:
                pcmAudio = this.opusDecodeFloat(data);
        }

        const { chs, ofs, afs } = this.config.decoder;
        var audioBuffer = this.audioCtx.createBuffer(chs, ofs, afs);

        for (var c = 0; c < chs; c++) {
            var channelData = audioBuffer.getChannelData(c);
            for (var i = 0; i < ofs; i++) {
                channelData[i] = pcmAudio[2*i+c];
            }
        }

        console.log("A")

        var bufferSource = this.audioCtx.createBufferSource();
        bufferSource.buffer = audioBuffer;
        bufferSource.connect(this.gainNode);
        bufferSource.start(this.startTime);
        this.startTime += audioBuffer.duration;
    }
};

export { RadioWorker, Decoder };