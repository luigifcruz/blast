import { Codec, Radio } from 'components/Radio';
import { action, computed, observable } from 'mobx';

import _ from 'lodash';
import request from 'superagent';

var SIMM = {
    frequency: 96900000,
    codec: Codec.Opus,
    codec_fs: 1920,
    audio_fs: 48000,
    channels: 2,
    host: "ws://192.168.0.19:8080",
    name: "PU2SPY",
    device: "LimeSDR",
    backend: "CUDA",
}

var SIMM2 = {
    frequency: 97500000,
    codec: Codec.Opus,
    codec_fs: 1920,
    audio_fs: 48000,
    channels: 2,
    host: "ws://192.168.0.19:8080",
    name: "PU2SPY",
    device: "LimeSDR",
    backend: "CUDA",
}

export default class Store {
    @observable _hosts = new Set();
    @observable _stations = new Set();
    @observable _radio = null;
    @observable selected = null;

    @observable volume = 1.0;
    @observable playing = false;

    constructor() {
        this._hosts.add("http://192.168.0.19:8080");
        this._refreshStations();
        
        return new Radio().then((radio) => {
            this._radio = radio;
            return this;
        });
    }
    
    @action addHost(host) {
        this._hosts.add(host);
        this._refreshStations();
    }

    @computed get hosts() {
        return [...this._hosts];
    }

    @computed get stations() {
        return [...this._stations];
    }

    @computed get groupedStations() {
        return _.groupBy(this.stations, "host");
    }

    @action setVolume(volume) {
        if (this._radio.setVolume(volume)) {
            this.volume = volume;
        }
    }

    @action select(station) {
        this.selected = station;
        this._tune();
    }

    @action forward = () => {
        const stations = _.sortBy(this.stations, ["frequency", "name"]);
        const currentIdx = _.findIndex(stations, {
            'host': this.selected.host,
            'frequency': this.selected.frequency,
            'codec': this.selected.codec,
        });

        if (currentIdx === -1) {
            return;
        }

        let nextIdx = currentIdx + 1;
        if (nextIdx >= this.stations.length) {
            nextIdx = 0;
        }

        this.selected = this.stations[nextIdx];
        this._tune();
    }

    @action backward = () => {
        const stations = _.sortBy(this.stations, ["frequency", "name"]);
        const currentIdx = _.findIndex(stations, {
            'host': this.selected.host,
            'frequency': this.selected.frequency,
            'codec': this.selected.codec,
        });

        if (currentIdx === -1) {
            return;
        }

        let previousIdx = currentIdx - 1;
        if (previousIdx < 0) {
            previousIdx = this.stations.length - 1;
        }

        this.selected = this.stations[previousIdx];
        this._tune();
    }

    @action toggle = () => {
        if (this.playing) {
            this._radio.stop();
            this.playing = !this.playing;
            return;
        }
        this._tune();
    }

    @action _refreshStations() {
        let queue = [];
  
        this.hosts.map((host) => queue.push(
            request.get(host + '/meta')
        ));

        Promise.all(queue)
        .then((results) => {
            results.map((result) => {
                const source = result.body;
                const url = new URL(result.req.url);
                const host = url.hostname + (url.port ? ":" + url.port : "");

                source.stations.map(
                    (station) => this._stations.add({
                        host,
                        name: source.name,
                        device: source.device,
                        backend: source.backend,
                        frequency: station.freq,
                        codec: station.codec,
                        codec_fs: station.ofs,
                        audio_fs: station.afs,
                        channels: station.chs,
                }));
            });

            if (this.stations.length > 0) {
                this.selected = this.stations[0];
            }
        });
    }

    @action _tune() {
        this._radio.tune(this.selected.host, this.selected);
        this.playing = true;
    }
}
