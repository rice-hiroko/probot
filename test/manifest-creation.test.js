const { ManifestCreation } = require('../src/manifest-creation')
const nock = require('nock')
const package = require('../package.json')
const response = require('./fixtures/setup/response.json')

describe('ManifestCreation', () => {
  let setup
  let SmeeClient

  beforeEach(() => {
    setup = new ManifestCreation()
  })

  describe('createWebhookChannel', () => {
    beforeEach(() => {
      delete process.env.NODE_ENV
      delete process.env.PROJECT_DOMAIN
      delete process.env.WEBHOOK_PROXY_URL

      setup.updateEnv = jest.fn()

      const SmeeClient = require('smee-client')
      SmeeClient.createChannel = jest.fn().mockReturnValue('https://smee.io/1234abc')
    })

    afterEach(() => {
      delete process.env.WEBHOOK_PROXY_URL
    })

    test('writes new webhook channel to .env', async () => {
      await setup.createWebhookChannel()
      expect(setup.updateEnv).toHaveBeenCalledWith({"WEBHOOK_PROXY_URL": "https://smee.io/1234abc"})
    })
  })

  describe('pkg', () => {
    test('gets pkg from package.json', () => {
      expect(setup.pkg).toEqual(package)
    })
  })

  describe('createAppUrl', () => {
    afterEach(() => {
      delete process.env.GHE_HOST
    })

    test('creates an app url', () => {
      expect(setup.createAppUrl).toEqual('https://github.com/settings/apps/new')
    })

    test('creates an app url when github host env is set', () => {
      process.env.GHE_HOST = 'hiimbex.github.com'
      expect(setup.createAppUrl).toEqual('https://hiimbex.github.com/settings/apps/new')
    })
  })

  describe('createAppFromCode', () => {
    beforeEach(() => {
      setup.updateEnv = jest.fn()
    })

    afterEach(() => {
      delete process.env.APP_ID
      delete process.env.PRIVATE_KEY
      delete process.env.WEBHOOK_SECRET
    })

    test('creates an app from a code', async () => {
      nock('https://api.github.com')
        .post('/app-manifests/123abc/conversions')
        .reply(200, response)

      const createdApp = await setup.createAppFromCode('123abc')
      expect(createdApp).toEqual('https://github.com/apps/testerino0000000')
      // expect dotenv to be called with id, webhook_secret, pem
      expect(setup.updateEnv).toHaveBeenCalledWith({"APP_ID": "6666", "PRIVATE_KEY": '"-----BEGIN RSA PRIVATE KEY-----\nsecrets\n-----END RSA PRIVATE KEY-----\n"', "WEBHOOK_SECRET": "12345abcde"})
    })
  })

  describe('getManifest', () => {
    test('creates an app from a code', () => {
      // checks that getManifest returns a JSON.stringified manifest
      expect(setup.getManifest(package, 'localhost://3000')).toEqual('{"description":"🤖 A framework for building GitHub Apps to automate and improve your workflow","hook_attributes":{"url":"localhost://3000/"},"name":"probot","public":true,"redirect_url":"localhost://3000/probot/setup","url":"https://probot.github.io","version":"v1"}')
    })
  })
})
