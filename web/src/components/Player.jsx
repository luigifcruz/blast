import 'styles/player';
import 'styles/volume';

import * as Feather from 'react-feather';

import React, { Component } from 'react';
import { inject, observer } from 'mobx-react';
import { ParseFrequency } from 'misc/utils';
import { Codec, Radio } from 'components/Radio';

@inject('store')
@observer
class Player extends Component {
  constructor(props) {
    super(props);

    this.store = this.props.store;
    this.state = {
      radio: null,
      playing: false,
      volume: 1.0,
      hostname: "ws://192.168.0.19:8080",
      station: {
        frequency: 173500000,
        codec: Codec.Opus,
        ofs: 1920,
        afs: 48000,
        chs: 2,
      },
    }
  }

  handlePlayback = () => {
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

  handleForward = () => {
    if (this.state.radio) {
      let station = this.state.station;
      station.frequency = 96900000;
      this.setState({ station });
      this.state.radio.tune(this.state.hostname, station);
    }
  }

  handleBackward = () => {

  }

  handleVolume = (e) => {
    const volume = e.target.value / 100;
    this.state.radio.setVolume(volume);
    this.setState({ volume });
  }

  render() {
    const { afs, chs, codec, frequency } = this.state.station;
    const { hostname, playing } = this.state;

    let status = ((playing) ? 'LIVE' : 'IDLE');
    let statusColor = ((playing) ? '#00897B' : '#FF4242');
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
              <div
                className="flag"
                style={{background: statusColor}}>
                {status}
              </div>
            </div>
            <div className="right">
              <div className="flag">{channel}</div>
              <div className="flag">{decoder}</div>
              <div className="flag">{afs / 1000} kHz</div>
            </div>
          </div>
          <div className="controls">
            <button onClick={this.handleBackward}>
              <Feather.SkipBack />
            </button>
            <button onClick={this.handlePlayback}>
              {this.state.playing ? <Feather.Pause /> : <Feather.Play />}
            </button>
            <button onClick={this.handleForward}>
              <Feather.SkipForward />
            </button>
          </div>
          <div className="volume">
            <Feather.Volume1 />
            <input
              value={this.state.volume*100}
              onChange={this.handleVolume}
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
