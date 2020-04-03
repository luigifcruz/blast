import 'styles/app';

import { withRouter } from 'react-router-dom';
import React, { Component } from 'react';
import { inject, observer } from 'mobx-react';
import * as zmq from 'jszmq';

@withRouter
@inject('store')
@observer
class App extends Component {
  constructor(props) {
    super(props);

    this.store = this.props.store;
  }

  componentDidMount() {
    console.log("Starting ZeroMQ Subscriber...");

    const meta = zmq.socket('req');
    meta.connect('ws://192.168.0.19:5556');
    meta.send('radios');
    meta.on('message', function(payload) {
      var message = new TextDecoder("utf-8").decode(payload);
      console.log(message);
    });

    const blast = zmq.socket('sub');
    blast.connect('ws://192.168.0.19:5555');
    blast.subscribe('radios');
    blast.on('message', function(payload) {
      var message = new TextDecoder("utf-8").decode(payload);
      console.log(message);
    });
  }

  render() {
    return (
      <div className="main-app main-app-dark">
        <div>RADIO</div>
      </div>
    );
  }
}

export default App;
