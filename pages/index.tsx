import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { fetchPostJSON } from '../utils/api-helpers'

export default function IndexPage() {
  const [stripeState, setStripeState] = useState('')
  const [stripeCode, setStripeCode] = useState('')
  const [stripeAccount, setStripeAccount] = useState('')
  const [stripeWebhookSet, setStripeWebhookSet] = useState(false)
  const [code, setCode] = useState('')
  const [token, setToken] = useState('')
  const [teamId, setTeamId] = useState('')
  const [configurationId, setConfigurationId] = useState('')
  const [next, setNext] = useState('')

  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams(window.location.search)
    let code = params.get('code') || ''
    let configurationId = params.get('configurationId')
    const next = params.get('next')
    const teamId = params.get('teamId') || ''
    const stripeState = params.get('state') || ''

    if (stripeState) {
      setStripeCode(code)
      const splittedState = stripeState.split('--')
      code = splittedState[0]
      configurationId = splittedState[1]
    }

    if (!(code && configurationId)) {
      throw new Error('Missing required integration URL params')
    }
    console.debug('useEffect found', { code, configurationId, next })
    setLoading(false)
    setConfigurationId(configurationId)
    setNext(
      next ??
        `https://vercel.com/dashboard/integrations/${configurationId}/installed`
    )
    setCode(code)
    setTeamId(teamId)
    setStripeState(stripeState)
  }, [])

  useEffect(() => {
    if (!stripeState) return
    if (!stripeCode) return
    if (!code) return
    if (token) return
    setLoading(true)
    const getAccessToken = async () => {
      const params = {
        configurationId,
        code,
        stripeCode,
        teamId
      }
      const { token, projects, stripe } = await fetchPostJSON(
        `/api/callback`,
        params
      )
      console.debug('callback', { token, projects, stripe })
      setToken(token)
      setProjects(projects)
      setStripeAccount(stripe.stripe_user_id)
      setLoading(false)
    }
    getAccessToken()
  }, [code])

  const createWebhookEndpoint = async () => {
    setLoading(true)
    await fetchPostJSON('/api/webhook', {
      project: projects[0],
      token,
      teamId,
      stripeAccount
    })
    setStripeWebhookSet(true)
    setLoading(false)
  }

  return (
    <Layout>
      <div className="page-container">
        <h1>Connect Stripe to Vercel</h1>
        <button
          disabled={loading || !!stripeAccount}
          onClick={() => {
            window.location.href = `/api/connect/test?code=${code}&configurationId=${configurationId}`
          }}
        >
          {loading
            ? 'Loading...'
            : stripeAccount
            ? 'Connected ✔'
            : 'Connect to Stripe'}
        </button>
        {stripeAccount ? (
          <>
            <button
              disabled={loading || stripeWebhookSet}
              onClick={createWebhookEndpoint}
            >
              {loading
                ? 'Loading...'
                : stripeWebhookSet
                ? 'Webhook endpoint created ✔'
                : 'Set up webhooks'}
            </button>
            <button
              disabled={loading}
              onClick={() => {
                window.location.href = next
              }}
            >
              {`Back to Vercel →`}
            </button>
          </>
        ) : (
          ''
        )}
      </div>
    </Layout>
  )
}
