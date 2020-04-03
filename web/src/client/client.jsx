import React, { Component } from 'react';

import App from 'components/App';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'mobx-react';
import Store from 'stores/Store';

let store = (window.store = new Store());

export default class Client extends Component {
  render() {
    return (
      <Provider store={store}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </Provider>
    );
  }
}
