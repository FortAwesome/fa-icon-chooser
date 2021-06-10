function handleQuery(query) {
  return new Promise((resolve, reject) => {
    const headers = {
      'Content-Type': 'application/json'
    }

    getAccessToken()
    .then(token => {

      if(token) {
        headers['Authorization'] = `Bearer ${ token }`
      }

      return fetch( 'https://api.fontawesome.com', {
          method: 'POST',
          headers,
          body: JSON.stringify({ query })
        },
      )
    })
    .then(response => {
      if(response.ok) {
        response.json()
        .then(json => resolve(json))
        .catch(e => reject(e))
      } else {
        reject('bad query')
      }
    })
    .catch(e => reject(e))
  })
}

function handleResult(result) {
  const resultElement = document.querySelector("#result")
  const preElement = document.createElement('pre')
  const text = document.createTextNode(JSON.stringify(result.detail))
  preElement.appendChild(text)
  resultElement.appendChild(preElement)
}

function clearResult() {
  document.querySelectorAll("#result pre").forEach(child => child.remove())
}

function addIconChooser(props) {
  const container = document.querySelector('#fa-icon-chooser-container')
  const el = document.createElement('fa-icon-chooser')
  el.handleQuery = handleQuery
  el.addEventListener('finish', handleResult)

  Object.keys(props).map(prop => {
    el.setAttribute(prop, props[prop])
  })

  container.appendChild(el)
}

function closeIconChooser() {
  document.querySelector('fa-icon-chooser').remove()
}

function setupHead() {
  fetch('/dev/local.json')
  .then(result => {
    if(result.status == 200) {
      result.json().then(obj => {
        const { head } = obj

        if(!head) {
          throw new Error('DEV: your local.json is missing a top-level head key')
        }

        Object.keys(head).map(elementType => {
          const el = document.createElement(elementType)
          Object.keys(head[elementType]).map(attr => {
            el.setAttribute(attr, head[elementType][attr])
          })
          document.head.appendChild(el)
        })
      })
      .catch(e => console.error(e))
    }
  })
  .catch(e => console.error(e))
}

function toggleIconChooser() {
  if(window.showingIconChooser) {
    closeIconChooser()
    clearResult()
    window.showingIconChooser = false
  } else {
    showIconChooser()
    window.showingIconChooser = true
  }
}

function getAccessToken(apiToken) {
  const tokenJSON = window.localStorage.getItem('token')
  const tokenObj = tokenJSON ? JSON.parse(tokenJSON) : undefined

  if(tokenObj) {
    if(Math.floor(Date.now() / 1000) <= tokenObj.expiresAtEpochSeconds) {
      return Promise.resolve(tokenObj.token)
    } else {
      return Promise.reject('DEV: your Font Awesome API access token has expired. Refresh the page.')
    }
  } else {
    if(!apiToken) {
      // No access token has been stored, and we have no apiToken to get a fresh one,
      // so there's no error here--but no token either.
      return Promise.resolve(undefined)
    }
  }

  if(!apiToken) {
    return Promise.reject('DEV: cannot refresh access token because no apiToken was provided')
  }

  return fetch('https://api.fontawesome.com/token', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${ apiToken }`
    }
  })
  .then(response => {
    if(response.ok) {
      response.json()
      .then(obj => {
        const expiresAtEpochSeconds = Math.floor(Date.now() / 1000) + obj['expires_in']

        // WARNING: storing an access token in localStorage may not be good enough
        // security in other situations. This is a development-only situation
        // intended to run on a local development machine, so this seems like
        // good enough security for that use case.
        window.localStorage.setItem(
          'token',
          JSON.stringify({
            token: obj['access_token'],
            expiresAtEpochSeconds
          })
        )
      })
      .catch(e => {
        throw e
      })
    } else {
      const msg = 'DEV: unexpected token endpoint response'
      console.error(msg, response)
      throw new Error(msg)
    }
  })
  .catch(e => {
    throw e
  })
}

function showIconChooser() {
  fetch('/dev/local.json')
  .then(result => {
    if(result.status == 200) {
      result.json().then(obj => {
        const { props, apiToken } = obj

        if(!props['kit-token']) {
          if(!props.version) {
            throw new Error('DEV: your local.json must have a props key with either a version subkey or a kit-token subkey')
          }
          addIconChooser(props)
        }

        // We've got a kit token, so we need to resolve an API token into access token.
        // We'll store the access token in localStorage. That's not the most secure
        // thing to do, but this is only a development environment scenario here.

        if(!apiToken) {
          throw new Error('DEV: you specified a kit-token in the props of your local.json but not the required accompanying top-level apiToken key.')
        }

        getAccessToken(props.apiToken)
        .then(_token => {
          addIconChooser(props)
        })
        .catch(e => {
          throw e
        })
      })
      .catch(e => console.error(e))
    } else {
      addIconChooser(defaultProps)
    }
  })
  .catch(e => console.error(e))
}

setupHead()

window.showingIconChooser = false
