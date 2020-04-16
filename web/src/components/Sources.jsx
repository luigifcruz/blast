import 'styles/sources';

import * as Feather from 'react-feather';

import React, { Component } from 'react';
import { inject, observer } from 'mobx-react';

@inject('store')
@observer
class Sources extends Component {

  render() {
    const { groupedStations, select } = this.props.store;
    const sourcesKeys = Object.keys(groupedStations);

    return (
      <div className="block sources">
        <label className="block-label">SOURCES</label>
        <div className="block-body">
          {sourcesKeys.map((host, i) => {
            const stations = groupedStations[host];
            return (
              <div key={i} className="source-block">
                <div className="header">
                  <div>PU2SPY</div>
                  <div>{stations.length + " STATIONS"}</div>
                </div>
                {stations.map((station, i) => {
                  return (
                    <div 
                      key={i}
                      onClick={() => this.props.store.select(station)}
                      className="station">
                        <div>{station.frequency}</div>
                        <div>MONO</div>
                        <div>OPUS</div>
                        <div>48 kHz</div>
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
