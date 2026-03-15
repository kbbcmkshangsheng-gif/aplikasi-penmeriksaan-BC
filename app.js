let dataBarang = JSON.parse(localStorage.getItem('dataBarang')) || [];

function simpanData() {
  localStorage.setItem('dataBarang', JSON.stringify(dataBarang));
}

function renderTabel() {
  const tbody = document.getElementById('bodyTabel');
  tbody.innerHTML = '';
  dataBarang.forEach((item, i) => {
    tbody.innerHTML += `
      <tr>
        <td>${i + 1}</td>
        <td>${item.noPemeriksaan}</td>
        <td>${item.tanggal}</td>
        <td>${item.namaBarang}</td>
        <td>${item.jumlah}</td>
        <td>${item.satuan}</td>
        <td class="kondisi-${item.kondisi}">${item.kondisi}</td>
        <td>${item.keterangan}</td>
        <td><button class="btn-hapus" onclick="hapus(${i})">🗑 Hapus</button></td>
      </tr>`;
  });
}

document.getElementById('formBarang').addEventListener('submit', function (e) {
  e.preventDefault();
  const item = {
    noPemeriksaan: document.getElementById('noPemeriksaan').value,
    tanggal: document.getElementById('tanggal').value,
    namaBarang: document.getElementById('namaBarang').value,
    jumlah: document.getElementById('jumlah').value,
    satuan: document.getElementById('satuan').value,
    kondisi: document.getElementById('kondisi').value,
    keterangan: document.getElementById('keterangan').value,
  };
  dataBarang.push(item);
  simpanData();
  renderTabel();
  this.reset();
});

function hapus(index) {
  if (confirm('Hapus data ini?')) {
    dataBarang.splice(index, 1);
    simpanData();
    renderTabel();
  }
}

function exportCSV() {
  if (dataBarang.length === 0) return alert('Tidak ada data!');
  const header = ['No','No Pemeriksaan','Tanggal','Nama Barang','Jumlah','Satuan','Kondisi','Keterangan'];
  const rows = dataBarang.map((d, i) => [i+1, d.noPemeriksaan, d.tanggal, d.namaBarang, d.jumlah, d.satuan, d.kondisi, d.keterangan]);
  const csv = [header, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'data_pemeriksaan_bc.csv';
  a.click();
}

renderTabel();