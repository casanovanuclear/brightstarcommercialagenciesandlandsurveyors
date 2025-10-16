async function login(){
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const res = await fetch('/api/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username, password }) });
  if(res.ok) window.location.href = '/admin/admin.html';
  else document.getElementById('err').innerText = 'Invalid credentials' , document.getElementById('err').style.display = 'block';
}
