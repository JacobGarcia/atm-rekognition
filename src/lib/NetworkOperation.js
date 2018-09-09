import axios from 'axios'

const baseUrl = 'http://localhost:8080/v1'
let token = null

function getToken() {
  token = localStorage.getItem('token')
  return token
}

// Request interceptors
axios.interceptors.request.use(
  (config) => {
    // Add token
    config.headers.Authorization = `Bearer ${token || getToken()}`
    // Do something before request is sent
    return config
  },
  (error) => Promise.reject(error)
)

class NetworkOperation {
  static sendVerficationCode(telephone) {
    return axios.post(`${baseUrl}/users/sms/verifcation/send`, {
      telephone,
    })
  }

  static authorize(telephone, code) {
    return axios.post(`${baseUrl}/users/sms/verifcation/authorize`, {
      telephone,
      code,
    })
  }

  static getSelf() {
    return axios.get(`${baseUrl}/users/self`)
  }
}

export default NetworkOperation
