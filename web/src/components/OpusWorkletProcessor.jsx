import libopus from 'libopus';

class OpusWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._ringBuffer = [];
    this._libopus = new libopus().then(() => {
      // Opus Methods
      this._opusVersion = this._libopus.cwrap('version', 'string', ['']);
      this._newOpusDecoder = this._libopus.cwrap('new_decoder', 'number', ['number', 'number']);
      this._destroyOpusDecoder = this._libopus.cwrap('destroy_decoder', '', ['number']);
      this._decoder = this._newOpusDecoder(48000, 2);

      // Standard Methods
      this._free = this._libopus._free;
      this._malloc = this._libopus._malloc;

      console.log("Opus Audio Worklet Started", this._opusVersion());
      this.port.onmessage = this.onmessage.bind(this);
    });
  }

  _exportUInt8Array(data) {
      const dataSize = data.length * data.BYTES_PER_ELEMENT;
      const dataPtr = this._malloc(dataSize);
      const dataHeap = new Uint8Array(this._libopus.HEAPU8.buffer, dataPtr, dataSize);
      dataHeap.set(new Uint8Array(data.buffer, data.byteOffset, dataSize));
      return { dataPtr, dataSize };
  }

  _importFloat32Array(ptr, size) {
      return new Float32Array(this._libopus.HEAPF32.buffer, ptr, size);
  }

  _decodeFloat(data) {
    const audioSize = 1920 * 2;
    const { dataPtr, dataSize } = this._exportUInt8Array(data);
    const audioPtr = this._libopus._decode_float(this._decoder, dataPtr, dataSize, audioSize);
    this._free(dataPtr);
    const audioHeap = this._importFloat32Array(audioPtr, audioSize);
    this._free(audioPtr);
    return audioHeap;
  }

  onmessage(event) {
    const pcmAudio = this._decodeFloat(event.data);
    this._ringBuffer.push(...pcmAudio)
  }

  process(inputs, outputs, parameters) {
    let output = outputs[0];
    
    if (this._ringBuffer.length > 256) {
      const chs = output.length;
      const buffer = this._ringBuffer.splice(0, 256);
      output.forEach((channel, c) => {
        for (let i = 0; i < channel.length; i++) {
          channel[i] = buffer[chs*i+c]
        }
      });
    }

    return true;
  }
}


registerProcessor('opus-decoder', OpusWorkletProcessor);