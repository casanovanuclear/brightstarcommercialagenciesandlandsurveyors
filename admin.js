const socket = io();
const form = document.getElementById('unitForm');
const unitList = document.getElementById('unitList');
let editingId = null;

function render(units){
  unitList.innerHTML = '';
  units.forEach(u => {
    const div = document.createElement('div');
    div.className = 'unit';
    div.innerHTML = `<div><strong>${u.title}</strong> — ${u.location} | ${u.size} | Ksh ${u.price.toLocaleString()} | <b>${u.status}</b></div>
      <div>
        <button onclick="startEdit(${u.id})">Edit</button>
        <button onclick="deleteUnit(${u.id})">Delete</button>
      </div>`;
    unitList.appendChild(div);
  });
}

async function fetchUnits(){
  const res = await fetch('/api/units');
  const data = await res.json();
  render(data);
}

socket.on('unitsUpdated', render);
fetchUnits();

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    id: editingId,
    title: form.title.value,
    location: form.location.value,
    size: form.size.value,
    price: Number(form.price.value),
    status: form.status.value,
    image: form.image.value
  };
  const endpoint = editingId ? '/api/edit' : '/api/add';
  await fetch(endpoint, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
  form.reset(); editingId = null;
});

window.startEdit = function(id){
  fetch('/api/units').then(r=>r.json()).then(units => {
    const u = units.find(x => x.id === id);
    if(!u) return;
    editingId = u.id;
    form.unitId.value = u.id;
    form.title.value = u.title;
    form.location.value = u.location;
    form.size.value = u.size;
    form.price.value = u.price;
    form.status.value = u.status;
    form.image.value = u.image;
  });
}

window.deleteUnit = async function(id){
  if(!confirm('Delete this unit?')) return;
  await fetch('/api/delete', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id }) });
}

document.getElementById('logoutBtn').addEventListener('click', async ()=>{
  await fetch('/api/logout');
  window.location.href = '/admin/login.html';
});
