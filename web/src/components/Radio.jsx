import io from 'socket.io-client';
import libopus from 'libopus';

const Codec = {
    Opus: 2049,
}

class Radio {
    constructor() {
        this.libopus = null;
        this.decoder = null;
        this.socket = null;
        this.audioCtx = null;
        this.hostname = null;
        this.station = null;
        this.gainNode = null;
        this.volume = 1.0;

        return new Promise((resolve) => {
            libopus().then((opus) => {
                this.libopus = opus;
                this._opusDeclareMethods();
                console.log("[RADIO] Successfully Started.");
                console.log("[RADIO] Opus Version:", this._opusVersion());
                resolve(this);
            });
        });
    }

    //
    // WASM Private Helper Functions 
    //
    _exportUInt8Array(data) {
        const dataSize = data.length * data.BYTES_PER_ELEMENT;
        const dataPtr = this._malloc(dataSize);
        const dataHeap = new Uint8Array(this.libopus.HEAPU8.buffer, dataPtr, dataSize);
        dataHeap.set(new Uint8Array(data.buffer, data.byteOffset, dataSize));
        return { dataPtr, dataSize };
    }

    _importFloat32Array(ptr, size) {
        return new Float32Array(this.libopus.HEAPF32.buffer, ptr, size);
    }


    //
    // Opus Decoder Private Methods
    //
    _opusDeclareMethods() {
        this._opusVersion = this.libopus.cwrap('version', 'string', ['']);
        this._newOpusDecoder = this.libopus.cwrap('new_decoder', 'number', ['number', 'number']);
        this._destroyOpusDecoder = this.libopus.cwrap('destroy_decoder', '', ['number']);
        this._free = this.libopus._free;
        this._malloc = this.libopus._malloc;
    }

    _opusDecodeFloat(data) {
        const { ofs, chs } = this.station;
        const { dataPtr, dataSize } = this._exportUInt8Array(data);
        const audioPtr = this.libopus._decode_float_linear(this.decoder, dataPtr, dataSize, ofs, chs);
        this._free(dataPtr);
        const audioHeap = this._importFloat32Array(audioPtr, ofs*chs);
        this._free(audioPtr);
        return audioHeap;
    }

    //
    // Web Audio API Private Methods
    //
    _startAudio() {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)({
            sampleRate: this.station.afs,
            latencyHint: "playback",
        });
        this.gainNode = this.audioCtx.createGain();
        this.gainNode.gain.value = this.volume;
        this.gainNode.connect(this.audioCtx.destination);
        this.startTime = this.audioCtx.currentTime;
    }

    _stopAudio() {
        this.audioCtx.suspend();
        this.audioCtx.close();
        this.audioCtx = null;
    }

    _feedAudio(data) {
        const { chs, ofs, afs, codec } = this.station;

        let audioBuffer = this.audioCtx.createBuffer(chs, ofs, afs);
        var pcmAudio = null;
    
        switch (codec) {
            case Codec.Opus:
                pcmAudio = this._opusDecodeFloat(data);
        }

        for (let c = 0; c < chs; c++) {
            const buffer = pcmAudio.slice(ofs*c, ofs*(c+1));
            audioBuffer.getChannelData(c).set(buffer);
        }

        let bufferSource = this.audioCtx.createBufferSource();
        bufferSource.buffer = audioBuffer;
        bufferSource.connect(this.gainNode);

        if (this.startTime < this.audioCtx.currentTime) {
            this.startTime = this.audioCtx.currentTime + 0.05;
        }

        bufferSource.start(this.startTime);
        this.startTime += audioBuffer.duration;
    }

    //
    // Socket.IO Private Methods
    //
    _connectSocket() {
        this.socket = io(this.hostname);

        this.socket.on('data', (data) => {
            this._feedAudio(new Uint8Array(data));
        });
    }

    _disconnectSocket() {
        this.socket.close();
        this.socket = null;
    }

    _leaveSocketStream(frequency) {
        this.socket.emit("leave", frequency);
    }

    _joinSocketStream(frequency) {
        this.socket.emit("join", frequency);
    }

    //
    // Radio Public Methods
    //
    setVolume(volume) {
        if (volume > 1.0 || volume < 0.0) {
            console.error("[RADIO] Volume range should be 0.0 to 1.0.");
            return false;
        }

        this.volume = volume;
        if (this.gainNode !== null) {
            this.gainNode.gain.value = this.volume;
        }
        return true;
    }

    tune(hostname, station) {
        if (this.hostname !== hostname) {
            if (this.hostname !== null) {
                this._disconnectSocket();
            }
            this.hostname = hostname;
            this._connectSocket();
        }

        if (this.station !== null) {
            this._leaveSocketStream(this.station.frequency);
            this._stopAudio();
        }

        this.station = {
            frequency: station.frequency,
            codec: station.codec,
            ofs: station.codec_fs,
            afs: station.audio_fs,
            chs: station.channels,
        };

        switch (this.station.codec) {
            case Codec.Opus:
                if (this.decoder !== null) {
                    this._destroyOpusDecoder(this.decoder);
                }
                this.decoder = this._newOpusDecoder(this.station.afs, this.station.chs);
        }
        
        this._startAudio();
        this._joinSocketStream(this.station.frequency);
    }
    
    stop() {
        this._leaveSocketStream(this.station.frequency);
        this._disconnectSocket();
        this._stopAudio();
        this.hostname = null;
        this.station = null;
    }
};

export { Radio, Codec };