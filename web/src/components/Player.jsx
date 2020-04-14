import 'styles/player';
import 'styles/volume';

import * as Feather from 'react-feather';
import { Codec, Radio } from 'components/Radio';
import React, { Component } from 'react';
import { inject, observer } from 'mobx-react';
import { ParseFrequency } from 'misc/utils';

@inject('store')
@observer
class Player extends Component {
  constructor(props) {
    super(props);

    this.store = this.props.store;
    this.state = {
      radio: null,
      playing: false,
      hostname: "ws://192.168.0.19:8080",
      station: {
        frequency: 97500000,
        codec: Codec.Opus,
        ofs: 1920,
        afs: 48000,
        chs: 2,
      },
    }
  }

  componentDidMount() {
    new Radio().then((radio) => {
      this.setState({ radio });
    });
  }

  togglePlayback = () => {
    const { playing, radio, hostname, station } = this.state;

    if (radio) {
      if (playing) {
        radio.stop();
      } else {
        radio.tune(hostname, station);
      }
      this.setState({ playing: !playing });
    }
  }

  forward = () => {
    if (this.state.radio) {
      let station = this.state.station;
      station.frequency = 96900000;
      this.setState({ station });
      this.state.radio.tune(this.state.hostname, station);
    }
  }

  backward = () => {

  }

  volume = (e) => {
    const volume = e.target.value / 100;
    this.state.radio.setVolume(volume);
  }

  render() {
    const { afs, chs, codec, frequency } = this.state.station;
    const { hostname } = this.state;

    let channel = ((chs == 2) ? 'STEREO' : 'MONO');
    let decoder = ((codec == Codec.Opus) ? 'OPUS' : 'WAV');

    return (
      <div className="block player">
        <label className="block-label">PLAYER</label>
        <div className="block-body">
          <div className="information small">
            <div className="flag">
              <div>PU2SPY</div>
              <div className="hostname">{hostname}</div>
            </div>
          </div>
          <div className="frequency">
            {ParseFrequency(frequency)}
          </div>
          <div className="information">
            <div className="left">
              <div className="flag live">IDLE</div>
            </div>
            <div className="right">
              <div className="flag">{channel}</div>
              <div className="flag">{decoder}</div>
              <div className="flag">{afs / 1000} kHz</div>
            </div>
          </div>
          <div className="controls">
            <button onClick={this.backward}>
              <Feather.SkipBack />
            </button>
            <button onClick={this.togglePlayback}>
              {this.state.playing ? <Feather.Pause /> : <Feather.Play />}
            </button>
            <button onClick={this.forward}>
              <Feather.SkipForward />
            </button>
          </div>
          <div className="volume">
            <Feather.Volume1 />
            <input
              onChange={this.volume}
              className="slider"
              type="range"
              min="0"
              max="100"/>
            <Feather.Volume2 />
          </div>
        </div>
      </div>
    );
  }
}

export default Player;
