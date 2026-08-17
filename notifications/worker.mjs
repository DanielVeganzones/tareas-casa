import webpush from 'web-push'

const MADRID_TIME_ZONE = 'Europe/Madrid'

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
    Vary: 'Origin',
  }
}

function json(data, env, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(env),
      'Content-Type': 'application/json; charset=utf-8',
    },
  })
}

function getMadridDateParts(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: MADRID_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)

  return Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  )
}

function addDays(dateKey, days) {
  const date = new Date(`${dateKey}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function supabaseHeaders(env) {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  }
}

async function supabaseRequest(env, path, options = {}) {
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      ...supabaseHeaders(env),
      ...options.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`Supabase respondió ${response.status}.`)
  }

  return response.status === 204 ? null : response.json()
}

async function getAuthenticatedUser(request, env) {
  const authorization = request.headers.get('Authorization')

  if (!authorization?.startsWith('Bearer ')) {
    return null
  }

  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: authorization,
    },
  })

  return response.ok ? response.json() : null
}

async function assertHouseholdMember(env, householdId, userId) {
  const members = await supabaseRequest(
    env,
    `household_members?select=user_id&household_id=eq.${encodeURIComponent(
      householdId,
    )}&user_id=eq.${encodeURIComponent(userId)}&limit=1`,
  )

  return members.length > 0
}

function configureWebPush(env) {
  webpush.setVapidDetails(
    env.VAPID_SUBJECT,
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY,
  )
}

async function removeSubscription(env, endpoint) {
  await supabaseRequest(
    env,
    `push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`,
    { method: 'DELETE' },
  )
}

async function sendPush(env, subscription, notification) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(notification))
  } catch (error) {
    if (error.statusCode === 404 || error.statusCode === 410) {
      await removeSubscription(env, subscription.endpoint)
      return
    }

    throw error
  }
}

async function getHouseholdSubscriptions(env, householdId, excludedUserId) {
  const userFilter = excludedUserId
    ? `&user_id=neq.${encodeURIComponent(excludedUserId)}`
    : ''

  return supabaseRequest(
    env,
    `push_subscriptions?select=endpoint,p256dh,auth&household_id=eq.${encodeURIComponent(
      householdId,
    )}${userFilter}`,
  )
}

async function notifyHousehold(env, householdId, notification, excludedUserId) {
  const subscriptions = await getHouseholdSubscriptions(
    env,
    householdId,
    excludedUserId,
  )

  await Promise.all(
    subscriptions.map((subscription) =>
      sendPush(
        env,
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        notification,
      ),
    ),
  )
}

function formatTaskList(tasks) {
  if (tasks.length === 1) {
    return tasks[0].name
  }

  const visibleTasks = tasks.slice(0, 3).map((task) => task.name)
  const suffix = tasks.length > visibleTasks.length ? '…' : ''
  return `${visibleTasks.join(', ')}${suffix}`
}

async function sendScheduledSummary(env, dateKey, kind) {
  configureWebPush(env)

  const tasks = await supabaseRequest(
    env,
    `tasks?select=household_id,name&active=eq.true&next_due_date=eq.${dateKey}`,
  )
  const tasksByHousehold = new Map()

  tasks.forEach((task) => {
    const householdTasks = tasksByHousehold.get(task.household_id) ?? []
    householdTasks.push(task)
    tasksByHousehold.set(task.household_id, householdTasks)
  })

  const label = kind === 'today' ? 'hoy' : 'mañana'

  await Promise.all(
    Array.from(tasksByHousehold.entries()).map(([householdId, householdTasks]) =>
      notifyHousehold(env, householdId, {
        title: `Tareas para ${label}`,
        body: `${householdTasks.length} ${
          householdTasks.length === 1 ? 'tarea' : 'tareas'
        }: ${formatTaskList(householdTasks)}`,
        tag: `tasks-${kind}-${dateKey}`,
      }),
    ),
  )
}

async function handleSubscribe(request, env) {
  const user = await getAuthenticatedUser(request, env)
  const { householdId, subscription } = await request.json()

  if (!user || !(await assertHouseholdMember(env, householdId, user.id))) {
    return json({ error: 'No autorizado.' }, env, 401)
  }

  if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    return json({ error: 'Suscripción no válida.' }, env, 400)
  }

  await supabaseRequest(env, 'push_subscriptions?on_conflict=endpoint', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      household_id: householdId,
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      updated_at: new Date().toISOString(),
    }),
  })

  return json({ ok: true }, env)
}

async function handlePendingTask(request, env) {
  const user = await getAuthenticatedUser(request, env)
  const { householdId, taskName } = await request.json()

  if (!user || !(await assertHouseholdMember(env, householdId, user.id))) {
    return json({ error: 'No autorizado.' }, env, 401)
  }

  if (!taskName?.trim()) {
    return json({ error: 'Tarea no válida.' }, env, 400)
  }

  configureWebPush(env)
  await notifyHousehold(
    env,
    householdId,
    {
      title: 'Nueva tarea pendiente para hoy',
      body: taskName.trim(),
      tag: `pending-${crypto.randomUUID()}`,
    },
    user.id,
  )

  return json({ ok: true }, env)
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(env) })
    }

    if (request.method === 'POST' && new URL(request.url).pathname === '/subscriptions') {
      return handleSubscribe(request, env)
    }

    if (
      request.method === 'POST' &&
      new URL(request.url).pathname === '/notifications/pending'
    ) {
      return handlePendingTask(request, env)
    }

    return json({ error: 'No encontrado.' }, env, 404)
  },

  async scheduled(controller, env, ctx) {
    const madridNow = getMadridDateParts(new Date(controller.scheduledTime))
    const dateKey = `${madridNow.year}-${madridNow.month}-${madridNow.day}`

    if (madridNow.hour === '09') {
      ctx.waitUntil(sendScheduledSummary(env, dateKey, 'today'))
    }

    if (madridNow.hour === '22') {
      ctx.waitUntil(sendScheduledSummary(env, addDays(dateKey, 1), 'tomorrow'))
    }
  },
}
