import { NextApiRequest, NextApiResponse } from 'next'

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const {
    query: { mode, code, configurationId }
  } = req
  const client_id =
    (mode as string).toUpperCase() === 'LIVE'
      ? process.env.STRIPE_CONNECT_CLIENT_ID_LIVE
      : process.env.STRIPE_CONNECT_CLIENT_ID_TEST
  const url = `https://dashboard.stripe.com/oauth/authorize?response_type=code&client_id=${client_id}&scope=read_write&state=${code}--${configurationId}&redirect_uri=${process.env.HOST}`

  res.status(302).redirect(url)
}
