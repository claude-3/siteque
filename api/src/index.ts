import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

type Bindings = {
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  GEMINI_API_KEY: string
}

type Variables = {
  user: any
}

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

app.use('/*', cors())

app.get('/', (c) => {
  return c.text('SiteCue API is running.')
})

// Auth Middleware
app.use('/*', async (c, next) => {
  if (c.req.path === '/') return next() // allow health check

  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Missing Authorization header' }, 401)

  const token = authHeader.replace('Bearer ', '')
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return c.json({ error: 'Invalid or expired token' }, 401)
  }

  c.set('user', user)
  await next()
})

app.get('/notes', async (c) => {
  const url = c.req.query('url')
  const user = c.get('user')

  // Re-create client with token to ensure RLS (should be same as above)
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: c.req.header('Authorization')! } },
  })

  let query = supabase
    .from('sitecue_notes')
    .select('*')
  // No need to filter by user_id manually if RLS policies are set to auth.uid() = user_id
  // But for clarity and explicit behavior we can keep it or rely on RLS.
  // relying on RLS is safer. Let's rely on RLS, but Supabase SDK might not auto-filter unless we imply it.
  // Actually, "select *" sends "select * from notes" to PG. PG RLS filters rows.
  // So we just select *.
  // However, to match previous logic (filter by url), we keep that.

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
    const user = c.get('user')
    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: c.req.header('Authorization')! } },
    })

    const { data, error } = await supabase
      .from('sitecue_notes')
      .insert({
        user_id: user.id, // Explicitly setting user_id might count as "user input", but RLS checks auth.uid() matches.
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

// ---------------------------------------------------------
// 📝 メモの更新 (UPDATE)
// ---------------------------------------------------------
app.put('/notes', async (c) => {
  try {
    const { id, content } = await c.req.json()

    // IDがないと更新できないので弾く
    if (!id) {
      return c.json({ error: 'Note ID is required' }, 400)
    }

    // 既存のGET/POSTと同じようにクライアントを作成 (RLSを有効にするため)
    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: c.req.header('Authorization')! } },
    })

    // 更新実行
    // .select() を付けることで、更新後のデータを取得できます
    const { data, error } = await supabase
      .from('sitecue_notes')
      .update({ content })
      .eq('id', id)
      .select()

    if (error) return c.json({ error: error.message }, 500)

    // 更新対象が見つからなかった場合 (他人のメモIDを指定した場合など)
    if (!data || data.length === 0) {
      return c.json({ error: 'Note not found or permission denied' }, 404)
    }

    return c.json(data[0])
  } catch (err) {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }
})

// ---------------------------------------------------------
// 🧠 AI Weave (Gemini)
// ---------------------------------------------------------
app.post('/ai/weave', async (c) => {
  try {
    const body = await c.req.json()
    const contexts: { url: string; content: string }[] = body.contexts
    const prompt: string = body.prompt

    if (!Array.isArray(contexts) || typeof prompt !== 'string') {
      return c.json({ error: 'Invalid request body' }, 400)
    }

    // 各URLからHTMLをフェッチ
    const fetchedContexts = await Promise.all(
      contexts.map(async (ctx) => {
        try {
          const res = await fetch(ctx.url)
          if (!res.ok) {
            return `URL: ${ctx.url}\nNote: ${ctx.content}\nContent: [Failed to fetch content: ${res.status}]`
          }
          const html = await res.text()
          return `URL: ${ctx.url}\nNote: ${ctx.content}\nContent:\n${html}`
        } catch (error) {
          return `URL: ${ctx.url}\nNote: ${ctx.content}\nContent: [Failed to fetch content]`
        }
      })
    )

    const fullPrompt = `You are a helpful AI assistant that synthesizes information from various web pages based on user notes and prompts.
Here are the contexts (Web page URL, user's note, and the page HTML content):

${fetchedContexts.join('\n\n---\n\n')}

User Prompt:
${prompt}

Please respond in Markdown format.`

    const genAI = new GoogleGenerativeAI(c.env.GEMINI_API_KEY)
    // 利用可能な最新Flashモデルを指定
    const model = genAI.getGenerativeModel({ model: 'gemini-3.0-flash' })

    const result = await model.generateContent(fullPrompt)
    const response = await result.response
    const text = response.text()

    return c.json({ result: text })
  } catch (err: any) {
    console.error('AI Weave Error:', err)
    return c.json({ error: err.message || 'Internal Server Error' }, 500)
  }
})

export default app
