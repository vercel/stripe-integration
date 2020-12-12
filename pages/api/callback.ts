import { NextApiRequest, NextApiResponse } from 'next'
import {
  getAccessToken,
  getProjects,
  setEnvVars
} from '../../utils/vercel-helpers'
import { getStripe } from '../../utils/init-stripe'

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const {
    body: { code, stripeCode, teamId, mode }
  } = req
  if (!code || !stripeCode) {
    res.status(400).json({ error: 'Missing code or stripeCode.' })
    return
  }

  const livemode = mode === 'live'
  const stripe = getStripe(livemode)
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
    redirectUri: `${
      process.env.HOST?.includes('http')
        ? process.env.HOST
        : 'https://' + process.env.HOST
    }/${mode}`,
    livemode
  })

  const projects = await getProjects({ token, teamId })
  if (projects.length !== 1) {
    console.log('Error: more than one project selected!')
    return res.json({
      projects: []
    })
  }

  // Set Stripe env vars
  await setEnvVars({
    type: 'plain',
    key: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY${livemode ? '_LIVE' : ''}`,
    value: stripe_publishable_key!,
    target: livemode
      ? ['production']
      : ['production', 'preview', 'development'],
    method: 'POST',
    projectId: projects[0].id,
    token,
    teamId
  })
  await setEnvVars({
    type: 'secret',
    key: `STRIPE_SECRET_KEY${livemode ? '_LIVE' : ''}`,
    value: access_token!,
    target: livemode ? ['production'] : ['production', 'preview'],
    method: 'POST',
    projectId: projects[0].id,
    token,
    teamId
  })
  if (!livemode) {
    await setEnvVars({
      type: 'plain', // Set secret as plain for development mode so you can do `vercel env pull`.
      key: 'STRIPE_SECRET_KEY',
      value: access_token!,
      target: ['development'],
      method: 'POST',
      projectId: projects[0].id,
      token,
      teamId
    })
    await setEnvVars({
      type: 'plain',
      key: 'URL',
      value: `https://${projects[0].alias[0].domain}`,
      target: ['production'],
      method: 'POST',
      projectId: projects[0].id,
      token,
      teamId
    })
  }

  res.json({
    token,
    projects,
    stripe: { stripe_user_id }
  })
}
