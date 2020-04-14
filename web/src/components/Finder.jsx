import 'styles/finder';
import * as Feather from 'react-feather';
import React, { Component } from 'react';
import { inject, observer } from 'mobx-react';

@inject('store')
@observer
class Finder extends Component {

  render() {
    return (
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
    );
  }

}

export default Finder;
