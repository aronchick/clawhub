import { httpRouter } from 'convex/server'
import { auth } from './auth'
import { downloadZip } from './downloads'
import {
  cliPublishHttp,
  cliUploadUrlHttp,
  cliWhoamiHttp,
  getSkillHttp,
  searchSkillsHttp,
} from './httpApi'

const http = httpRouter()

auth.addHttpRoutes(http)

http.route({
  path: '/api/download',
  method: 'GET',
  handler: downloadZip,
})

http.route({
  path: '/api/search',
  method: 'GET',
  handler: searchSkillsHttp,
})

http.route({
  path: '/api/skill',
  method: 'GET',
  handler: getSkillHttp,
})

http.route({
  path: '/api/cli/whoami',
  method: 'GET',
  handler: cliWhoamiHttp,
})

http.route({
  path: '/api/cli/upload-url',
  method: 'POST',
  handler: cliUploadUrlHttp,
})

http.route({
  path: '/api/cli/publish',
  method: 'POST',
  handler: cliPublishHttp,
})

export default http
