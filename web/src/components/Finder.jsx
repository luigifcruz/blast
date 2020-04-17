import 'styles/finder';

import * as Feather from 'react-feather';

import React, { Component } from 'react';
import { inject, observer } from 'mobx-react';

@inject('store')
@observer
class Finder extends Component {

  constructor(props) {
    super(props);
    this.store = this.props.store;
    this.state = {
      source: null,
      host: "",
    };
  }

  handleSearch = () => {
    let url = this.state.host;
    
    if (!/^https?:\/\//i.test(url)) {
      url = 'http://' + url;
    }

    this.setState({ host: url });

    this.store
      .hostPreflight(url)
      .then((request) => {
        this.setState({
          source: request.body
        });
      })
      .catch((err) => {
        this.setState({
          source: null
        });
      });
  }

  handleAddHost = () => {
    if (this.state.host !== "") {
      this.store.addHost(this.state.host);
      this.setState({ source: null, host: "" });
    }
  }

  handleHost = (event) => {
    this.setState({
      host: event.target.value
    });
  }

  handleKeyPress = (event) => {
    if (event.key === "Enter") {
      this.handleSearch();
    }
  }

  render() {
    const { source, host } = this.state;

    return (
      <div className="block finder">
        <label className="block-label">FINDER</label>
        <div className="block-body">
          <div className="search">
            <input
              value={host}
              onKeyPress={this.handleKeyPress}
              onChange={this.handleHost}
              className="text-input"
              type="text"/>
            <button
              onClick={this.handleSearch}
              className="btn btn-gray btn-connect">
              <Feather.Search size={20} />
            </button>
          </div>
          {(source !== null) ? (
            <div className="source-card">
              <h1>{source.name}</h1>
              <h2>{`${source.device} • ${source.backend} • ${source.stations.length} STATIONS`}</h2>
              <h3>{host}</h3>
              <button onClick={this.handleAddHost} className="btn-green">
                <Feather.Plus size={24}/>
              </button>
            </div>
          ) : null }
        </div>
      </div>
    );
  }

}

export default Finder;
