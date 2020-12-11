import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import { fetchPostJSON } from '../utils/api-helpers'

export default function IndexPage() {
  const router = useRouter()
  const { mode } = router.query

  const [stripeState, setStripeState] = useState('')
  const [stripeCode, setStripeCode] = useState('')
  const [stripeAccount, setStripeAccount] = useState('')
  const [stripeWebhook, setStripeWebhook] = useState({ id: '', url: '' })
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
    if (!mode) return
    if (token) return
    setLoading(true)
    const getAccessToken = async () => {
      const params = {
        configurationId,
        code,
        stripeCode,
        teamId,
        mode
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
  }, [code, mode])

  const createWebhookEndpoint = async () => {
    setLoading(true)
    const {
      webhook: { id, url }
    } = await fetchPostJSON('/api/webhook', {
      project: projects[0],
      token,
      teamId,
      stripeAccount,
      mode
    })
    setStripeWebhook({ id, url })
    setLoading(false)
  }

  return (
    <Layout>
      <div className="page-container">
        <h1>Connect Stripe to Vercel</h1>
        <button
          disabled={loading || !!stripeAccount}
          onClick={() => {
            window.location.href = `/api/connect/${
              mode === 'live' ? 'live' : 'test'
            }?code=${code}&configurationId=${configurationId}`
          }}
        >
          {loading
            ? 'Loading...'
            : stripeAccount
            ? 'Connected ✔'
            : 'Connect to Stripe'}
        </button>
        {stripeAccount && (
          <a
            href="https://dashboard.stripe.com"
            rel="noopener noreferrer"
            target="_blank"
          >
            {`Open Stripe Dashboard →`}
          </a>
        )}
        {stripeAccount && (
          <>
            <button
              disabled={loading || !!stripeWebhook.id}
              onClick={createWebhookEndpoint}
            >
              {loading
                ? 'Loading...'
                : stripeWebhook.id
                ? 'Webhook endpoint created ✔'
                : 'Set up webhooks'}
            </button>
            {stripeWebhook.id && (
              <a
                href={`https://dashboard.stripe.com/test/webhooks/${stripeWebhook.id}`}
                rel="noopener noreferrer"
                target="_blank"
              >
                {`Manage in Stripe Dashboard →`}
              </a>
            )}
            <button
              disabled={loading}
              onClick={() => {
                window.location.href = next
              }}
            >
              {`Back to Vercel →`}
            </button>
          </>
        )}
      </div>
    </Layout>
  )
}
