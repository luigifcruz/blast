import 'styles/app';
import 'styles/btn';
import 'styles/volume';
import 'styles/finder';
import 'styles/player';
import 'styles/sources';

import * as Feather from 'react-feather';

import { Codec, Radio } from 'components/Radio';
import React, { Component } from 'react';
import { inject, observer } from 'mobx-react';

import { withRouter } from 'react-router-dom';

function commafy(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

@withRouter
@inject('store')
@observer
class App extends Component {
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
    console.log("Starting ZeroMQ Subscriber...");

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

  render() {
    const { afs, chs, codec, frequency } = this.state.station;
    const { hostname } = this.state;

    let channel = ((chs == 2) ? 'MONO' : 'STEREO');
    let decoder = ((codec == Codec.Opus) ? 'OPUS' : 'WAV');

    return (
      <div className="app main-app-dark">
        <div className="header">
          <h1>CyberRadio</h1>
          <h2>BLAST</h2>
        </div>
        <div className="block player">
          <label className="block-label">PLAYER</label>
          <div className="block-body">
            <div className="information small">
              <div className="flag">PU2SPY</div>
            </div>
            <div className="frequency">
              {commafy(frequency)}
            </div>
            <div className="information">
              <div className="left">
                <div className="flag live">IDLE</div>
              </div>
              <div className="right">
              <div className="flag">{channel}</div>
                <div className="flag">{decoder}</div>
                <div className="flag">{afs/1000} kHz</div>
              </div>
            </div>
            <div className="controls">
              <button><Feather.SkipBack/></button>
              <button onClick={this.togglePlayback}>
                {this.state.playing ? <Feather.Pause/> : <Feather.Play/>}
              </button>
              <button onClick={this.forward}><Feather.SkipForward/></button>
            </div>
            <div className="volume">
              <Feather.Volume1/>
              <input type="range" min="0" max="100"></input>
              <Feather.Volume2/>
            </div>
          </div>
        </div>
        <div className="block finder">
          <label className="block-label">FINDER</label>
          <div className="block-body">
            <div className="search">
              <input className="text-input" type="text"></input>
              <button className="btn btn-gray btn-connect">
                <Feather.Search size={20} />
              </button>
            </div>
            <div className="station-card">
              <div className="name">PU2SPY</div>
              <div className="description">CUDA • 5 WBFM • 14 NFM</div>
              <button className="btn-green">
                <Feather.Plus size={24}/>
              </button>
            </div>
          </div>
        </div>
        <div className="block sources">
          <label className="block-label">SOURCES</label>
          <div className="block-body">
            <div className="source-block">
              <div className="header">
                <div>PU2SPY</div>
                <div>5 WBFM • 1 NFM</div>
              </div>
              <div className="station">
                <div>096,900,000</div>
                <div>MONO</div>
                <div>OPUS</div>
                <div>48 kHz</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default App;
