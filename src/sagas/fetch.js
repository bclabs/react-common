import f from 'isomorphic-fetch'

const apiUrl = process.env.API_URL

export default function fetch(endpoint, options) {
    const fullUrl = endpoint.startsWith('http') ? endpoint : apiUrl + endpoint

    return f(fullUrl, options)
        .then(response => {
            if (response.statusText === 'No Content') {
                return {
                    json: 'No Content',
                    response
                }
            }

            return response.json().then(json => ({ json, response }))
        })
        .then(({ json, response }) => {
            if (!response.ok) {
                return Promise.reject(json.error)
            }

            return json
        })
}

