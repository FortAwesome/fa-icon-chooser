import './App.css';
import { FaIconChooser } from '@fortawesome/fa-icon-chooser-react'
import { handleQuery, getLocalConfig } from './devRuntime'
import React, { useState } from 'react'

function App() {
  const [showingChooser, showChooser] = useState(false)
  const [lastResult, setResult] =  useState(undefined)

  const handleResult = ({ detail: result }) => {
    setResult(result)
    showChooser(false)
  }

  return (
    <div className="App">
      <header className="App-header">
        {
          !showingChooser &&
          <div>
            <button onClick={() => showChooser(!showingChooser)}>Choose An Icon</button>
          </div>
        }
        { !!lastResult &&
          <div>
            Last result: <pre style={ {color: 'black'} }>{ JSON.stringify(lastResult) }</pre>
          </div>
        }
        {
          showingChooser &&
          <FaIconChooser kitToken={ getLocalConfig().props['kit-token'] } handleQuery={ handleQuery } onFinish={ handleResult } />
        }
      </header>
    </div>
  );
}

export default App;
