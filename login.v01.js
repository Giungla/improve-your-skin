'use strict';

const COOKIE_NAME = '__Host-IYS-AuthToken'

const COOKIE_SEPARATOR = '; '

const GENERAL_HIDDEN_CLASS = 'oculto'

/**
 * @type {ScrollIntoViewOptions}
 */
const SCROLL_INTO_VIEW_DEFAULT_ARGS = {
  block: 'center',
  behavior: 'smooth'
}

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
 * @param element {HTMLElement}
 * @param args    {IScrollIntoViewArgs}
 */
function scrollIntoView (element, args) {
  element.scrollIntoView(args)
}

/**
 * @param name    {string}
 * @param value   {string | number | boolean}
 * @param options {ICookieOptions}
 * @returns       {string}
 */
function setCookie (name, value, options = {}) {
  if (typeof name !== 'string' || name.length === 0) {
    throw new Error("'setCookie' should receive a valid cookie name")
  }

  if (!['string', 'number', 'boolean'].includes(typeof value) || value.toString().length === 0) {
    throw new Error("'setCookie' should receive a valid cookie value")
  }

  /** @type {string[]} */
  const cookieOptions = [`${name}=${value}`]

  if (options?.expires && options?.expires instanceof Date) {
    cookieOptions.push(`expires=` + options.expires.toGMTString())
  }

  if (options?.sameSite && typeof options?.sameSite === 'string') {
    cookieOptions.push(`SameSite=${options?.sameSite}`)
  }

  if (options?.path && typeof options.path === 'string') {
    cookieOptions.push(`path=${options?.path}`)
  }

  if (options?.domain && typeof options.domain === 'string') {
    cookieOptions.push(`domain=${options?.path}`)
  }

  if (options?.httpOnly && typeof options.httpOnly === 'boolean') {
    cookieOptions.push(`HttpOnly`)
  }

  if (options?.secure && typeof options.secure === 'boolean') {
    cookieOptions.push('Secure')
  }

  const _buildCookie = cookieOptions.join(COOKIE_SEPARATOR)

  document.cookie = _buildCookie

  return _buildCookie
}

/**
 * @returns {boolean}
 */
function isAuthenticated () {
  const hasAuth = getCookie(COOKIE_NAME)

  return !!hasAuth
}

/**
 * @param payload {ILoginUser}
 * @returns       {Promise<ISignInResponse<ILoginUserPayload>>}
 */
async function loginUser ({ email, password }) {
  try {
    const response = await fetch(`https://xef5-44zo-gegm.b2.xano.io/api:WEfnXROT/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password
      })
    })

    if (!response.ok) {
      const error = await response.text()

      return {
        error: true,
        data: JSON.parse(error)
      }
    }

    /**
     * @type {ILoginUserPayload}
     */
    const data = await response.json()

    return {
      data,
      error: false
    }
  } catch (e) {
    return {
      data: null,
      error: true
    }
  }
}

(function () {

  if (isAuthenticated()) {
    location.href = '/area-do-usuario'

    return
  }

  const userField = querySelector('[data-wtf-user]')
  const passField = querySelector('[data-wtf-password]')

  const userFieldWrapper = querySelector('[data-wtf-user-wrapper]')
  const passFieldWrapper = querySelector('[data-wtf-password-wrapper]')

  const userFieldError = querySelector('[data-wtf-user-error]')
  const passFieldError = querySelector('[data-wtf-password-error]')

  const loginForm = querySelector('[data-wf-user-form-type="login"]')

  const loginSubmitButton = querySelector('[type="submit"]', loginForm)

  const invalidCredentials = querySelector('[data-wtf-authentication-error-message]')
  const generalErrorMessage = querySelector('[data-wtf-general-error-message]')
  const inactiveAccountMessage = querySelector('[data-wtf-confirm-email-error-message]')

  /**
   * @returns {IFieldValidationResponse}
   */
  function validateUserField () {
    const isFieldValid = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(userField.value)

    userFieldWrapper.classList.toggle('mensagemdeerro', !isFieldValid && userField.value.length > 0)
    // userFieldError.classList.toggle(GENERAL_HIDDEN_CLASS, isFieldValid)

    // loginValidity.user = isFieldValid

    // changeSubmitStatus(null)

    return [isFieldValid, 'wtfUser']
  }

  /**
   * @returns {IFieldValidationResponse}
   */
  function validatePassField () {
    const isFieldValid = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/g.test(passField.value)

    passFieldWrapper.classList.toggle('mensagemdeerro', !isFieldValid && passField.value.length > 0)
    // passFieldError.classList.toggle(GENERAL_HIDDEN_CLASS, isFieldValid)

    // loginValidity.pass = isFieldValid

    // changeSubmitStatus(null)

    return [isFieldValid, 'wtfPassword']
  }

  attachEvent(userField, 'blur', validateUserField, false)
  attachEvent(userField, 'input', function () {
    userFieldWrapper.classList.remove('mensagemdeerro')
  }, false)

  attachEvent(passField, 'blur', validatePassField, false)
  attachEvent(passField, 'input', function () {
    passFieldWrapper.classList.remove('mensagemdeerro')
  }, false)

  attachEvent(loginForm, 'submit', async (e) => {
    e.preventDefault()
    e.stopPropagation();

    [invalidCredentials, generalErrorMessage, inactiveAccountMessage].forEach(errorMessage => errorMessage.classList.add(GENERAL_HIDDEN_CLASS))

    let cancelRequest = false

    const validateFields = [
      validateUserField,
      validatePassField
    ]

    for (let index = 0, len = validateFields.length; index < len; index++) {
      const validator = validateFields[index]

      const [ isValid, name ] = validator?.()

      if (!isValid && !cancelRequest) cancelRequest = true
    }

    if (cancelRequest) {
      generalErrorMessage.classList.remove(GENERAL_HIDDEN_CLASS)

      setTimeout(() => {
        scrollIntoView(generalErrorMessage, SCROLL_INTO_VIEW_DEFAULT_ARGS)
      }, 500)

      return
    }

    const response = await loginUser({
      email: userField.value,
      password: passField.value
    })

    if (!response.error) {
      setCookie(COOKIE_NAME, response.data.authToken, {
        path: '/',
        secure: true,
        sameSite: 'Strict',
        expires: new Date(Date.now() + 5_184_000_000)
      })

      location.href = '/area-do-usuario'

      return
    }

    switch (response.data?.payload?.reason) {
      case 'ACCOUNT_NOT_ACTIVE':
        inactiveAccountMessage.classList.remove(GENERAL_HIDDEN_CLASS)
        break
      case 'ACCOUNT_NOT_EXISTS':
        /**
         * TODO
         * Exibir a mensagem de conta não encontrada
         */
        break
      case 'INVALID_CREDENTIALS':
        invalidCredentials.classList.remove(GENERAL_HIDDEN_CLASS)
        break
      default:
        generalErrorMessage.classList.remove(GENERAL_HIDDEN_CLASS)
    }
  })

})()
