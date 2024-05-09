const { loadEnvConfig } = require('@next/env')
const projectDir = process.cwd()
loadEnvConfig(projectDir)

const { BASE_URL, PROTOCOL, OPENAI_API_KEY } = process.env
const PORT = 9002
console.log("BASE_URL:", BASE_URL)
console.log("PROTOCOL:", PROTOCOL)
console.log("OPENAI_API_KEY:", OPENAI_API_KEY)
console.log("ListenPORT:", PORT)

module.exports = {
  apps: [{
    name: 'ChatGPT-Next-Web',
    script: 'npm',
    args: 'start',
    env: {
      BASE_URL: BASE_URL,
      PROTOCOL: PROTOCOL,
      OPENAI_API_KEY: OPENAI_API_KEY,
      PORT: PORT
    },
  }],
};
