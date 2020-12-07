const stringifyPrimitive = (v: any) => {
  switch (typeof v) {
    case 'string':
      return v

    case 'boolean':
      return v ? 'true' : 'false'

    case 'number':
      return isFinite(v) ? v : ''

    default:
      return ''
  }
}

const stringify = (obj: any, sep: string = '&', eq: string = '=') => {
  return Object.keys(obj)
    .map(function (k) {
      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq
      if (Array.isArray(obj[k])) {
        return obj[k]
          .map(function (v: string) {
            return ks + encodeURIComponent(stringifyPrimitive(v))
          })
          .join(sep)
      } else {
        return ks + encodeURIComponent(stringifyPrimitive(obj[k]))
      }
    })
    .filter(Boolean)
    .join(sep)
}

const getAccessToken = async ({
  code,
  redirectUri
}: {
  code: string
  redirectUri: string
}) => {
  const res = await fetch('https://api.vercel.com/v2/oauth/access_token', {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    method: 'POST',
    body: stringify({
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      code,
      redirect_uri: redirectUri
    })
  }).then((res) => res.json())
  if (!res.access_token)
    new Error(res.error_description ?? 'Internal server error')
  return res.access_token
}

const getProjects = async ({
  token,
  teamId
}: {
  token: string
  teamId: string
}) => {
  const query = stringify({ teamId })
  const res = await fetch(`https://api.vercel.com/v6/projects?${query}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  }).then((res) => res.json())

  if (!res.projects) new Error(res.error_description ?? 'Internal server error')
  return res.projects
}

const setEnvVars = async ({
  envId = null,
  key,
  method,
  projectId,
  target,
  teamId,
  token,
  type,
  value
}: {
  envId?: string | null
  key: string
  method: string
  projectId: string
  target: string[]
  teamId: string
  token: string
  type: string
  value: string
}) => {
  const url =
    method === 'POST'
      ? `https://api.vercel.com/v6/projects/${projectId}/env?teamId=${teamId}`
      : method === 'PATCH'
      ? `https://api.vercel.com/v6/projects/${projectId}/env/${envId}?teamId=${teamId}`
      : `https://api.vercel.com/v4/projects/${projectId}/env/${key}?target=${target}&teamId=${teamId}`

  console.log('set-env', {
    envId,
    key,
    method,
    projectId,
    target,
    token,
    type,
    url,
    value
  })

  if (type === 'secret') {
    const res = await fetch(`https://api.vercel.com/v2/now/secrets`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: `${key}-${projectId}`,
        value
      })
    }).then((res) => res.json())
    console.log(`Created secret: ${res.uid}`)
    if (!res.uid) new Error(res.error_description ?? 'Internal server error')
    value = res.uid
  }

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      key,
      value,
      type,
      target
    })
  }).then((res) => res.json())

  console.log(res)
  return res
}

export { getAccessToken, getProjects, setEnvVars }
