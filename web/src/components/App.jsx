import 'styles/app';
import 'styles/btn';
import 'styles/volume';
import 'styles/adder';
import 'styles/player';
//import 'styles/sources';

import * as zmq from 'jszmq';

import { Decoder, RadioWorker } from 'components/Radio';
import React, { Component } from 'react';
import { inject, observer } from 'mobx-react';

import { withRouter } from 'react-router-dom';
import { Play, SkipBack, SkipForward, Plus, Search, Volume1, Volume2 } from 'react-feather';

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
      radioWorker: null,
      selectedRadio: null,
      sources: [{
        host: "ws://192.168.0.19:5555", 
        stations: [{
          frequency: 96900000,
          ofs: 1920,
          afs: 48000,
          chs: 2,
        }]
      }],
      config: {
        receiver: {
          host: "ws://192.168.0.19:5555",
          frequency: "96900000",
        },
        decoder: {
          type: Decoder.Opus,
          volume: 0.95,
          ofs: 1920,
          afs: 48000,
          chs: 2,
        },
      }
    }
  }

  componentDidMount() {
    console.log("Starting ZeroMQ Subscriber...");

    const meta = zmq.socket('req');
    meta.connect('ws://192.168.0.19:5556');
    meta.send('radios');
    meta.on('message', (payload) => {
      payload = new TextDecoder("utf-8").decode(payload);
      this.setState({
        radios: JSON.parse(payload)
      });
    });

    new RadioWorker().then((radioWorker) => {
      this.setState({ radioWorker });
    });
  }

  tuneRadio = () => {
    if (this.state.radioWorker) {
      console.log("[APP] Tuning Radio...")
      this.state.radioWorker.tune(this.state.config);
    }
  }

  render() {
    const { afs, chs, type, volume } = this.state.config.decoder;
    const { frequency, host} = this.state.config.receiver;

    let channel = ((chs == 2) ? 'MONO' : 'STEREO');
    let decoder = ((type == Decoder.Opus) ? 'OPUS' : 'WAV');

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
              <button><SkipBack/></button>
              <button><Play/></button>
              <button><SkipForward/></button>
            </div>
            <div className="volume">
              <Volume1/>
              <input type="range" min="0" max="100"></input>
              <Volume2/>
            </div>
          </div>
        </div>
        <div className="block adder">
          <label className="block-label">ADD SOURCE</label>
          <div className="block-body">
            <div className="receiver">
              <input className="text-input" type="text"></input>
              <button className="btn btn-gray btn-connect" onClick={this.tuneRadio}>
                <Search size={20} />
              </button>
            </div>
            <div className="station-card">
              <div className="">PU2SPY</div>
              <div className="">CUDA • 5 WBFM • 14 NFM</div>
              <button><Plus/>Add</button>
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
