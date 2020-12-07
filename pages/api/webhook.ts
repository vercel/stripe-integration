import { NextApiRequest, NextApiResponse } from 'next'
import { setEnvVars } from '../../utils/vercel-helpers'
import { stripe } from '../../utils/init-stripe'

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const {
    body: { project, token, teamId, stripeAccount }
  } = req
  if (!project) {
    res.status(400).json({ error: 'Missing project.' })
    return
  }

  const { id, url, api_version, secret } = await stripe.webhookEndpoints.create(
    {
      api_version: '2020-08-27', // TODO: how to keep this up to date?
      description: 'Created by Vercel deploy integration.',
      url: `https://${project.alias[0].domain}/api/webhooks`,
      enabled_events: ['*'] // TODO: implement event selection
    },
    { idempotencyKey: project.id, stripeAccount }
  )

  await setEnvVars({
    type: 'secret',
    key: 'STRIPE_WEBHOOK_SECRET',
    value: secret!,
    target: ['production', 'preview'],
    method: 'POST',
    projectId: project.id,
    token,
    teamId
  })
  await setEnvVars({
    type: 'plain', // Set secret as plain for development mode so you can do `vercel env pull`.
    key: 'STRIPE_WEBHOOK_SECRET',
    value: 'Run `stripe listen` to get secret!',
    target: ['development'],
    method: 'POST',
    projectId: project.id,
    token,
    teamId
  })

  res.json({ webhook: { id, url, api_version } })
}
