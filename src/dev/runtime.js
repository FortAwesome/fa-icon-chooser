function handleQuery(query) {
  return new Promise((resolve, reject) => {
    fetch( 'https://api.fontawesome.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query })
      },
    )
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
  el.addEventListener('onResult', handleResult)

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
        Object.keys(obj.head).map(elementType => {
          const el = document.createElement(elementType)
          Object.keys(obj.head[elementType]).map(attr => {
            el.setAttribute(attr, obj.head[elementType][attr])
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

function showIconChooser() {
  const defaultProps = { version: '5.15.3', enablePro: false }

  fetch('/dev/local.json')
  .then(result => {
    if(result.status == 200) {
      result.json().then(obj => {
        const props = Object.assign({}, obj)
        delete(props['head'])

        addIconChooser(Object.assign({}, defaultProps, props))
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
