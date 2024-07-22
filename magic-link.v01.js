'use strict';

const COOKIE_NAME = '__Host-IYS-AuthToken'

const COOKIE_SEPARATOR = '; '

const GENERAL_HIDDEN_CLASS = 'oculto'

/**
 * @param node      {HTMLElement | Document}
 * @param eventName {string}
 * @param callback  {EventListener | EventListenerObject}
 * @param options=  {boolean | AddEventListenerOptions}
 * @returns         {function (): void}
 */
function attachEvent (node, eventName, callback, options) {
  node.addEventListener(eventName, callback, options)

  return () => node.removeEventListener(eventName, callback, options)
}

/**
 * @param selector {keyof HTMLElementTagNameMap | string}
 * @param node     {HTMLElement | Document} - optional
 * @returns        {HTMLElementTagNameMap[keyof HTMLElementTagNameMap] | null}
 */
function querySelector (selector, node = document) {
  return node.querySelector(selector)
}

/**
 * @param name {string}
 * @returns    {string | false}
 */
function getCookie (name) {
  const selectedCookie = document.cookie
    .split(COOKIE_SEPARATOR)
    .find(cookie => {
      const { name: cookieName } = splitCookie(cookie)

      return cookieName === name
    })

  return selectedCookie
    ? splitCookie(selectedCookie).value
    : false
}

/**
 * @param cookie {string}
 * @returns      {ISplitCookieObject}
 */
function splitCookie (cookie) {
  const [name, value] = cookie.split('=')

  return {
    name,
    value
  }
}

/**
 * @returns {boolean}
 */
function isAuthenticated () {
  const hasAuth = getCookie(COOKIE_NAME)

  return !!hasAuth
}

/**
 *
 * @param magic_token {string}
 * @returns           {Promise<ISignInResponse<null>>}
 */
async function validateMagicLink (magic_token) {
  try {
    const response = await fetch(`https://xef5-44zo-gegm.b2.xano.io/api:uYKdI0zx/auth/magic-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ magic_token })
    })

    if (!response.ok) {
      const error = await response.json()

      return {
        error: true,
        data: error
      }
    }

    const token = await response.json()

    return {
      error: false,
      data: token
    }
  } catch (e) {
    return {
      data: e,
      error: true
    }
  }
}



(function () {
  console.log('in')

  const urlSearch = new URLSearchParams(location.search)

  /**
   * @type {string | null}
   */
  const magicToken = urlSearch.get('token')

  if (!magicToken) {
    return
  }

  validateMagicLink(magicToken)
    .then(authToken => {
      console.log(authToken)
    }).catch(error => {
      console.log(error)
    })

})()
