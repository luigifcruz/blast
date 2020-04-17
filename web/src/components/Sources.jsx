import 'styles/sources';

import * as Feather from 'react-feather';

import React, { Component } from 'react';
import { inject, observer } from 'mobx-react';

import { Codec } from 'components/Radio';
import { ParseFrequency } from 'misc/utils';

@inject('store')
@observer
class Sources extends Component {

  render() {
    const { groupedStations } = this.props.store;
    const sourcesKeys = Object.keys(groupedStations);

    return (
      <div className="block sources">
        <label className="block-label">SOURCES</label>
        <div className="block-body">
          {(sourcesKeys.length == 0) ? (
            <div className="filler">
              <Feather.ArrowUp size={30}/>
              <p>Nothing Here</p>
              <p>Add an address of a source above.</p>
            </div>
          ) : null}
          {sourcesKeys.map((host, i) => {
            const stations = groupedStations[host];
            const source = stations[0];
            const sourceDescription = `${source.device} • ${source.backend}`;

            return (
              <div key={i} className="source">
                <h1>PU2SPY</h1>
                <h2>{sourceDescription}</h2>
                <h3>{source.host}</h3>
                {stations.map((station, i) => {
                  let channel = ((station.channels === 2) ? '2 CH' : 'MONO');
                  let decoder = ((station.codec === Codec.Opus) ? 'OPUS' : 'WAV');
                  let audio_fs = station.audio_fs / 1000 + " kHz";

                  return (
                    <div 
                      key={i}
                      onClick={() => this.props.store.select(station)}
                      className="station">
                        <h1>{ParseFrequency(station.frequency)}</h1>
                        <div className="flag">{channel}</div>
                        <div className="flag">{decoder}</div>
                        <div className="flag">{audio_fs}</div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

}

export default Sources;
