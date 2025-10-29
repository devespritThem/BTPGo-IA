import 'dotenv/config'

const API = process.env.API_URL || `http://localhost:${process.env.PORT||4000}`

async function main(){
  const health = await fetch(`${API}/health`).then(r=>r.json())
  console.log('health', health)
  const email = process.env.SEED_OWNER_EMAIL || 'owner@btpgo.local'
  const password = process.env.SEED_OWNER_PASSWORD || 'ChangeMe123!'
  const login = await fetch(`${API}/auth/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password})}).then(r=>r.json())
  console.log('login', Object.keys(login))
  if(!login.token){ throw new Error('no token from login') }
  const me = await fetch(`${API}/me`,{headers:{authorization:`Bearer ${login.token}`}}).then(r=>r.json())
  console.log('me', me.user?.email)
}

main().catch(e=>{ console.error(e); process.exit(1) })
