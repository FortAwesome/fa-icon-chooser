import './App.css';
import { FaIconChooser } from '@fortawesome/fa-icon-chooser-react'
import { handleQuery, getLocalConfig, getUrlText } from './devRuntime'
import React, { useState } from 'react'
import Jed from '@tannin/compat';

/*
In this example, we'll use slots to override a some of the default English
language UI messages in the start view with strings that could be prepared
for translation into other languages using a library like Tannin.
*/
const i18n = new Jed( {
    locale_data: {
        my_app_text_domain: {
            '': {
                domain: 'my_app_text_domain',
                lang: 'en',
                plural_forms: 'nplurals=2; plural=(n != 1);',
            },
        },
    },
    domain: 'my_app_text_domain',
} );

const startViewHeading = i18n.translate("Font Awesome is the web's most popular icon set, with tons of icons in a variety of styles.").fetch();
const startViewDetail = i18n.translate("Not sure where to start? Here are some favorites, or try a search for spinners, animals, food, or whatever you're looking for.").fetch();

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
            Last result: <pre style={ {color: 'black', backgroundColor: 'white'} }>{ JSON.stringify(lastResult) }</pre>
          </div>
        }
        {
          showingChooser &&
          <FaIconChooser
            version={ getLocalConfig().props['version'] }
            kitToken={ getLocalConfig().props['kit-token'] }
            handleQuery={ handleQuery }
            getUrlText={ getUrlText }
            onFinish={ handleResult }>
              <span slot="start-view-heading">
                { startViewHeading }
              </span>
              <span slot="start-view-detail">
                { startViewDetail }
              </span>
          </FaIconChooser>
        }
      </header>
    </div>
  );
}

export default App;
