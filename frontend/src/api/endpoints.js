import api from './axios'

export const assetAPI = {
  getAll:  (params) => api.get('/assets', { params }),
  getById: (id)     => api.get(`/assets/${id}`),
  create:  (data)   => api.post('/assets', data),
  update:  (id, d)  => api.put(`/assets/${id}`, d),
  delete:  (id)     => api.delete(`/assets/${id}`),
}

export const categoryAPI = {
  getAll: (params) => api.get('/categories', { params }),
}