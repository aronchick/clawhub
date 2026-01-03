import { httpRouter } from 'convex/server'
import { auth } from './auth'
import { downloadZip } from './downloads'

const http = httpRouter()

auth.addHttpRoutes(http)

http.route({
  path: '/api/download',
  method: 'GET',
  handler: downloadZip,
})

export default http
