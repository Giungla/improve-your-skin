(function() {
  'use strict';

  const COOKIE_SEPARATOR = '; '

  window.dataLayer = window.dataLayer || [];

  function gtag (){
    dataLayer.push(arguments)
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

  /** @type {'0' | '1' | false} */
  const iysConsent = getCookie('iys-consent')

  switch (iysConsent) {
    case "0":
      console.warn('[CookieConsent] customer has refused the cookies')

      document.querySelectorAll('#fb-noscript, #linkedin-noscript').forEach(element => {
        element.remove()
      })

      break
    case "1":
      applyGTM()
      applyMetaPixelCode()
      applyLinkedInInsightTag()
      break
    case false:
      querySelector('[data-wtf-consent-module]').classList.remove('oculto')

      attachEvent(querySelector('[data-wtf-consent-module-accept]'), 'click', function (e) {
        e.preventDefault()
        e.stopPropagation()

        applyGTM()
        applyMetaPixelCode()
        applyLinkedInInsightTag()

        setCookie('iys-consent', '1', {
          path: '/',
          secure: true,
          sameSite: 'None',
          expires: new Date(Date.now() + 7_776_000_000)
        })

        querySelector('[data-wtf-consent-module]').classList.add('oculto')
      })

      attachEvent(querySelector('[data-wtf-consent-module-reject]'), 'click', function (e) {
        e.preventDefault()
        e.stopPropagation()

        setCookie('iys-consent', '0', {
          path: '/',
          secure: true,
          sameSite: 'None',
          expires: new Date(Date.now() + 7_776_000_000)
        })

        querySelector('[data-wtf-consent-module]').classList.add('oculto')
      })
  }

  function applyGTM () {
    const script = document.createElement('script')
    script.async = true
    script.src = 'https://www.googletagmanager.com/gtag/js?id=G-86WBTP975T'
    document.head.appendChild(script)

    gtag('js', new Date())
    gtag('config', 'G-86WBTP975T')
  }

  function applyMetaPixelCode () {
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ?
          n.callMethod.apply(n, arguments) : n.queue.push(arguments)
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s)
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

    fbq('init', '1036056828298577');
    fbq('track', 'PageView');
  }

  function applyLinkedInInsightTag () {
    window._linkedin_partner_id = "6183404";
    window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
    window._linkedin_data_partner_ids.push(window._linkedin_partner_id);

    (function(l) {
      if (!l){window.lintrk = function(a,b){window.lintrk.q.push([a,b])};
        window.lintrk.q=[]}
      var s = document.getElementsByTagName("script")[0];
      var b = document.createElement("script");
      b.type = "text/javascript";b.async = true;
      b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
      s.parentNode.insertBefore(b, s);
    })(window.lintrk);
  }
})()
