import 'styles/sources';
import * as Feather from 'react-feather';
import React, { Component } from 'react';
import { inject, observer } from 'mobx-react';

@inject('store')
@observer
class Sources extends Component {

  render() {
    return (
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
    );
  }

}

export default Sources;
