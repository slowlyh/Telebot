/**
 * Copyright © 2025 [ slowlyh ]
 *
 * All rights reserved. This source code is the property of [ ChatGPT ].
 * Unauthorized copying, distribution, modification, or use of this file,
 * via any medium, is strictly prohibited without prior written permission.
 *
 * This software is protected under international copyright laws.
 *
 * Contact: [ hyuuoffc@gmail.com ]
 * GitHub: https://github.com/slowlyh
 * Official: https://hyuu.tech
 */
import axios from 'axios'

function createClient(baseURL) {
  const instance = axios.create({ baseURL, validateStatus: () => true })
  return instance
}
function makeClient(instance) {
  const safeCall =
    (fn) =>
    async (...args) => {
      try {
        return await fn(...args)
      } catch (e) {
        return e && e.response
      }
    }
  return {
    get: safeCall((path, params, options) => instance.get(path, { params, ...options })),
    post: safeCall((path, data, options) => instance.post(path, data, options)),
    request: safeCall((options) => instance.request({ ...options })),
  }
}
export const Velyn = makeClient(createClient('https://velyn.mom'))
export const Neko = makeClient(createClient('https://api.nekolabs.my.id'))

const APIRequest = { Velyn, Neko }

export default APIRequest
