import 'dotenv/config'
import fetch from 'node-fetch'
import { authenticator } from 'otplib'

const API = process.env.API_URL || `http://localhost:${process.env.PORT||4000}`

async function main(){
  const email = process.env.SEED_OWNER_EMAIL || 'owner@btpgo.local'
  const password = process.env.SEED_OWNER_PASSWORD || 'ChangeMe123!'
  // 1) login password
  const login = await fetch(`${API}/auth/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password})}).then(r=>r.json())
  if(!login.token) throw new Error('login failed')
  // 2) setup 2FA
  const setup = await fetch(`${API}/auth/2fa/setup`,{headers:{authorization:`Bearer ${login.token}`}}).then(r=>r.json())
  if(!setup.otpauth) throw new Error('2fa setup failed')
  const url = new URL(setup.otpauth)
  const secret = url.searchParams.get('secret')
  if(!secret) throw new Error('no secret in otpauth')
  const code = authenticator.generate(secret)
  // 3) verify
  const verify = await fetch(`${API}/auth/2fa/verify`,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${login.token}`},body:JSON.stringify({otp:code})}).then(r=>r.json())
  if(!verify.ok) throw new Error('2fa verify failed')
  const backup = (verify.backupCodes||[])[0]
  // 4) new login must require OTP or backup
  const login2 = await fetch(`${API}/auth/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password})})
  if(login2.status===200) throw new Error('expected otp_or_backup_required')
  const login3 = await fetch(`${API}/auth/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password,otp:authenticator.generate(secret)})}).then(r=>r.json())
  if(!login3.token) throw new Error('login with otp failed')
  // 5) login with backup code
  const login4 = await fetch(`${API}/auth/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password,backupCode:backup})}).then(r=>r.json())
  if(!login4.token) throw new Error('login with backup failed')
  console.log('2FA flow OK')
}

main().catch(e=>{ console.error(e); process.exit(1) })

