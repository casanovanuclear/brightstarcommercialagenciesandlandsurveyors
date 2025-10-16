async function sendReset(e){
  e.preventDefault();
  const email = document.getElementById('email').value;
  const res = await fetch('/api/request-reset',{method:'POST',headers:{'Content-Type':'application/json'},body: JSON.stringify({ email })});
  const data = await res.json();
  document.getElementById('msg').innerText = data.message || data.error;
}

async function resetPass(e){
  e.preventDefault();
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const password = document.getElementById('password').value;
  const res = await fetch('/api/reset-password',{method:'POST',headers:{'Content-Type':'application/json'},body: JSON.stringify({ token, newPassword: password })});
  const data = await res.json();
  document.getElementById('msg').innerText = data.message || data.error;
  if(res.ok) setTimeout(()=>location.href='/admin/login.html',1200);
}
