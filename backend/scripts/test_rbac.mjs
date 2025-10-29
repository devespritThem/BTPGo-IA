import 'dotenv/config'
import fetch from 'node-fetch'

const API = process.env.API_URL || `http://localhost:${process.env.PORT||4000}`

async function main(){
  const ownerEmail = 'owner@btpgo.local'
  const ownerPass = 'ChangeMe123!'
  const owner = await fetch(`${API}/auth/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:ownerEmail,password:ownerPass})}).then(r=>r.json())
  if(!owner.token) throw new Error('owner login failed')
  const me = await fetch(`${API}/me`,{headers:{authorization:`Bearer ${owner.token}`}}).then(r=>r.json())
  // Extract orgId by creating a marché then listing
  await fetch(`${API}/marches`,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${owner.token}`},body:JSON.stringify({title:'RBAC Test'})})
  const list = await fetch(`${API}/marches`,{headers:{authorization:`Bearer ${owner.token}`}}).then(r=>r.json())
  const orgId = list.data?.[0]?.orgId
  if(!orgId) throw new Error('cannot derive orgId')
  // Create a member user
  const memberEmail = `member+${Date.now()}@btpgo.local`
  await fetch(`${API}/org/members`,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${owner.token}`,'x-org-id':orgId},body:JSON.stringify({email:memberEmail,role:'member'})})
  const member = await fetch(`${API}/auth/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:memberEmail,password:'ChangeMe123!'})}).then(r=>r.json())
  if(!member.token) throw new Error('member login failed')
  // Member should NOT be able to create marches (manager+)
  const r1 = await fetch(`${API}/marches`,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${member.token}`,'x-org-id':orgId},body:JSON.stringify({title:'X'})})
  if(r1.status!==403) throw new Error('member should be forbidden to create marches')
  // Promote to manager and try again
  await fetch(`${API}/org/members/${me.user.id}`,{method:'PATCH',headers:{'content-type':'application/json',authorization:`Bearer ${owner.token}`,'x-org-id':orgId},body:JSON.stringify({role:'manager'})})
  const r2 = await fetch(`${API}/marches`,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${member.token}`,'x-org-id':orgId},body:JSON.stringify({title:'Y'})})
  if(r2.status!==201) throw new Error('manager should create marches')
  console.log('RBAC flow OK')
}

main().catch(e=>{ console.error(e); process.exit(1) })

