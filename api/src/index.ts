import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createClient } from '@supabase/supabase-js'

const TEST_USER_ID = '7fa763c8-54a0-4ecc-b1c5-9795abcf9bf1'

type Bindings = {
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/*', cors())

app.get('/', (c) => {
  return c.text('SiteCue API is running.')
})

app.get('/notes', async (c) => {
  const url = c.req.query('url')
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

  let query = supabase
    .from('sitecue_notes')
    .select('*')
    .eq('user_id', TEST_USER_ID)

  if (url) {
    query = query.eq('url_pattern', url)
  }

  const { data, error } = await query

  if (error) return c.json({ error: error.message }, 500)
  return c.json(data)
})

app.post('/notes', async (c) => {
  try {
    const { url_pattern, content } = await c.req.json()
    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)

    const { data, error } = await supabase
      .from('sitecue_notes')
      .insert({
        user_id: TEST_USER_ID,
        url_pattern,
        content,
      })
      .select()

    if (error) return c.json({ error: error.message }, 500)
    return c.json(data[0], 201)
  } catch (err) {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }
})

export default app
