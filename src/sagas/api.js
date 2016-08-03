import { take, fork, put, select, call } from 'redux-saga/effects'
import { delay, takeEvery } from 'redux-saga'
import merge from 'deepmerge'
import { arrayOf, normalize as norm } from 'normalizr'
import qs from 'qs'
import R from 'ramda'
import fetch from './fetch'

const stringify = query => qs.stringify(query, { encode: false })

export const normalize = entityMappings => (response, type) => {
    const { schema } = entityMappings[type]
    if (!schema) {
        return response
    }
    return norm(response, schema)
}

export const normalizeArray = entityMappings => (response, type) => {
    const { schema } = entityMappings[type]
    if (!schema) {
        return response
    }
    return norm(response, arrayOf(schema))
}

export default function getApiSagas(entityMappings) {
    const mappedNormalize = normalize(entityMappings)
    const mappedNormalizeArray = normalizeArray(entityMappings)

    function* fetchUserEntities({ endpoint, ...action }) {
        const userId = yield select(userIdSelector)
        return yield call(fetchEntities, { ...action, endpoint: `users/${userId}/${endpoint}` })
    }

    function* callApi({ endpoint, options }) {
        return yield call(api, endpoint, {}, options)
    }

    return {
        api: function* api(baseUrl, query = {}, apiOptions = {}) {
            const token = yield select(authTokenSelector)
            const { headers, ...options } = apiOptions
            const requestHeaders = headers || { 'Content-Type': 'application/json' }

            const endpoint = `${baseUrl}?${stringify(query)}`

            const defaultOptions = {
                method: 'GET',
                mode: 'cors',
                redirect: 'follow',
                headers: token ? {
                    ...requestHeaders,
                    Authorization: token
                } : requestHeaders
            }

            const requestOptions = merge(defaultOptions, options)

            const result = yield call(fetch, endpoint, requestOptions)

            return result
        },

        fetchEntity: function* fetchEntity({ entityType, endpoint, query = {}, options }) {
            const response = yield call(api, endpoint, query, options)
            yield put({ type: 'FETCHED_ENTITY', entityType, response: mappedNormalize(response, entityType) })
            return response
        },

        fetchEntities: function* fetchEntities({ entityType, endpoint, query = {}, options }) {
            const response = yield call(api, endpoint, query, options)
            yield put({ type: 'FETCHED_ENTITIES', entityType, response: mappedNormalizeArray(response, entityType) })
            return response
        },

        updateEntity: function* updateEntity({ entityType, endpoint, changes, successMessage }) {
            const response = yield call(api, endpoint, {}, { method: 'PUT', body: JSON.stringify(changes) })
            yield put({ type: 'UPDATED_ENTITY', response: mappedNormalize(response, entityType) })
            return response
        },

        customUpdateEntity: function* customUpdateEntity({ entityType, endpoint, options }) {
            const response = yield call(api, endpoint, {}, options)
            yield put({ type: 'UPDATED_ENTITY', response: mappedNormalize(response, entityType) })
            return response
        },

        createEntity: function* createEntity({ entityType, endpoint, entity, options = {} }) {
            const response = yield call(api, endpoint, {}, { method: 'POST', body: JSON.stringify(entity), ...options })
            yield put({ type: 'CREATED_ENTITY', response: mappedNormalize(response, entityType) })
            return response
        },

        deleteEntity: function* deleteEntity({ entityType, endpoint, id }) {
            const response = yield call(api, endpoint, {}, { method: 'DELETE' })
            yield put({ type: 'DELETED_ENTITY', entityType, endpoint, id })
            return response
        }

    }
}

// export default function* apiRoot() {
//     yield [
//         ['FETCH_ENTITY', fetchEntity],
//         ['FETCH_ENTITIES', fetchEntities],
//         ['FETCH_USER_ENTITIES', fetchUserEntities],
//         ['CREATE_ENTITY', createEntity],
//         ['CREATE_USER_ENTITY', createUserEntity],
//         ['AUTH_CREATE_ENTITY', authCreateEntity],
//         ['UPDATE_ENTITY', updateEntity],
//         ['CUSTOM_UPDATE_ENTITY', customUpdateEntity],
//         ['DELETE_ENTITY', deleteEntity],
//         ['CALL_API', callApi],
//         ['CREATE_OR_UPDATE', createOrUpdate],
//         ['CREATE_COMPANY_ENTITY', createCompanyEntity],
//         ['FETCH_COMPANY_ENTITIES', fetchCompanyEntities]
//     ].map(args => forkTryCatch(...args))
// }
//
