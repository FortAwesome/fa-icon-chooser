const FaIconChooserDevExports = (function () {
  let showingIconChooser = false
  let localConfig = undefined
  const localDevMissingMsg = 'DEV: your local dev config in local.json is required but has not yet been loaded.'

  function handleQuery(query) {
    return new Promise((resolve, reject) => {
      const headers = {
        'Content-Type': 'application/json'
      }

      getAccessToken()
      .then(token => {

        if(token) {
          headers['Authorization'] = `Bearer ${ token }`
          console.log('handleQuery: using fresh access token to issue authorized request')
        } else {
          console.log('handleQuery: no access token found -- sending an unauthorized request')
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
    if(!localConfig) throw new Error(localDevMissingMsg)
    if(!localConfig.head) throw new Error('DEV: missing head key in your local.json')

    const { head } = localConfig

    Object.keys(head).map(elementType => {
      const el = document.createElement(elementType)
      Object.keys(head[elementType]).map(attr => {
        el.setAttribute(attr, head[elementType][attr])
      })
      document.head.appendChild(el)
    })
  }

  function toggleIconChooser() {
    if(showingIconChooser) {
      closeIconChooser()
      clearResult()
      showingIconChooser = false
    } else {
      showIconChooser()
      showingIconChooser = true
    }
  }

  function loadLocalConfig() {
    const failMsg = 'DEV: failed request to get local.json:'

    return fetch('/dev/local.json')
    .then(response => {
      if(response.ok){
        return response.json()
      } else {
        return Promise.reject(response)
      }
    })
    .then(config => {
      localConfig = config
    })
    .catch(e => {
      console.error(failMsg, e)
      return Promise.reject(failMsg)
    })
  }

  function getAccessToken() {
    const apiToken = localConfig && localConfig.apiToken
    if(!apiToken) {
      // If there's no apiToken, then it's not an error to resolve an undefined access token.
      return Promise.resolve(undefined)
    }
    const tokenJSON = window.localStorage.getItem('token')
    const tokenObj = tokenJSON ? JSON.parse(tokenJSON) : undefined
    const freshToken = (tokenObj && Math.floor(Date.now() / 1000) <= tokenObj.expiresAtEpochSeconds)
      ? tokenObj.token
      : undefined

    if(freshToken) return Promise.resolve(freshToken)

    return fetch('https://api.fontawesome.com/token', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${ localConfig.apiToken }`
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
    if(!localConfig) throw new Error(localDevMissingMsg)
    if(!localConfig.props) throw new Error('DEV: missing props key in your local.json')

    const { props } = localConfig

    if(!props['kit-token']) {
      if(!props.version) {
        throw new Error('DEV: your local.json must have a props key with either a version subkey or a kit-token subkey')
      }
      addIconChooser(props)
      return
    }

    getAccessToken()
    .then(_token => addIconChooser(props))
    .catch(e => {
      throw e
    })
  }

  function getLocalConfig() {
    return localConfig
  }

  loadLocalConfig()
  //.then(setupHead)
  .catch(e => {
    throw e
  })

  document.addEventListener('DOMContentLoaded', function() {
    const toggle = document.querySelector('#fa-icon-chooser-toggle')

    if(toggle) {
      toggle.addEventListener('click', toggleIconChooser)
    }
  })

  return {
    toggleIconChooser,
    handleQuery,
    handleResult,
    getLocalConfig
  }
})()

if('undefined' !== typeof module) {
  module.exports = FaIconChooserDevExports
}
