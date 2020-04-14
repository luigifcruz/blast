import { computed, observable, action, autorun } from 'mobx';
import { Codec, Radio } from 'components/Radio';


// Sources (Saved on Persistent Memory)
// hostname: string
// backend: string
// stations: Station[]

// Station
// frequency: int
// bandwidth: int
// audio_fs: int
// channels: int
// codec: int
// codec_fs: int

class SourceStore {
    @observable sources = [];

    constructor(that) {
        autorun(() => console.log("SourceStore", this.report));

        this.that = that;
    }

    @action add(hostname) {
        // Fetch hostname metadata from API.
        this.sources.push({
            hostname: "ws://192.168.0.19:8080",
            backend: "CUDA",
            stations: [{
                frequency: 96900000,
                codec: Codec.Opus,
                codec_fs: 1920,
                audio_fs: 48000,
                channels: 2,
            }],
        });
    }

    @action update(hostname) {
        // Update fetched metadata from API.
    }

    @action remove(hostname) {
        // Remove hostname from memory.
    }
}

export default class Store {
    @observable sourceId = null;
    @observable stationId = null;

    @observable radio = null;
    @observable playing = false;
    @observable volume = 1.0;

    constructor() {
        autorun(() => console.log("Store", this.report));
        this.sourceStore = new SourceStore(this);

        new Radio().then((radio) => {
            this.radio = radio;
        });
    }

    
}
