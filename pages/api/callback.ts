import { NextApiRequest, NextApiResponse } from 'next'
import {
  getAccessToken,
  getProjects,
  setEnvVars
} from '../../utils/vercel-helpers'
import { stripe } from '../../utils/init-stripe'

const targets = ['production', 'preview', 'development']

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const {
    body: { code, stripeCode, teamId }
  } = req
  if (!code || !stripeCode) {
    res.status(400).json({ error: 'Missing code or stripeCode.' })
    return
  }

  const {
    stripe_publishable_key,
    access_token,
    stripe_user_id
  } = await stripe.oauth.token({
    grant_type: 'authorization_code',
    code: stripeCode
  })

  const token = await getAccessToken({
    code: code as string,
    redirectUri: `${process.env.HOST}/`
  })

  const projects = await getProjects({ token, teamId })

  // Set Stripe env vars
  await setEnvVars({
    type: 'plain',
    key: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    value: stripe_publishable_key!,
    target: targets,
    method: 'POST',
    projectId: projects[0].id,
    token,
    teamId
  })
  await setEnvVars({
    type: 'plain', // TODO make secret
    key: 'STRIPE_SECRET_KEY',
    value: access_token!,
    target: targets,
    method: 'POST',
    projectId: projects[0].id,
    token,
    teamId
  })

  res.json({
    token,
    projects,
    stripe: { stripe_user_id }
  })
}
