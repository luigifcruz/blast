import io from 'socket.io-client';

import libopus from 'libopus';
import _ from 'lodash';

const Decoder = {
    Opus: 1,
}

class Radio {
    constructor() {
        this.libopus = null;
        this.decoder = null;
        this.socket = null;
        this.audioCtx = null;
        this.buffer = [];

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

    startAudioProcessor() {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)({
            sampleRate: 48000,
        });
    
        const node = this.audioCtx.createScriptProcessor(1024, 0, 2);
        const source = this.audioCtx.createBufferSource();
        node.buffer = this.audioCtx.createBuffer(2, 1024, 48000);
        console.log(node.buffer)
    
        node.onaudioprocess = (event) => {
            const chs = event.outputBuffer.numberOfChannels;
            const bsz = event.outputBuffer.length;
            console.log(chs)

            if (this.buffer.length > (bsz*4)) {
                for (var c = 0; c < chs; c++) {
                    var channelData = event.outputBuffer.getChannelData(c);
                    const buffer = this.buffer.splice(0, bsz*chs);
                    for (var i = 0; i < bsz; i++) {
                        channelData[i] = buffer[chs*i+c];  
                    }
                }
            }
        };

        source.connect(node);
        node.connect(this.audioCtx.destination);
        source.start();
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
            this.socket = io(`ws://${window.location.hostname}:8080`);

            this.socket.on('data', (data) => {
                this.play(new Uint8Array(data));
            });
        }

        if (receiver.frequency !== this.config.receiver.frequency) {
            switch (decoder.type) {
                case Decoder.Opus:
                    this.destroyOpusDecoder(this.decoder);
                    this.decoder = this.newOpusDecoder(decoder.afs, decoder.chs);
            }

            this.buffer = [];
            if (this.audioCtx === null) {
                this.startAudioProcessor();
            }

            if (this.config.receiver.frequency !== undefined) {
                this.socket.emit("leave", this.config.receiver.frequency);
            }
            this.socket.emit("join", receiver.frequency);
        }

        this.config = _.cloneDeep(config);
    }

    play(data) {
        var pcmAudio = null;

        switch (this.config.decoder.type) {
            case Decoder.Opus:
                pcmAudio = this.opusDecodeFloat(data);
        }

        this.buffer.push(...pcmAudio)
    }
};

export { Radio, Decoder };